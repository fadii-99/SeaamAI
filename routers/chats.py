
import os
from fastapi import APIRouter, Depends, UploadFile, HTTPException, Form
from database import get_db
from bson.objectid import ObjectId
from datetime import datetime, timezone
from fastapi.responses import JSONResponse
from langchain.chat_models import ChatOpenAI
from langchain.chains import ConversationalRetrievalChain
from langchain.schema import AIMessage, HumanMessage
from config import settings
from typing import List
from utils import add_to_vector, seemAiChatHandler
import shutil

from dotenv import load_dotenv
load_dotenv()


router = APIRouter(prefix="/chat", tags=["Chat"])

DOCUMENTS_DIR = "documents"
os.makedirs(DOCUMENTS_DIR, exist_ok=True)  

chat_model = ChatOpenAI(temperature=0, model_name="gpt-4", openai_api_key=settings.OPENAI_API_KEY)



@router.post("/get-response")
async def chat_with_upload(
    message: str = Form(None),
    db=Depends(get_db),
    user_id: str = Form(...),
    chat_id: str = Form(...),
):
    # Step 1: Check if chat_id exists
    if chat_id != "null":
        existing_chat = await db.chats.find_one({"_id": ObjectId(chat_id), "user_id": user_id})
        if not existing_chat:
            return JSONResponse(content={"error": "Chat ID not found"}, status_code=404)
    else:
        seemAI = seemAiChatHandler(user_id=user_id)
        ai_response = seemAI.get_answer(message)
        chat_title = seemAI.get_summary(ai_response)
        chat_data = {
            "user_id": user_id,
            "documents": [],
            "conversation": [],
            "chat_name": chat_title,
            "timestamp": datetime.now(timezone.utc),  # Use datetime with timezone for consistency
        }
        chat_result = await db.chats.insert_one(chat_data)
        chat_id = str(chat_result.inserted_id)
        

    # Simulate AI response
    


    serialized_messages = []
    for key, history in seemAI.history_store.items():
        for message in history.messages:
            serialized_messages.append({
                "role": "user" if isinstance(message, HumanMessage) else "ai",
                "content": message.content,
                "timestamp": datetime.now(timezone.utc).isoformat()  # Optional: Add a timestamp
            })

    # Update the conversation in the database
    await db.chats.update_one(
        {"_id": ObjectId(chat_id)},
        {"$push": {"conversation": {"$each": serialized_messages}}}
    )

    # Fetch updated chat
    updated_chat = await db.chats.find_one({"_id": ObjectId(chat_id)})

    return JSONResponse(
        content={
            "message": "Chat and files processed successfully",
            "chat_id": chat_id,
            "complete_chat": {
                "conversation": updated_chat["conversation"],
            },
        },
        status_code=200,
    )




@router.post("/get-chat")
async def list_chats(db=Depends(get_db), user_id: str = Form(...), chat_id: str = Form(...)):
    existing_chat = await db.chats.find_one({"_id": ObjectId(chat_id), "user_id": user_id})
    
    return JSONResponse(
        content={
            "message": "Chat and files processed successfully",
            "complete_chat": {
                "conversation": existing_chat["conversation"],
            },
        },
        status_code=200,
    )

@router.post("/delete")
async def delete_chat(
    db=Depends(get_db),
    chat_id: str = Form(...),
):
    try:
        await db["chats"].delete_one({"_id": ObjectId(chat_id)})


        return JSONResponse(
            content={
                "message": "Chat and associated files deleted successfully",
            },
            status_code=200,
        )

    except Exception as e:
        return JSONResponse(
            content={
                "message": "An error occurred while deleting the chat",
                "error": str(e),
            },
            status_code=500,
        )
    


@router.post("/list")
async def list_chats(db=Depends(get_db), user_id: str = Form(...)):
    chats = db.chats.find({"user_id": user_id})
    chat_list = [
        {
            "id": str(chat["_id"]),
            "name": str(chat["chat_name"]),
        }
        for chat in await chats.to_list(length=100)
    ]
    return JSONResponse(content={"message": "Chats retrieved successfully", "chats": chat_list}, status_code=200)
