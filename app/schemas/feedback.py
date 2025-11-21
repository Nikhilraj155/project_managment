from pydantic import BaseModel
from typing import Optional

class FeedbackCreate(BaseModel):
    team_id: str
    project_id: str
    round_number: int
    evaluator_id: str
    score: float
    comments: Optional[str] = None

class FeedbackOut(BaseModel):
    id: str
    team_id: str
    project_id: str
    round_number: int
    evaluator_id: str
    score: float
    comments: Optional[str]
    created_at: Optional[str]
