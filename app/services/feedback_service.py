from bson import ObjectId
from app.config.database import db
from datetime import datetime

def serialize_feedback(fb):
    """Convert MongoDB document to Python dict matching Pydantic model."""
    return {
        "id": str(fb["_id"]),
        "team_id": fb["team_id"],
        "project_id": fb["project_id"],
        "round_number": fb["round_number"],
        "evaluator_id": fb["evaluator_id"],
        "score": fb["score"],
        "comments": fb.get("comments"),
        "created_at": fb.get("created_at")  # optional field
    }

async def submit_feedback(feedback_data: dict):
    feedback_data["created_at"] = datetime.utcnow().isoformat()
    result = await db.feedback.insert_one(feedback_data)
    return str(result.inserted_id)

async def get_feedback_by_id(feedback_id: str):
    fb = await db.feedback.find_one({"_id": ObjectId(feedback_id)})
    return serialize_feedback(fb)

async def get_feedback_by_team(team_id: str):
    feedbacks = []
    cursor = db.feedback.find({"team_id": team_id})
    async for f in cursor:
        feedbacks.append(serialize_feedback(f))
    return feedbacks
