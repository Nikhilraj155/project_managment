from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "pending"
    assigned_to: Optional[str] = None
    team_id: Optional[str] = None
    project_id: Optional[str] = None
    due_date: Optional[datetime] = None

class TaskOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: str
    assigned_to: Optional[str]
    team_id: Optional[str]
    project_id: Optional[str]
    due_date: Optional[datetime]
    created_at: Optional[datetime]
