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
async def upload_documents(files: list[UploadFile], db=Depends(get_db), user_id: str = Form(...)):

    user_folder_path = 'Users/' + user_id
    vector_db_folder_path = 'vector_db/' + user_id
    
    chat_folder_path = user_folder_path
    vector_db_folder_chat_path = vector_db_folder_path
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
                "user_id": user_id,
                "file_path": file_path,
                "filename": file.filename,
                "upload_date": datetime.now(timezone.utc),
            }
            await db["documents"].insert_one(document_metadata)

        add_to_vector(user_id)
        shutil.move(file_path, chat_folder_path)
        shutil.rmtree(user_temp_path)

    return JSONResponse(content={"message": "Files processed successfully"}, status_code=200)


@router.post("/list")
async def list_documents(user_id: str = Form(), db=Depends(get_db)):
    documents = await db.documents.find_one({"user_id": ObjectId(user_id)})
        
    if not documents:
        return JSONResponse(content={"message": "No documents found for the specified user."}, status_code=404)
    
    documents_list = [
            {
                "id": str(document["_id"]),
                "filename": document["filename"],
                "file_path": document["file_path"],
                "upload_date": document["upload_date"].isoformat() if "upload_date" in document else None
            }
            for document in await documents.to_list(length=100)
        ]

    return JSONResponse(content={'documents':documents_list}, status_code=200)

@router.post("/delete")
async def delete_document(
    db=Depends(get_db),
    user_id: str = Form(...), 
    doc_id: str = Form(...), 
):
    document = await db["documents"].find_one({"_id": ObjectId(doc_id), "user_id": user_id})
        
    if not document:
        return JSONResponse(content={"error": "Document not found"}, status_code=404)

    file_path = document.get("file_path")

    if file_path and os.path.exists(file_path):
        os.remove(file_path)
    else:
        return JSONResponse(
            content={"error": f"File not found on the server: {file_path}"},
            status_code=404,
        )

    await db["documents"].delete_one({"_id": ObjectId(doc_id), "user_id": user_id})

    return JSONResponse(content={"message": "Document deleted successfully"}, status_code=200)
    

    
