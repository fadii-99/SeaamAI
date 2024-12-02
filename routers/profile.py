from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from schemas import UserSignup, UserLogin
from bson.objectid import ObjectId
import bcrypt
import jwt
from datetime import datetime, timedelta
from config import settings
import os

router = APIRouter(prefix="/profile", tags=["Profile"])

AVATAR_DIR = "Avatar/"  # Directory where avatar files are stored


async def get_current_user(token: str = Depends(...)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload.get("user_id")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.put("/profile/update")
async def update_profile(
    user_data: UserSignup, 
    db=Depends(get_db),
    user_id: str = Depends(get_current_user), 
):
    
    existing_user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = {}
    if user_data.name:
        update_data["name"] = user_data.name
    if user_data.email and user_data.email != existing_user["email"]:
        email_exists = await db.users.find_one({"email": user_data.email})
        if email_exists:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_data["email"] = user_data.email
    if user_data.password:
        update_data["password"] = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    if user_data.avatar:
        old_avatar_path = os.path.join(AVATAR_DIR, existing_user.get("avatar", ""))
        if os.path.exists(old_avatar_path) and existing_user.get("avatar"):
            os.remove(old_avatar_path)

        # Save new avatar
        new_avatar_filename = f"{user_id}_{user_data.avatar.filename}"
        new_avatar_path = os.path.join(AVATAR_DIR, new_avatar_filename)
        with open(new_avatar_path, "wb") as f:
            f.write(await user_data.avatar.read())  # Read and save the uploaded file

        update_data["avatar"] = new_avatar_filename
        update_data["avatar"] = user_data.avatar

    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})

    return {"message": "Profile updated successfully"}
