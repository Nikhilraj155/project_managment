# app/services/user_service.py
from app.config.database import users_collection
from app.services.auth_service import hash_password
from bson import ObjectId

async def create_user(user_data: dict):
    user = user_data.copy()
    user["password"] = hash_password(user["password"])
    result = await users_collection.insert_one(user)
    return str(result.inserted_id)

async def get_user_by_email(email: str):
    return await users_collection.find_one({"email": email})

async def get_user_by_id(user_id: str):
    return await users_collection.find_one({"_id": ObjectId(user_id)})

async def list_users():
    users = []
    cursor = users_collection.find({})
    async for u in cursor:
        users.append({"id": str(u["_id"]), "username": u["username"], "email": u["email"], "role": u.get("role", "student")})
    return users

async def list_users_by_role(role: str):
    users = []
    cursor = users_collection.find({"role": role})
    async for u in cursor:
        users.append({
            "id": str(u["_id"]),
            "username": u["username"],
            "email": u["email"],
            "role": u.get("role", "student"),
            "mentor_id": u.get("mentor_id")
        })
    return users

async def assign_mentor(user_id: str, mentor_id: str) -> bool:
    result = await users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": {"mentor_id": mentor_id}})
    return result.matched_count > 0