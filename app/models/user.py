# app/models/user.py
from pydantic import BaseModel, EmailStr, constr
from pydantic import BaseModel

class LoginInput(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: constr(min_length=6, max_length=72)
    role: str  # "student", "mentor", "panel", "admin"
class UserOut(BaseModel):
    id: str
    username: str
    email: EmailStr
    role: str 