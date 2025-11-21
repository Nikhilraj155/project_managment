from bson import ObjectId
from app.config.database import db


def serialize(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "project_id": doc["project_id"],
        "round1_date": doc.get("round1_date"),
        "round1_deadline": doc.get("round1_deadline"),
        "round2_date": doc.get("round2_date"),
        "round2_deadline": doc.get("round2_deadline"),
        "round3_date": doc.get("round3_date"),
        "round3_deadline": doc.get("round3_deadline"),
    }


async def upsert(schedule: dict) -> str:
    existing = await db.round_schedules.find_one({"project_id": schedule["project_id"]})
    if existing:
        await db.round_schedules.update_one({"_id": existing["_id"]}, {"$set": schedule})
        return str(existing["_id"])
    res = await db.round_schedules.insert_one(schedule)
    return str(res.inserted_id)


async def get_by_project(project_id: str) -> dict | None:
    doc = await db.round_schedules.find_one({"project_id": project_id})
    return serialize(doc) if doc else None


async def list_for_projects(project_ids: list[str]) -> list[dict]:
    items: list[dict] = []
    if not project_ids:
        return items
    cur = db.round_schedules.find({"project_id": {"$in": project_ids}})
    async for d in cur:
        items.append(serialize(d))
    return items

