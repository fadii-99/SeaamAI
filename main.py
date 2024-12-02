from fastapi import FastAPI
from routers import auth, documents, chats

app = FastAPI()

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chats.router)

@app.get("/")
async def root():
    return {"message": "Welcome to the chatbot API"}
