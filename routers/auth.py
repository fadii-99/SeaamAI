from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from schemas import UserSignup, UserLogin, forgetPassword, updatePassword
from bson.objectid import ObjectId
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from config import  settings
import random
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig


router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/signup")
async def signup(user: UserSignup, db=Depends(get_db)):
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
    user_data = {
        "name": user.name,
        "email": user.email,
        "password": hashed_password.decode('utf-8'),
        "avatar": None
    }
    await db.users.insert_one(user_data)
    return {"message": "User registered successfully"}


@router.post("/login")
async def login(user: UserLogin, db=Depends(get_db)):
    existing_user = await db.users.find_one({"email": user.email})
    if not existing_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not bcrypt.checkpw(user.password.encode('utf-8'), existing_user["password"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = jwt.encode({
        "user_id": str(existing_user["_id"]),
        "name": str(existing_user["name"]),
        "email": str(existing_user["email"]),
        "avatar": str(existing_user["avatar"]),
        "exp": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    }, settings.SECRET_KEY, algorithm="HS256")

    return {"token": token}




conf = ConnectionConfig(
   MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=settings.USE_CREDENTIALS
)

@router.post("/forget-password")
async def send_otp(data: forgetPassword, db=Depends(get_db)):
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    otp_entries = await db.otps.find({"email": data.email}).to_list(None)
    if otp_entries:
        await db.otps.delete_many({"email": data.email})
    otp = random.randint(100000, 999999)

    otp_data ={
        "email": data.email,
        "otp": otp,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)), 
        "created_at": datetime.now(timezone.utc)

    }

    await db.otps.insert_one(otp_data)
    
    
    message = MessageSchema(
        subject="Your Password Reset OTP",
        recipients=[data.email],
        body=f"Your OTP for password reset is {otp}. It is valid for 5 minutes.",
        subtype="plain"
    )
    
    fm = FastMail(conf)
    await fm.send_message(message)
    
    return {"message": "OTP sent successfully"}




@router.post("/reset-password")
async def reset_password(data: updatePassword, db=Depends(get_db)):
    otp_entry = await db.otps.find({"email": data.email}).sort("created_at", -1).to_list(1)
    otp_entry = otp_entry[0] if otp_entry else None

    if not otp_entry:
        raise HTTPException(status_code=404, detail="Invalid or expired OTP.")

    print(f"Fetched OTP entry: {otp_entry}")

    expires_at = otp_entry["expires_at"].replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired. Request a new one.")

    if otp_entry["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP.")

    hashed_password = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    await db.users.update_one({"email": data.email}, {"$set": {"password": hashed_password}})

    await db.otps.delete_many({"email": data.email})

    return {"message": "Password reset successfully."}
