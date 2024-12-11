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
     # Step 1: Check if chat_id exists
    if chat_id == "null":
        chat_data = {
            "user_id": user_id,
            "documents": [],
            "conversation": [],
            "chat_name": "New Chat",
            "timestamp": datetime.now(timezone.utc),  # Use datetime with timezone for consistency
        }
        chat_result = await db.chats.insert_one(chat_data)
        chat_id = str(chat_result.inserted_id)

    user_folder_path = 'Users/' + user_id
    vector_db_folder_path = 'vector_db/' + user_id
    
    chat_folder_path = os.path.join(user_folder_path, chat_id)
    vector_db_folder_chat_path = os.path.join(vector_db_folder_path, chat_id)
    user_temp_path =os.path.join(chat_folder_path, 'temp') 

    os.makedirs(chat_folder_path, exist_ok=True)
    os.makedirs(vector_db_folder_chat_path, exist_ok=True)
    os.makedirs(user_temp_path, exist_ok=True)

    if files:
        for file in files:
            if not file.filename.endswith(".pdf"):
                return JSONResponse(content={"error": "Only PDF files are allowed."}, status_code=400)
            
            unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}-{file.filename}"
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

    return JSONResponse(content={"message": "Files processed successfully", 'chatId':chat_id}, status_code=200)


@router.post("/list")
async def list_documents(user_id: str = Form(), chat_id: str = Form(...)):
    user_folder_path = 'Users/' + user_id
    documents = ''

    chat_folder_path = os.path.join(user_folder_path, chat_id)
    if chat_id != "null":
        documents = os.listdir(chat_folder_path)  

    return JSONResponse(content={'documents':documents}, status_code=200)

@router.post("/delete")
async def delete_document(
    user_id: str = Form(...), 
    chat_id: str = Form(...), 
    document: str = Form(...)
):
    user_folder_path = os.path.join('Users', user_id)
    chat_folder_path = os.path.join(user_folder_path, chat_id)

    document_path = os.path.join(chat_folder_path, document)

    if os.path.exists(document_path):
        try:
            os.remove(document_path)
            
            documents = os.listdir(chat_folder_path)
            return JSONResponse(content={'message': 'Document deleted successfully', 'documents': documents}, status_code=200)
        except Exception as e:
            return JSONResponse(content={'error': str(e)}, status_code=500)
    else:
        return JSONResponse(content={'error': 'Document not found'}, status_code=404)

    
