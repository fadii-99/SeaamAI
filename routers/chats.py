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

from dotenv import load_dotenv
load_dotenv()


router = APIRouter(prefix="/chat", tags=["Chat"])

DOCUMENTS_DIR = "documents"
os.makedirs(DOCUMENTS_DIR, exist_ok=True)  

chat_model = ChatOpenAI(temperature=0, model_name="gpt-4", openai_api_key=settings.OPENAI_API_KEY)

@router.post("/get-response")
async def chat_with_upload(
    message: str = Form(None),  
    # files: List[UploadFile] = Form([]),  # Optional files as a list
    db=Depends(get_db),
    user_id: str = Form(...),  
):
    chat_question = message
    chat_data = {
        "user_id": user_id,
        "documents": [],
        "conversation": [], 
        "timestamp": datetime.now(timezone.utc),
    }
    chat_result = await db.chats.insert_one(chat_data)
    chat_id = str(chat_result.inserted_id)

    # if files:
    #     for file in files:
    #         if not file.filename.endswith(".pdf"):
    #             return JSONResponse(content={"error": "Only PDF files are allowed."}, status_code=400)
            
    #         unique_filename = f"{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
    #         file_path = os.path.join(DOCUMENTS_DIR, unique_filename)

    #         with open(file_path, "wb") as f:
    #             content = await file.read()
    #             f.write(content)

    #         document_metadata = {
    #             "file_path": file_path,
    #             "filename": file.filename,
    #             "upload_date": datetime.now(timezone.utc),
    #         }
    #         await db.chats.update_one(
    #             {"_id": ObjectId(chat_id)},
    #             {"$push": {"documents": document_metadata}},
    #         )

    if chat_question:
        ai_response = chat_model([HumanMessage(content=chat_question)]).content

        conversation_entry = {
            "user": chat_question,
            "ai": ai_response,
            "timestamp": datetime.now(timezone.utc),
        }
    updated_chat = await db.chats.find_one({"_id": ObjectId(chat_id)})


    return JSONResponse(content={
        "message": "Chat and files processed successfully",
        "chat_id": chat_id,
        "complete_chat": {
            "conversation": updated_chat["conversation"],
        },
    }, status_code=200)


@router.get("/list-chats")
async def list_chats(db=Depends(get_db), user_id: str = Form(...)):
    chats = db.chats.find({"user_id": user_id})
    chat_list = [
        {
            "id": str(chat["_id"]),
            "documents": chat["documents"],  
            "conversation": chat["conversation"],  
            "timestamp": chat["timestamp"],
        }
        for chat in await chats.to_list(length=100)
    ]
    return JSONResponse(content={"message": "Chats retrieved successfully", "chats": chat_list}, status_code=200)
