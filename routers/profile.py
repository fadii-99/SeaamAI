from fastapi import APIRouter, HTTPException, Depends, Form, UploadFile
from fastapi.responses import FileResponse,JSONResponse
from database import get_db
from schemas import UserSignup, UserLogin
from bson.objectid import ObjectId
import bcrypt
import jwt
from datetime import datetime, timedelta
from config import settings
import os
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/profile", tags=["Profile"])

AVATAR_DIR = "Avatar/"  


async def get_current_user(token: str = Depends(...)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload.get("user_id")
    except jwt.ExpiredSignatureError:
        return JSONResponse(content={"error": "Token expired"}, status_code=401)
    except jwt.InvalidTokenError:
        return JSONResponse(content={"error": "Invalid token"}, status_code=401)



@router.post("/update")
async def update_profile(
    user_id: str = Form(), 
    name: str = Form(None),  
    email: str = Form(None),  
    avatar: UploadFile = Form(None),  
    db=Depends(get_db),
):
    # Debugging information
    print('Updating profile for user:', user_id)

    existing_user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not existing_user:
        return JSONResponse(content={"error": "User not found"}, status_code=404)

    update_data = {}
    if name:
        update_data["name"] = name
    if email:
        update_data["email"] = email
    if avatar:
        old_avatar_path = existing_user.get("avatar", "")
        if old_avatar_path:
            old_avatar_full_path = os.path.join(AVATAR_DIR, old_avatar_path)
            if os.path.exists(old_avatar_full_path):
                os.remove(old_avatar_full_path)

        new_avatar_filename = f"{user_id}_{avatar.filename}"
        new_avatar_path = os.path.join(AVATAR_DIR, new_avatar_filename)
        with open(new_avatar_path, "wb") as f:
            f.write(await avatar.read())

        update_data["avatar"] = new_avatar_path

    if update_data:
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})


    exist_user = await db.users.find_one({"_id": ObjectId(user_id)})
    token = jwt.encode({
        "user_id": str(exist_user["_id"]),
        "name": str(exist_user["name"]),
        "email": str(exist_user["email"]),
        "avatar": str(exist_user["avatar"]),
        "exp": int((datetime.now(timezone.utc) + timedelta(days=1)).timestamp())
    }, settings.SECRET_KEY, algorithm="HS256")

    return JSONResponse(content={"message": "Profile updated successfully", "token":token}, status_code=200)



@router.post("/avatar")
async def get_avatar(user_id: str= Form(), db=Depends(get_db)):
    print(user_id)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return JSONResponse(content={"error": "Avatar not found"}, status_code=404)

    return FileResponse(user["avatar"], media_type="image/jpeg")
