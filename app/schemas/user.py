from pydantic import BaseModel, EmailStr

class UserOut(BaseModel):
    id: str
    username: str
    email: EmailStr
    role: str