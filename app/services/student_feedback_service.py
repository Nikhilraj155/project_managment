from bson import ObjectId
from datetime import datetime
from app.config.database import db


def serialize(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "student_name": doc["student_name"],
        "enrollment_number": doc["enrollment_number"],
        "email": doc["email"],
        "feedback_text": doc["feedback_text"],
        "rating": doc["rating"],
        "created_at": doc.get("created_at"),
        "team_id": doc.get("team_id"),
        "project_id": doc.get("project_id"),
    }


async def create_student_feedback(data: dict) -> str:
    data["created_at"] = datetime.utcnow().isoformat()
    result = await db.student_feedback.insert_one(data)
    return str(result.inserted_id)


async def get_by_id(feedback_id: str) -> dict | None:
    doc = await db.student_feedback.find_one({"_id": ObjectId(feedback_id)})
    return serialize(doc) if doc else None


async def list_all() -> list[dict]:
    items: list[dict] = []
    cursor = db.student_feedback.find({}).sort("created_at", 1)
    async for d in cursor:
        items.append(serialize(d))
    return items


async def list_for_project(project_id: str) -> list[dict]:
    items: list[dict] = []
    cursor = db.student_feedback.find({"project_id": project_id}).sort("created_at", 1)
    async for d in cursor:
        items.append(serialize(d))
    return items


