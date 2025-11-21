from bson import ObjectId
from app.config.database import db

async def create_project(project_data: dict):
    result = await db.projects.insert_one(project_data)
    return str(result.inserted_id)

async def get_project_by_id(project_id: str):
    return await db.projects.find_one({"_id": ObjectId(project_id)})

async def update_project(project_id: str, update_data: dict):
    await db.projects.update_one({"_id": ObjectId(project_id)}, {"$set": update_data})
    return await get_project_by_id(project_id)

async def delete_project(project_id: str):
    await db.projects.delete_one({"_id": ObjectId(project_id)})
    return {"deleted": True}

async def get_projects_by_user(user_id: str):
    projects = []
    cursor = db.projects.find({"created_by": user_id})
    async for p in cursor:
        projects.append(p)
    return projects

async def get_all_projects():
    projects = []
    cursor = db.projects.find({})
    async for p in cursor:
        projects.append(p)
    return projects