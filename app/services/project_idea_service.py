from bson import ObjectId
from datetime import datetime
from app.config.database import db


def serialize(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "student_name": doc["student_name"],
        "mobile_number": doc["mobile_number"],
        "email": doc["email"],
        "idea1": doc["idea1"],
        "idea2": doc.get("idea2"),
        "idea3": doc.get("idea3"),
        "created_at": doc.get("created_at"),
        "team_id": doc.get("team_id"),
        "project_id": doc.get("project_id"),
    }


async def create_project_idea(data: dict) -> str:
    data["created_at"] = datetime.utcnow().isoformat()
    result = await db.project_ideas.insert_one(data)
    return str(result.inserted_id)


async def get_by_id(idea_id: str) -> dict | None:
    doc = await db.project_ideas.find_one({"_id": ObjectId(idea_id)})
    return serialize(doc) if doc else None


async def list_all() -> list[dict]:
    items: list[dict] = []
    cursor = db.project_ideas.find({}).sort("created_at", -1)
    async for d in cursor:
        items.append(serialize(d))
    return items


async def list_for_project(project_id: str) -> list[dict]:
    items: list[dict] = []
    cursor = db.project_ideas.find({"project_id": project_id}).sort("created_at", -1)
    async for d in cursor:
        items.append(serialize(d))
    return items


# Link generation and resolution
async def create_link(project_id: str, team_id: str | None) -> str:
    import secrets
    token = secrets.token_urlsafe(16)
    await db.project_idea_links.insert_one({
        "token": token,
        "project_id": project_id,
        "team_id": team_id,
        "created_at": datetime.utcnow().isoformat(),
    })
    return token


async def resolve_link(token: str) -> dict | None:
    doc = await db.project_idea_links.find_one({"token": token})
    if not doc:
        return None
    return {
        "project_id": doc.get("project_id"),
        "team_id": doc.get("team_id"),
    }


