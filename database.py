from motor.motor_asyncio import AsyncIOMotorClient
from functools import lru_cache


client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client["chatbot_db"]
@lru_cache
def get_db():
    return db
