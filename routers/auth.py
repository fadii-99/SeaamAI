from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from fastapi.responses import JSONResponse
from jwt import ExpiredSignatureError, InvalidTokenError
from schemas import UserSignup, UserLogin, forgetPassword, updatePassword, tokenValidation
from bson.objectid import ObjectId
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from config import  settings
import random
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig


router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/validate-token")
async def login(data: tokenValidation):
    try:
        payload = jwt.decode(data.token, settings.SECRET_KEY, algorithms=["HS256"])

        return JSONResponse(content={"message": "Token is valid", "userData": payload}, status_code=200)
    except ExpiredSignatureError:
        return JSONResponse(content={"error": "Token expired"}, status_code=401)
    except InvalidTokenError:
        return JSONResponse(content={"error": "Invalid token"}, status_code=401)



@router.post("/signup")
async def signup(user: UserSignup, db=Depends(get_db)):
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        return JSONResponse(content={"error": "Email already registered"}, status_code=400)
    
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
    user_data = {
        "name": user.name,
        "email": user.email,
        "password": hashed_password.decode('utf-8'),
        "avatar": 'default_user_avatar.jpg'
    }
    await db.users.insert_one(user_data)
    return JSONResponse(content={"message": "User registered successfully"}, status_code=200)


@router.post("/login")
async def login(user: UserLogin, db=Depends(get_db)):
    existing_user = await db.users.find_one({"email": user.email})
    if not existing_user:
        return JSONResponse(content={"error": "Invalid credentials"}, status_code=401)

    if not bcrypt.checkpw(user.password.encode('utf-8'), existing_user["password"].encode('utf-8')):
        return JSONResponse(content={"error": "Invalid credentials"}, status_code=401)

    token = jwt.encode({
        "user_id": str(existing_user["_id"]),
        "name": str(existing_user["name"]),
        "email": str(existing_user["email"]),
        "avatar": str(existing_user["avatar"]),
        "exp": int((datetime.now(timezone.utc) + timedelta(days=1)).timestamp())
    }, settings.SECRET_KEY, algorithm="HS256")

    return JSONResponse(content={"message": "User Logged in successfully","token": token}, status_code=200)




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
        return JSONResponse(content={"error":"User not found"},status_code=404)
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
    return JSONResponse(content={"message": "OTP sent successfully"}, status_code=200)
    




@router.post("/reset-password")
async def reset_password(data: updatePassword, db=Depends(get_db)):
    otp_entry = await db.otps.find({"email": data.email}).sort("created_at", -1).to_list(1)
    otp_entry = otp_entry[0] if otp_entry else None

    if not otp_entry:
        return JSONResponse(content={"error": "Invalid or expired OTP."}, status_code=400)

    expires_at = otp_entry["expires_at"].replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        return JSONResponse(content={"error": "OTP expired. Request a new one."}, status_code=400)

    if otp_entry["otp"] != data.otp:
        return JSONResponse(content={"error": "Invalid OTP."}, status_code=400)

    hashed_password = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    await db.users.update_one({"email": data.email}, {"$set": {"password": hashed_password}})

    await db.otps.delete_many({"email": data.email})

    return JSONResponse(content={"message": "Password reset successfully."}, status_code=200)

