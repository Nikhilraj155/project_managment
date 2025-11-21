# app/config/database.py
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "project_management")
SECRET_KEY = os.getenv("SECRET_KEY", "change_me")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

users_collection = db.users
teams_collection = db.teams
projects_collection = db.projects
tasks_collection = db.tasks
feedback_collection = db.feedback
presentations_collection = db.presentations
files_collection = db.files
notifications_collection = db.notifications

try:
    client.admin.command("ping")
    print("Connected to MongoDB")
except Exception as e:
    print("MongoDB connection failed:", e)

async def check_db_connection():
    try:
        await client.admin.command("ping")
        return "MongoDB Connected"
    except Exception:
        return "MongoDB Not Connected"
