from fastapi import APIRouter, Depends, HTTPException
from app.models.project import ProjectCreate, ProjectOut
from app.core.security import require_user
from app.services import project_service, team_service
from bson import ObjectId
from bson.errors import InvalidId

router = APIRouter(prefix="/projects", tags=["Projects"])

def is_valid_objectid(id_str: str) -> bool:
    """Check if a string is a valid ObjectId"""
    if not id_str or not isinstance(id_str, str):
        return False
    try:
        ObjectId(id_str)
        return len(id_str) == 24  # MongoDB ObjectId is 24 hex characters
    except (InvalidId, Exception):
        return False

async def get_team_id_for_project(project_id: str) -> str | None:
    """Try to find team_id from team that has this project_id"""
    try:
        from app.config.database import db
        # Query teams collection directly to find team with this project_id
        team = await db.teams.find_one({"project_id": project_id})
        if team:
            return str(team["_id"])
    except Exception:
        pass
    return None

async def project_to_out(doc: dict) -> ProjectOut:
    # Handle invalid team_id - if it's "string" or invalid, try to get from team relationship
    team_id = doc.get("team_id")
    project_id = str(doc["_id"])
    
    # Validate team_id - if it's the literal "string" or invalid, try to find it from team
    if not is_valid_objectid(team_id):
        # Try to get team_id from team that has this project_id
        team_id = await get_team_id_for_project(project_id)
    
    return ProjectOut(
        id=project_id,
        title=doc["title"],
        description=doc.get("description"),
        team_id=team_id,
        mentor_id=doc.get("mentor_id") if is_valid_objectid(doc.get("mentor_id")) else None,
        status=doc.get("status", "active"),
        start_date=doc.get("start_date"),
        end_date=doc.get("end_date"),
        presentation_ids=doc.get("presentation_ids", []),
    )

@router.post("/", response_model=ProjectOut)
async def create_project(project: ProjectCreate, user=Depends(require_user)):
    doc = project.dict()
    doc["created_by"] = user["_id"]
    inserted_id = await project_service.create_project(doc)
    saved = await project_service.get_project_by_id(inserted_id)
    return await project_to_out(saved)

@router.get("/", response_model=list[ProjectOut])
async def list_projects(user=Depends(require_user)):
    projects = await project_service.get_projects_by_user(user["_id"])
    return [await project_to_out(p) for p in projects]

@router.get("/all", response_model=list[ProjectOut])
async def list_all_projects(user=Depends(require_user)):
    projects = await project_service.get_all_projects()
    return [await project_to_out(p) for p in projects]

@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str, user=Depends(require_user)):
    doc = await project_service.get_project_by_id(project_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return await project_to_out(doc)
