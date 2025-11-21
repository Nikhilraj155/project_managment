from bson import ObjectId
from app.config.database import db

async def create_task(task_data: dict):
    result = await db.tasks.insert_one(task_data)
    return str(result.inserted_id)

async def get_tasks():
    tasks = []
    cursor = db.tasks.find({})
    async for t in cursor:
        tasks.append({
            "id": str(t["_id"]),
            "title": t["title"],
            "description": t.get("description"),
            "status": t.get("status", "pending"),
            "assigned_to": t.get("assigned_to"),
            "team_id": t.get("team_id"),
            "project_id": t.get("project_id"),
            "due_date": t.get("due_date"),
            "created_at": t.get("created_at"),
        })
    return tasks

async def get_task_by_id(task_id: str):
    return await db.tasks.find_one({"_id": ObjectId(task_id)})

async def update_task(task_id: str, update_data: dict):
    await db.tasks.update_one({"_id": ObjectId(task_id)}, {"$set": update_data})
    return await get_task_by_id(task_id)

async def delete_task(task_id: str):
    await db.tasks.delete_one({"_id": ObjectId(task_id)})
    return {"deleted": True}

async def get_tasks_by_user(user_id: str):
    """Fetch tasks created by a specific user."""
    tasks = []
    cursor = db.tasks.find({"created_by": user_id})
    async for t in cursor:
        tasks.append(t)
    return tasks
