from fastapi import APIRouter, Depends, UploadFile, HTTPException
from database import get_db
from bson.objectid import ObjectId
from gridfs import GridFS

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("/upload")
async def upload_documents(files: list[UploadFile], db=Depends(get_db), user_id=Depends()):
    grid_fs = GridFS(db)
    file_ids = []
    for file in files:
        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        content = await file.read()
        file_id = grid_fs.put(content, filename=file.filename, user_id=user_id)
        file_ids.append(file_id)
    
    return {"message": "Files uploaded successfully", "file_ids": file_ids}

@router.get("/")
async def list_documents(db=Depends(get_db), user_id=Depends()):
    documents = db.documents.find({"user_id": user_id})
    return [{"id": str(doc["_id"]), "filename": doc["filename"]} for doc in await documents.to_list(length=100)]
