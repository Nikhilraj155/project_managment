from fastapi import APIRouter, Depends
from app.core.security import require_user
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/")
async def get_notifications(user=Depends(require_user)):
    return await notification_service.get_notifications_for_user(user["_id"])

@router.get("/unread-count")
async def get_unread_count(user=Depends(require_user)):
    """Get unread notification count for the red dot"""
    count = await notification_service.get_unread_count_for_user(user["_id"])
    return {"unread_count": count}

@router.post("/read/{notif_id}")
async def mark_read(notif_id: str, user=Depends(require_user)):
    await notification_service.mark_notification_read(user["_id"], notif_id)
    return {"success": True}

@router.post("/mark-all-read")
async def mark_all_read(user=Depends(require_user)):
    """Mark all notifications as read"""
    count = await notification_service.mark_all_notifications_read(user["_id"])
    return {"success": True, "marked_count": count}
