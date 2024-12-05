# import os
# from fastapi import APIRouter, Depends, UploadFile, HTTPException, Form
# from database import get_db
# from bson.objectid import ObjectId
# from datetime import datetime, timezone
# from fastapi.responses import JSONResponse


# router = APIRouter(prefix="/chat", tags=["Chat"])

# DOCUMENTS_DIR = "documents"
# os.makedirs(DOCUMENTS_DIR, exist_ok=True)  

# @router.post("/chat-upload")
# async def chat_with_upload(
#     chat_question: str = Form(None),  
#     chat_response: str = Form(None),  
#     files: list[UploadFile] = Form(None),  
#     db=Depends(get_db),
#     user_id: int = Form(...),  
# ):
#     chat_data = {
#         "user_id": user_id,
#         "documents": [], 
#         "question": chat_question,
#         "response": chat_response,
#         "timestamp": datetime.now(timezone.utc),
#     }
#     chat_result = await db.chats.insert_one(chat_data)
#     chat_id = str(chat_result.inserted_id)

#     if files:
#         for file in files:
#             if not file.filename.endswith(".pdf"):
#                 return JSONResponse(content={"error": "Only PDF files are allowed."}, status_code=400)
            

#             unique_filename = f"{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
#             file_path = os.path.join(DOCUMENTS_DIR, unique_filename)

#             with open(file_path, "wb") as f:
#                 content = await file.read()
#                 f.write(content)

#             document_metadata = {
#                 "file_path": file_path,
#                 "filename": file.filename,
#                 "upload_date": datetime.now(timezone.utc),
#             }
#             await db.chats.update_one(
#                 {"_id": ObjectId(chat_id)},
#                 {"$push": {"documents": document_metadata}},
#             )

#     return JSONResponse(content={
#         "message": "Chat and files processed successfully",
#         "chat_id": chat_id,
#     }, status=200)


# @router.get("/list-chats")
# async def list_chats(db=Depends(get_db), user_id: int = Form(...)):
#     chats = db.chats.find({"user_id": user_id})
#     chat_list = [
#         {
#             "id": str(chat["_id"]),
#             "question": chat["question"],
#             "response": chat["response"],
#             "documents": chat["documents"],  
#             "timestamp": chat["timestamp"],
#         }
#         for chat in await chats.to_list(length=100)
#     ]
#     return JSONResponse(content={"message": "Chats retrieved successfully", "chats": chat_list}, status_code=200)




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
    print(chat_id)
    # Step 1: Check if chat_id exists
    if chat_id != "null":
        existing_chat = await db.chats.find_one({"_id": ObjectId(chat_id), "user_id": user_id})
        if not existing_chat:
            return JSONResponse(content={"error": "Chat ID not found"}, status_code=404)
    else:
        # If no chat_id is provided, create a new chat
        chat_data = {
            "user_id": user_id,
            "documents": [],
            "conversation": [],
            "chat_name": message[:20] if message else "New Chat",
            "timestamp": datetime.now(timezone.utc),  # Use datetime with timezone for consistency
        }
        chat_result = await db.chats.insert_one(chat_data)
        chat_id = str(chat_result.inserted_id)
        
        user_folder_path = os.path.join('Users', user_id)
        chat_folder_path = os.path.join(user_folder_path, chat_id)

        os.makedirs(chat_folder_path, exist_ok=True)

    # Simulate AI response
    seemAI = seemAiChatHandler(user_id=user_id, chat_id=chat_id)
    ai_response = seemAI.get_answer(message)
    print(ai_response)

    print(seemAI.history_store)

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
    print(user_id)
    print(chat_id)
    print(existing_chat)
    
    return JSONResponse(
        content={
            "message": "Chat and files processed successfully",
            "complete_chat": {
                "conversation": existing_chat["conversation"],
            },
        },
        status_code=200,
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
