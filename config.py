import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import Field


load_dotenv()


class Settings(BaseSettings):
    SECRET_KEY: str = Field(..., env="SECRET_KEY")
    MONGO_URI: str = Field(..., env="MONGO_URI")
    MAIL_USERNAME: str = Field(..., env="MAIL_USERNAME")
    MAIL_PASSWORD: str = Field(..., env="MAIL_PASSWORD")
    MAIL_FROM: str = Field(..., env="MAIL_FROM")
    MAIL_PORT: int = Field(..., env="MAIL_PORT")
    MAIL_SERVER: str = Field(..., env="MAIL_SERVER")
    MAIL_STARTTLS: bool = Field(..., env="MAIL_STARTTLS")
    MAIL_SSL_TLS: bool = Field(..., env="MAIL_SSL_TLS")
    USE_CREDENTIALS: bool = Field(..., env="USE_CREDENTIALS")


    class Config:
        env_file = ".env"

settings = Settings()
