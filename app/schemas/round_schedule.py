from pydantic import BaseModel
from typing import Optional


class RoundScheduleUpsert(BaseModel):
    project_id: str
    round1_date: Optional[str] = None
    round1_deadline: Optional[str] = None
    round2_date: Optional[str] = None
    round2_deadline: Optional[str] = None
    round3_date: Optional[str] = None
    round3_deadline: Optional[str] = None


class RoundScheduleOut(BaseModel):
    id: str
    project_id: str
    round1_date: Optional[str] = None
    round1_deadline: Optional[str] = None
    round2_date: Optional[str] = None
    round2_deadline: Optional[str] = None
    round3_date: Optional[str] = None
    round3_deadline: Optional[str] = None

