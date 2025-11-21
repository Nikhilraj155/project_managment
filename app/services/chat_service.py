from datetime import datetime
from bson import ObjectId
from app.config.database import db


# ----------------------------------------------------
# 🧩 1️⃣ Send message (insert + timestamp)
# ----------------------------------------------------
async def send_message(message_data: dict):
    # Add timestamp before saving
    message_data["timestamp"] = datetime.utcnow()

    result = await db.chat.insert_one(message_data)
    return str(result.inserted_id)


# ----------------------------------------------------
# 🧩 2️⃣ Get all messages of a team
# ----------------------------------------------------
from datetime import datetime

async def get_messages(team_id: str):
    messages = []
    cursor = db.chat.find({"team_id": team_id}).sort("timestamp", 1)
    async for m in cursor:
        m["id"] = str(m["_id"])
        del m["_id"]
        # Fix: if timestamp is missing, assign a valid datetime
        if "timestamp" not in m or m["timestamp"] is None:
            m["timestamp"] = datetime.utcnow()
        messages.append(m)
    return messages




# ----------------------------------------------------
# 🧩 3️⃣ Get a single message by ID
# ----------------------------------------------------
async def get_message_by_id(message_id: str):
    message = await db.chat.find_one({"_id": ObjectId(message_id)})
    if message:
        message["id"] = str(message["_id"])
        del message["_id"]
    return message


# ----------------------------------------------------
# 🧩 4️⃣ Get messages between mentor and their students
# ----------------------------------------------------
async def get_mentor_student_messages(mentor_id: str):
    """Get all messages between a mentor and their assigned students"""
    messages = []
    # Find all messages where mentor_id matches
    cursor = db.chat.find({"mentor_id": mentor_id}).sort("timestamp", 1)
    async for m in cursor:
        m["id"] = str(m["_id"])
        del m["_id"]
        if "timestamp" not in m or m["timestamp"] is None:
            m["timestamp"] = datetime.utcnow()
        messages.append(m)
    return messages


# ----------------------------------------------------
# 🧩 5️⃣ Get messages between student and their mentor
# ----------------------------------------------------
async def get_student_mentor_messages(student_id: str):
    """Get all messages between a student and their assigned mentor"""
    messages = []
    # Find all messages where student_id matches
    cursor = db.chat.find({"student_id": student_id}).sort("timestamp", 1)
    async for m in cursor:
        m["id"] = str(m["_id"])
        del m["_id"]
        if "timestamp" not in m or m["timestamp"] is None:
            m["timestamp"] = datetime.utcnow()
        messages.append(m)
    return messages