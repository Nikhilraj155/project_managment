from pydantic import BaseModel
from typing import List

class PresentationCreate(BaseModel):
    team_id: str
    project_id: str
    round_number: int
    date: str
    assigned_panel_ids: List[str] = []

class PresentationOut(BaseModel):
    id: str
    team_id: str
    project_id: str
    round_number: int
    date: str
    file_ids: List[str] = []
    feedback_ids: List[str] = []
    assigned_panel_ids: List[str] = []
