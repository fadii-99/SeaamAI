from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, documents, chats, profile

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chats.router)
app.include_router(profile.router)

@app.get("/")
async def root():
    return {"message": "Welcome to the chatbot API"}
