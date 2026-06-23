# SeaamAI — Conversational RAG Chatbot API

A production-ready AI chatbot backend that lets users upload PDF documents and have intelligent, context-aware conversations about them. Built with **LangChain**, **OpenAI GPT-4o-mini**, **ChromaDB**, and **FastAPI**, the system implements a full Retrieval-Augmented Generation (RAG) pipeline with persistent chat history and per-user isolated vector stores.

---

## Table of Contents

- [Overview](#overview)
- [Core AI Architecture](#core-ai-architecture)
  - [RAG Pipeline](#rag-pipeline)
  - [Memory & Context Management](#memory--context-management)
  - [Document Ingestion Pipeline](#document-ingestion-pipeline)
  - [Contextual Compression Retrieval](#contextual-compression-retrieval)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [How It Works — End to End](#how-it-works--end-to-end)

---

## Overview

SeaamAI is a multi-user AI assistant that:

- Accepts PDF uploads and indexes them into a per-user **ChromaDB** vector store
- Answers questions grounded in the uploaded documents using a **RAG** chain
- Maintains **full conversation history** across turns, using it to reformulate follow-up questions into standalone queries
- Compresses retrieved document chunks with an **LLM-based extractor** to keep only the most relevant content before passing it to the generator
- Auto-generates a **chat title** from the first AI response using a separate LangChain runnable
- Persists all conversations to **MongoDB** and handles user auth with JWT + bcrypt

---

## Core AI Architecture

All LangChain logic lives in [utils.py](utils.py). The central class is `seemAiChatHandler`, which is instantiated per request, wired to the user's ChromaDB collection, and orchestrates the full LangChain pipeline.

### RAG Pipeline

The system implements a **three-stage LangChain RAG chain** using LangChain Expression Language (LCEL):

```
User Query
    │
    ▼
┌─────────────────────────────────────────┐
│  History-Aware Retriever                │
│  • Reformulates query using chat history│
│  • Creates standalone question          │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Contextual Compression Retriever       │
│  • Fetches top-k chunks from ChromaDB   │
│  • LLMChainExtractor filters irrelevant │
│    content from each chunk              │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Stuff Documents Chain (Generator)      │
│  • Combines compressed chunks as context│
│  • GPT-4o-mini generates final answer   │
└────────────────┬────────────────────────┘
                 │
                 ▼
             AI Response
```

The chain is assembled in `__init__` using three LangChain factory functions:

```python
# Stage 1: make retriever history-aware
self.history_aware_retriever = create_history_aware_retriever(
    self.llm, self.compression_retriever, self.contextualize_q_prompt
)

# Stage 2: build generator that stuffs docs into context
self.question_answer_chain = create_stuff_documents_chain(
    self.llm, self.qa_prompt, document_variable_name="context"
)

# Stage 3: wire retriever → generator into a full RAG chain
self.rag_chain = create_retrieval_chain(
    self.history_aware_retriever, self.question_answer_chain
)
```

### Memory & Context Management

LangChain's `RunnableWithMessageHistory` wraps the RAG chain to give it automatic memory injection. Each user session gets its own `ChatMessageHistory` instance stored in a `history_store` dict keyed by `user_id`:

```python
def get_session_history(self, session_id: str) -> ChatMessageHistory:
    if session_id not in self.history_store:
        self.history_store[session_id] = ChatMessageHistory()
    return self.history_store[session_id]

def get_answer(self, query):
    conversational_rag_chain = RunnableWithMessageHistory(
        self.rag_chain,
        lambda sid: self.get_session_history(sid),
        input_messages_key="input",
        history_messages_key="chat_history",
        output_messages_key="answer"
    )
    response = conversational_rag_chain.invoke(
        {"input": query},
        config={"session_id": self.user_id}
    )["answer"]
    return response
```

`RunnableWithMessageHistory` automatically:
1. Loads the session's prior messages before each invoke
2. Passes them as `chat_history` to the history-aware retriever prompt
3. Appends the new human/AI message pair to the store after each invoke

The **contextualization prompt** tells the LLM to rewrite follow-up questions as standalone queries before retrieval, so retrieval quality is not degraded by pronouns or references to prior turns:

```
"Given a chat history and the latest user question which might reference
context in the chat history, formulate a standalone question which can be
understood without the chat history. Do NOT answer the question, just
reformulate it if needed and otherwise return it as is."
```

After the chain runs, the full in-memory message history is serialized and pushed to MongoDB using `$push` with `$each`, so conversation state survives process restarts.

### Document Ingestion Pipeline

When a user uploads PDFs, the `add_to_vector()` function runs the following pipeline:

```
PDF files (uploaded to Users/<user_id>/temp/)
    │
    ▼
DirectoryLoader + PDFPlumberLoader      ← LangChain document loader
    │  Loads all PDFs from the temp dir
    ▼
RecursiveCharacterTextSplitter          ← LangChain text splitter
    │  chunk_size=512, chunk_overlap=100
    │  Overlap ensures no context is lost at chunk boundaries
    ▼
OpenAIEmbeddings                        ← text-embedding-ada-002
    │  Converts each chunk into a dense vector
    ▼
Chroma vector store                     ← persisted to vector_db/<user_id>/
    │  Each user has an isolated collection
    ▼
Ready for retrieval
```

```python
def add_to_vector(user_id):
    loader = DirectoryLoader(path, glob="**/*.pdf", loader_cls=PDFPlumberLoader)
    docs = loader.load()
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=100)
    splits = text_splitter.split_documents(docs)
    vector_store.add_documents(documents=splits, embedding=OpenAIEmbeddings())
```

`RecursiveCharacterTextSplitter` recursively splits on `\n\n`, `\n`, ` `, `` in order, preserving semantic boundaries as much as possible. The 100-token overlap means adjacent chunks share content, preventing mid-sentence retrieval gaps.

### Contextual Compression Retrieval

Standard vector search retrieves full chunks, many of which may contain only partially relevant content. SeaamAI uses `ContextualCompressionRetriever` with `LLMChainExtractor` as a post-retrieval filter:

```python
self.compressor = LLMChainExtractor.from_llm(OpenAI(temperature=0))
self.compression_retriever = ContextualCompressionRetriever(
    base_compressor=self.compressor,
    base_retriever=self.vector_store.as_retriever()
)
```

After the base retriever returns top-k chunks, `LLMChainExtractor` passes each chunk + the user query to an LLM and extracts only the sentences/fragments directly relevant to the question. This results in a much tighter context window passed to the generator, reducing hallucination and improving answer precision.

### Auto Chat Title Generation

When a new chat is created, the first AI response is passed through a separate LCEL chain using the `|` pipe operator to auto-generate a 5-8 word title:

```python
self.prompt_topic_generation = ChatPromptTemplate.from_messages([
    ("system", "Generate a concise and relevant title in exactly 5-8 words..."),
    ("human", "{text}"),
])
self.runnable_summary = self.prompt_topic_generation | self.llm1

def get_summary(self, text):
    return self.runnable_summary.invoke({"text": text}).content
```

This is a minimal LCEL pipeline: the prompt template is piped directly into the ChatOpenAI model, and `.content` extracts the string from the `AIMessage` response.

---

## Tech Stack

| Layer | Technology |
|---|---|
| API Framework | FastAPI + Uvicorn |
| LLM Orchestration | LangChain (LCEL, chains, memory, retrievers) |
| Language Model | OpenAI GPT-4o-mini (chat), GPT-4 (legacy), text-embedding-ada-002 |
| Vector Database | ChromaDB (local, per-user persistent collections) |
| Document Parsing | pdfplumber via LangChain's PDFPlumberLoader |
| Application Database | MongoDB with Motor (async driver) |
| Authentication | JWT (PyJWT) + bcrypt password hashing |
| Email / OTP | fastapi-mail with SMTP |
| Config Management | pydantic-settings + python-dotenv |

---

## Project Structure

```
SeaamAI/
├── main.py                  # FastAPI app, middleware, router registration
├── config.py                # Pydantic settings loaded from .env
├── database.py              # MongoDB async client (Motor)
├── schemas.py               # Pydantic request/response models
├── utils.py                 # All LangChain logic: RAG chain, memory, embeddings
├── requirements.txt
├── routers/
│   ├── auth.py              # Signup, login, JWT, OTP password reset
│   ├── chats.py             # Chat endpoints — invokes seemAiChatHandler
│   ├── documents.py         # PDF upload → add_to_vector pipeline
│   └── profile.py           # Avatar upload, profile updates
├── services/                # Reserved for service layer extraction
├── Users/                   # Uploaded PDFs stored per user
│   └── <user_id>/
│       └── <chat_id>/       # PDFs associated with each chat
├── vector_db/               # ChromaDB persistent storage per user
│   └── <user_id>/
│       └── chroma.sqlite3
└── Avatar/                  # User profile pictures
```

---

## API Endpoints

### Authentication — `/auth`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup` | Register new user (bcrypt-hashed password) |
| POST | `/auth/login` | Login, returns signed JWT (24h expiry) |
| POST | `/auth/validate-token` | Verify JWT and return decoded payload |
| POST | `/auth/forget-password` | Send 6-digit OTP to email (5 min TTL) |
| POST | `/auth/reset-password` | Verify OTP and update password |

### Documents — `/documents`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/documents/upload` | Upload PDFs → chunk → embed → store in ChromaDB |
| POST | `/documents/list` | List all documents for a user |
| POST | `/documents/delete` | Delete document record and file |

### Chat — `/chat`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/chat/get-response` | Send a message, get RAG-powered AI response |
| POST | `/chat/get-chat` | Retrieve full conversation history |
| POST | `/chat/list` | List all chat sessions for a user |
| POST | `/chat/delete` | Delete a chat session |

### Profile — `/profile`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/profile/update` | Update name, email, or avatar image |
| POST | `/profile/avatar` | Serve user avatar as image file |

---

## Setup & Installation

**Requirements:** Python 3.10+, MongoDB running locally, OpenAI API key

```bash
# Clone the repository
git clone <repo-url>
cd SeaamAI

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Fill in your values (see Environment Variables below)

# Start MongoDB (if not already running)
mongod --dbpath /data/db

# Run the API server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Application
SECRET_KEY=your_jwt_secret_key_here

# MongoDB
MONGO_URI=mongodb://localhost:27017

# OpenAI
OPENAI_API_KEY=sk-...

# Email (SMTP — for OTP password reset)
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=your_email@gmail.com
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
USE_CREDENTIALS=True
```

---

## How It Works — End to End

**1. User signs up** → bcrypt-hashed password stored in MongoDB. Empty `Users/<id>/` and `vector_db/<id>/` directories created.

**2. User uploads a PDF** → `POST /documents/upload`
- File saved to `Users/<user_id>/temp/`
- `add_to_vector(user_id)` runs the LangChain ingestion pipeline
- PDF parsed with `PDFPlumberLoader`, split into 512-char chunks with 100-char overlap
- Each chunk embedded with `OpenAIEmbeddings` (text-embedding-ada-002)
- Embeddings + text stored in the user's ChromaDB collection at `vector_db/<user_id>/`

**3. User sends a message** → `POST /chat/get-response`
- `seemAiChatHandler(user_id=...)` is instantiated, loading the user's ChromaDB collection
- If `chat_id == "null"` (new chat): the full RAG + memory chain runs, a chat title is generated from the response, and a new MongoDB document is created
- If `chat_id` exists: the existing chat is retrieved and the response is appended
- The in-memory `ChatMessageHistory` is serialized and pushed to MongoDB for persistence

**4. Context management across turns**
- `RunnableWithMessageHistory` injects prior turns as `chat_history` on every invocation
- The history-aware retriever uses this history to reformulate vague follow-ups into precise standalone queries before hitting ChromaDB
- This means questions like "Can you explain that further?" correctly retrieve the right documents

**5. Retrieval quality**
- `ContextualCompressionRetriever` first fetches top-k raw chunks from ChromaDB
- `LLMChainExtractor` then distills each chunk, keeping only the sentences directly relevant to the current question
- The compressed content is injected as `{context}` into the QA prompt for final answer generation
