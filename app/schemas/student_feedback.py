from pydantic import BaseModel, EmailStr, constr
from typing import Optional


class StudentFeedbackCreate(BaseModel):
    student_name: constr(strip_whitespace=True, min_length=1)
    enrollment_number: constr(strip_whitespace=True, min_length=1)
    email: EmailStr
    feedback_text: constr(strip_whitespace=True, min_length=1)
    rating: int  # 1-5
    team_id: Optional[str] = None
    project_id: Optional[str] = None


class StudentFeedbackOut(BaseModel):
    id: str
    student_name: str
    enrollment_number: str
    email: EmailStr
    feedback_text: str
    rating: int
    created_at: str
    team_id: Optional[str] = None
    project_id: Optional[str] = None


