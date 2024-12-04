from fastapi import APIRouter, Depends, UploadFile, HTTPException
from database import get_db
from bson.objectid import ObjectId
from datetime import datetime, timedelta, timezone
import os
from fastapi import Form


router = APIRouter(prefix="/documents", tags=["Documents"])

DOCUMENTS_DIR = "documents"
os.makedirs(DOCUMENTS_DIR, exist_ok=True)  

@router.post("/upload")
async def upload_documents(files: list[UploadFile], db=Depends(get_db), user_id: int = Form(...), chat_id: int = Form(...)):
    if chat_id is None:
        chat_data = {
        "user_id": user_id,
        "document_id": chat.document_id,
        "question": chat.question,
        "response": chat.response,
        "timestamp": datetime.now(timezone.utc)
        }
        await db.chats.insert_one(chat_data)


    file_entries = []
    for file in files:
        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")

        unique_filename = f"{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
        file_path = os.path.join(DOCUMENTS_DIR, unique_filename)

        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        chat_id = str(ObjectId())  
        document_entry = {
            "user_id": user_id,
            "file_path": file_path,
            "filename": file.filename,
            "upload_date": datetime.now(),
            "chat_id": chat_id
        }
        result = await db.documents.insert_one(document_entry)
        document_entry["_id"] = str(result.inserted_id)
        file_entries.append(document_entry)

    return {"message": "Files uploaded successfully", "files": file_entries}

@router.get("/")
async def list_documents(db=Depends(get_db), user_id=Depends()):
    documents = db.documents.find({"user_id": user_id})
    return [{"id": str(doc["_id"]), "filename": doc["filename"]} for doc in await documents.to_list(length=100)]
