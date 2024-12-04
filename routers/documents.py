from fastapi import APIRouter, Depends, UploadFile, HTTPException
from database import get_db
from bson.objectid import ObjectId
from datetime import datetime, timedelta, timezone
import os
from fastapi import Form
from fastapi.responses import JSONResponse
from utils import add_to_vector, seemAiChatHandler
import shutil


router = APIRouter(prefix="/documents", tags=["Documents"])

DOCUMENTS_DIR = "documents"
os.makedirs(DOCUMENTS_DIR, exist_ok=True)  

@router.post("/upload")
async def upload_documents(files: list[UploadFile], db=Depends(get_db), user_id: str = Form(...), chat_id: str = Form(...)):
    chat_question = ''
    chat_data = {
        "user_id": user_id,
        "documents": [],
        "conversation": [], 
        "timestamp": datetime.now(timezone.utc),
    }

    chat_result = await db.chats.insert_one(chat_data)
    chat_id = str(chat_result.inserted_id)

    user_folder_path = 'Users/' + user_id
    vector_db_folder_path = 'vector_db/' + user_id
    chat_folder_path = os.path.join(user_folder_path, chat_id)
    vector_db_folder_chat_path = os.path.join(vector_db_folder_path, chat_id)
    user_temp_path =os.path.join(chat_folder_path, f'{chat_folder_path}/temp') 

    os.makedirs(chat_folder_path, exist_ok=True)
    os.makedirs(vector_db_folder_chat_path, exist_ok=True)
    os.makedirs(user_temp_path, exist_ok=True)

    if files:
        for file in files:
            if not file.filename.endswith(".pdf"):
                return JSONResponse(content={"error": "Only PDF files are allowed."}, status_code=400)
            
            unique_filename = f"{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
            file_path = os.path.join(user_temp_path, unique_filename)

            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)

            document_metadata = {
                "file_path": file_path,
                "filename": file.filename,
                "upload_date": datetime.now(timezone.utc),
            }
            await db.chats.update_one(
                {"_id": ObjectId(chat_id)},
                {"$push": {"documents": document_metadata}},
            )

        add_to_vector(user_id, chat_id)
        shutil.move(file_path, chat_folder_path)
        shutil.rmtree(user_temp_path)

    if chat_question:
        # ai_response = chat_model([HumanMessage(content=chat_question)]).content
        seemAI = seemAiChatHandler(user_id=user_id, chat_id=chat_id)
        ai_response = seemAI.get_answer(chat_question)
        

        conversation_entry = {
            "user": chat_question,
            "ai": ai_response,
            "timestamp": datetime.now(timezone.utc),
        }
        await db.chats.update_one(
            {"_id": ObjectId(chat_id)},
            {"$push": {"conversation": conversation_entry}},
        )

    updated_chat = await db.chats.find_one({"_id": ObjectId(chat_id)})


    return JSONResponse(content={
        "message": "Chat and files processed successfully",
        "chat_id": chat_id,
        "complete_chat": {
            "conversation": updated_chat["conversation"],
        },
    }, status_code=200)


@router.post("/list")
async def list_documents(user_id: str = Form(), db=Depends(get_db)):
    documents = db.documents.find({"user_id": user_id})
    return [{"id": str(doc["_id"]), "filename": doc["filename"]} for doc in await documents.to_list(length=100)]
