from bson import ObjectId
from app.config.database import db
from datetime import datetime
from typing import List, Optional

async def get_notifications_for_user(user_id: str):
    notifications = []
    cursor = db.notifications.find({"user_id": user_id}).sort("created_at", -1)
    async for n in cursor:
        notifications.append(n)
    return notifications

async def get_unread_count_for_user(user_id: str) -> int:
    """Get count of unread notifications for a user"""
    count = await db.notifications.count_documents({"user_id": user_id, "read": False})
    return count

async def mark_notification_read(user_id: str, notif_id: str):
    result = await db.notifications.update_one(
        {"_id": ObjectId(notif_id), "user_id": user_id},
        {"$set": {"read": True}},
    )
    return result.modified_count > 0

async def mark_all_notifications_read(user_id: str):
    """Mark all notifications for a user as read"""
    result = await db.notifications.update_many(
        {"user_id": user_id, "read": False},
        {"$set": {"read": True}}
    )
    return result.modified_count

async def create_notification(user_id: str, message: str, notif_type: str = "general", related_id: Optional[str] = None):
    """Create a notification for a specific user"""
    notification = {
        "user_id": user_id,
        "message": message,
        "notif_type": notif_type,
        "related_id": related_id,
        "read": False,
        "created_at": datetime.utcnow().isoformat()
    }
    result = await db.notifications.insert_one(notification)
    return str(result.inserted_id)

async def create_role_based_notifications(audience: str, message: str, title: str, notif_type: str = "announcement"):
    """Create notifications for users based on role audience"""
    # Determine target roles based on audience
    target_roles = []
    if audience == "all":
        target_roles = ["student", "mentor", "panel"]
    elif audience == "students":
        target_roles = ["student"]
    elif audience == "mentors":
        target_roles = ["mentor", "panel"]  # Panel members are also considered mentors
    else:
        # Unknown audience, don't send notifications
        return 0

    # Find all users with target roles
    users_cursor = db.users.find({"role": {"$in": target_roles}})
    user_ids = []
    async for user in users_cursor:
        user_ids.append(user["_id"])

    if not user_ids:
        return 0

    # Create notifications for all target users
    notifications = []
    for user_id in user_ids:
        notifications.append({
            "user_id": str(user_id),
            "message": f"{title}: {message}",
            "notif_type": notif_type,
            "related_id": None,
            "read": False,
            "created_at": datetime.utcnow().isoformat()
        })

    if notifications:
        result = await db.notifications.insert_many(notifications)
        return len(result.inserted_ids)
    return 0
