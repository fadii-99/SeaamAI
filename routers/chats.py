from fastapi import APIRouter, Depends
from database import get_db
from schemas import ChatSchema
from datetime import datetime

router = APIRouter(prefix="/chats", tags=["Chats"])

@router.post("/")
async def save_chat(chat: ChatSchema, db=Depends(get_db), user_id=Depends()):
    chat_data = {
        "user_id": user_id,
        "document_id": chat.document_id,
        "question": chat.question,
        "response": chat.response,
        "timestamp": datetime.utcnow()
    }
    await db.chats.insert_one(chat_data)
    return {"message": "Chat saved successfully"}

@router.get("/")
async def get_chats(db=Depends(get_db), user_id=Depends()):
    chats = db.chats.find({"user_id": user_id})
    return [{"question": chat["question"], "response": chat["response"]} for chat in await chats.to_list(length=100)]
