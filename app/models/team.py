# app/models/team.py
from pydantic import BaseModel
from typing import List, Optional

class TeamCreate(BaseModel):
    name: str
    mentor_id: Optional[str] = None
    description: Optional[str] = None
    members: List[str] = []

class TeamOut(BaseModel):
    id: str
    name: str
    mentor_id: Optional[str] = None
    description: Optional[str] = None
    members: List[str] = []
