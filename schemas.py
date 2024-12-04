from pydantic import BaseModel, EmailStr, Field

class UserSignup(BaseModel):
    name: str = Field(None, example="John Doe")
    email: EmailStr = Field(None, example="johndoe@example.com")
    password: str = Field(None, example="password123")
    # avatar: str = Field(None, example="https://example.com/avatar.jpg")

class UserLogin(BaseModel):
    email: str
    password: str

class ChatSchema(BaseModel):
    document_id: str
    question: str
    response: str

class forgetPassword(BaseModel):
    email: EmailStr = Field(None, example="johndoe@example.com")

class updatePassword(BaseModel):
    email: EmailStr = Field(None, example="johndoe@example.com")
    new_password: str = Field(None, example="password123")
    otp: int
