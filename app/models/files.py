from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FileCreate(BaseModel):
    filename: str
    uploader_id: str
    upload_date: datetime
    url: str
    version: int = 1
    team_id: Optional[str] = None
    project_id: Optional[str] = None

class FileOut(BaseModel):
    id: str
    filename: str
    uploader_id: str
    upload_date: datetime
    url: str
    version: int
    team_id: Optional[str]
    project_id: Optional[str]
