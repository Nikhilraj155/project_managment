from pydantic import BaseModel, EmailStr, constr
from typing import Optional


class ProjectIdeaCreate(BaseModel):
    student_name: constr(strip_whitespace=True, min_length=1)
    mobile_number: constr(strip_whitespace=True, min_length=5)
    email: EmailStr
    idea1: constr(strip_whitespace=True, min_length=1)
    idea2: Optional[str] = None
    idea3: Optional[str] = None
    team_id: Optional[str] = None
    project_id: Optional[str] = None


class ProjectIdeaOut(BaseModel):
    id: str
    student_name: str
    mobile_number: str
    email: EmailStr
    idea1: str
    idea2: Optional[str] = None
    idea3: Optional[str] = None
    created_at: str
    team_id: Optional[str] = None
    project_id: Optional[str] = None


