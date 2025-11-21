from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ChatMessageCreate(BaseModel):
    team_id: Optional[str] = None
    sender_id: str
    content: str
    mentor_id: Optional[str] = None
    student_id: Optional[str] = None

class ChatMessageOut(BaseModel):
    id: str
    team_id: Optional[str] = None
    sender_id: str
    content: str
    timestamp: datetime
    mentor_id: Optional[str] = None
    student_id: Optional[str] = None
    sender_name: Optional[str] = None
