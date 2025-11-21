# app/schemas/teams.py
from pydantic import BaseModel
from typing import Optional, List

# Schema for creating a new team
class TeamCreate(BaseModel):
    name: str
    mentor_id: str
    description: Optional[str] = None
    members: List[str] = []  # Optional: you can include members while creating

# Schema for returning team data to clients
class TeamOut(BaseModel):
    id: str
    name: str
    mentor_id: str
    description: Optional[str] = None
    members: List[str] = []
