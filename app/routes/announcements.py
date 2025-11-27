from fastapi import APIRouter, Depends, HTTPException
from app.core.security import require_user
from app.config.database import db
from app.services import notification_service
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/announcements", tags=["Announcements"])

def serialize(doc: dict) -> dict:
    return {
        "id": str(doc.get("_id")),
        "title": doc.get("title"),
        "message": doc.get("message"),
        "audience": doc.get("audience", "all"),
        "created_by": str(doc.get("created_by")),
        "created_at": doc.get("created_at")
    }

@router.get("/")
async def list_announcements(user=Depends(require_user)):
    results = []
    user_role = user.get("role", "student")

    # Filter announcements based on user role
    audience_filter = {
        "audience": {
            "$in": ["all", user_role]
        }
    }

    cursor = db.announcements.find(audience_filter).sort("created_at", -1)
    async for a in cursor:
        results.append(serialize(a))
    return results

@router.post("/")
async def create_announcement(title: str, message: str, audience: str = "all", user=Depends(require_user)):
    doc = {
        "title": title,
        "message": message,
        "audience": audience,
        "created_by": user["_id"],
        "created_at": datetime.utcnow().isoformat()
    }
    result = await db.announcements.insert_one(doc)
    saved = await db.announcements.find_one({"_id": result.inserted_id})

    # Create role-based notifications for the announcement
    notification_count = await notification_service.create_role_based_notifications(
        audience=audience,
        message=message,
        title=title,
        notif_type="announcement"
    )

    return {
        "announcement": serialize(saved),
        "notification_count": notification_count
    }

@router.delete("/{announcement_id}")
async def delete_announcement(announcement_id: str, user=Depends(require_user)):
    result = await db.announcements.delete_one({"_id": ObjectId(announcement_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"deleted": True}


