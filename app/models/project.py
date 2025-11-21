from pydantic import BaseModel
from typing import Optional, List

class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    team_id: str
    mentor_id: str
    status: Optional[str] = "active"

class ProjectOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    team_id: Optional[str] = None
    mentor_id: Optional[str] = None
    status: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    presentation_ids: List[str] = []
