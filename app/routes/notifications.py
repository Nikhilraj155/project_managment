from fastapi import APIRouter, Depends
from app.core.security import require_user
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/")
async def get_notifications(user=Depends(require_user)):
    return await notification_service.get_notifications_for_user(user["_id"])

@router.post("/read/{notif_id}")
async def mark_read(notif_id: str, user=Depends(require_user)):
    await notification_service.mark_notification_read(user["_id"], notif_id)
    return {"success": True}
