from pydantic import BaseModel
from typing import Optional

class NotificationCreate(BaseModel):
    user_id: str
    message: str
    notif_type: str  # "deadline", "message", "feedback", etc.
    related_id: Optional[str] = None

class NotificationOut(BaseModel):
    id: str
    user_id: str
    message: str
    notif_type: str
    related_id: Optional[str]
    read: bool = False
    created_at: Optional[str]
