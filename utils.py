from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from typing import Literal

from langchain_openai import ChatOpenAI

from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI, OpenAI
from langchain_community.document_loaders import DirectoryLoader, PDFPlumberLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor
from dotenv import load_dotenv
import os
# from chat_bot import get_answer_chat
load_dotenv()

# Load OpenAI API key
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

def add_to_vector(user_id, chat_id):
    path = f'Users/{user_id}/{chat_id}/temp'
    path1 = f'vector_db/{user_id}/{chat_id}'
    vector_store = Chroma(
    embedding_function=OpenAIEmbeddings(),
    persist_directory=path1,  # Where to save data locally, remove if not necessary
    )

# Specify the directory path containing the PDF files
    

    # Create a DirectoryLoader and set PDFPlumberLoader as the loader class
    loader = DirectoryLoader(path, glob="**/*.pdf", loader_cls=PDFPlumberLoader)

    # Load all PDF documents in the directory
    docs = loader.load()
    # Print the first 100 characters of the first document
    # Import necessary modules'

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=100)
    splits = text_splitter.split_documents(docs)
    vectorstore = vector_store.add_documents(
        documents=splits, embedding=OpenAIEmbeddings()
    )




class seemAiChatHandler:
    def __init__(self, user_id, chat_id):
        """Initialize the TenderChatHandler with necessary variables."""
        path1 = f'vector_db/{user_id}/{chat_id}'
        self.user_id = user_id
        self.chat_id = chat_id
        # Vector Store (initially empty, updated when created)
        self.vector_store = Chroma(
            embedding_function=OpenAIEmbeddings(),
            persist_directory=path1
        )

        # Language Model (LLM)
        self.llm = ChatOpenAI(model="gpt-4o-mini")

        # Session History Store
        self.history_store = {}

        # Prompts
        self.system_prompt = (
            "You are an expert in analyzing Pdfs to chat. "
            "You answer user questions related to that texts by retrieving detailed and accurate information "
            "from the knowledge database. Check across multiple documents to ensure all relevant details are included. "
            "Always reply in the language the user inputs. Only provide verified information, "
            "and if certain details are not available, clearly state that the information cannot be found."
        )

        # QA Chain Prompt Template (including 'context' as a variable)
        self.qa_prompt = ChatPromptTemplate.from_messages([
            ("system", "{context}"),  # Inject the context here
            ("human", "{input}")
        ])

        # Contextualization Prompt Template
        self.contextualize_q_system_prompt = (
            "Given a chat history and the latest user question which might reference context in the chat history, "
            "formulate a standalone question which can be understood without the chat history. "
            "Do NOT answer the question, just reformulate it if needed and otherwise return it as is."
        )

        self.contextualize_q_prompt = ChatPromptTemplate.from_messages([
            ("system", self.contextualize_q_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}")
        ])

        # Compressor and Retriever
        self.compressor = LLMChainExtractor.from_llm(OpenAI(temperature=0))
        self.compression_retriever = ContextualCompressionRetriever(
            base_compressor=self.compressor,
            base_retriever=self.vector_store.as_retriever()
        )

        # History-Aware Retriever
        self.history_aware_retriever = create_history_aware_retriever(
            self.llm, self.compression_retriever, self.contextualize_q_prompt
        )

        # Question-Answer Chain
        self.question_answer_chain = create_stuff_documents_chain(
            self.llm, self.qa_prompt, document_variable_name="context"
        )

        # Retrieval-Augmented Generation (RAG) Chain
        self.rag_chain = create_retrieval_chain(
            self.history_aware_retriever, self.question_answer_chain
        )

    def get_session_history(self, session_id: str) -> ChatMessageHistory:
        """Retrieve or create a session history."""
        if session_id not in self.history_store:
            self.history_store[session_id] = ChatMessageHistory()
        return self.history_store[session_id]

    def get_answer(self, query):
        """Handle the chat interaction and return the answer."""
        num_documents = len(self.vector_store.get()["ids"])
        print(f"Total number of documents: {num_documents}")

        # Create the conversational chain with message history
        conversational_rag_chain = RunnableWithMessageHistory(
            self.rag_chain,
            lambda sid: self.get_session_history(sid),
            input_messages_key="input",
            history_messages_key="chat_history",
            output_messages_key="answer"
        )

        # Invoke the chain with the user query and session ID
        response = conversational_rag_chain.invoke(
            {"input": query},
            config={"session_id": self.user_id+self.chat_id}
        )["answer"]

        return response

# Example usage
