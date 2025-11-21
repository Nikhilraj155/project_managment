from bson import ObjectId
from app.config.database import db

async def get_notifications_for_user(user_id: str):
    notifications = []
    cursor = db.notifications.find({"user_id": user_id})
    async for n in cursor:
        notifications.append(n)
    return notifications

async def mark_notification_read(user_id: str, notif_id: str):
    result = await db.notifications.update_one(
        {"_id": ObjectId(notif_id), "user_id": user_id},
        {"$set": {"read": True}},
    )
    return result.modified_count > 0
