from bson import ObjectId
from app.config.database import db

async def create_team(team_data: dict):
    result = await db.teams.insert_one(team_data)
    return str(result.inserted_id)

async def get_teams():
    teams = []
    cursor = db.teams.find({})
    async for t in cursor:
        teams.append({
            "id": str(t["_id"]),
            "name": t["name"],
            "description": t.get("description"),
            "mentor_id": t.get("mentor_id"),
            "members": t.get("members", []),
            "created_at": t.get("created_at"),
            "project_id": t.get("project_id")
        })
    return teams

async def get_team_by_id(team_id: str):
    return await db.teams.find_one({"_id": ObjectId(team_id)})

async def update_team(team_id: str, update_data: dict):
    await db.teams.update_one({"_id": ObjectId(team_id)}, {"$set": update_data})
    return await get_team_by_id(team_id)

async def delete_team(team_id: str):
    await db.teams.delete_one({"_id": ObjectId(team_id)})
    return {"deleted": True}

async def get_teams_by_user(user_id: str):
    """Fetch all teams created by a particular user."""
    teams = []
    cursor = db.teams.find({"created_by": user_id})
    async for t in cursor:
        teams.append(t)
    return teams
