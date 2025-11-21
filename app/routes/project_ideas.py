from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.security import require_user
from app.schemas.project_idea import ProjectIdeaCreate, ProjectIdeaOut
from app.services import project_idea_service


router = APIRouter(prefix="/project-ideas", tags=["Project Ideas"])


@router.post("/", response_model=ProjectIdeaOut)
async def create_project_idea(payload: ProjectIdeaCreate, user=Depends(require_user)):
    inserted_id = await project_idea_service.create_project_idea(payload.dict())
    saved = await project_idea_service.get_by_id(inserted_id)
    return saved


@router.get("/", response_model=list[ProjectIdeaOut])
async def list_project_ideas(user=Depends(require_user)):
    return await project_idea_service.list_all()


@router.get("/project/{project_id}", response_model=list[ProjectIdeaOut])
async def list_project_ideas_for_project(project_id: str, user=Depends(require_user)):
    return await project_idea_service.list_for_project(project_id)


class GenerateLinkRequest(BaseModel):
    project_id: str | None = None
    team_id: str | None = None


@router.post("/generate-link")
async def generate_project_idea_link(payload: GenerateLinkRequest, user=Depends(require_user)):
    token = await project_idea_service.create_link(payload.project_id or "", payload.team_id)
    return {"token": token}


# Public endpoints (no auth)
public_router = APIRouter(prefix="/public/project-ideas", tags=["Project Ideas (Public)"])


@public_router.get("/{token}")
async def get_project_info_by_token(token: str):
    info = await project_idea_service.resolve_link(token)
    if not info:
        return {"valid": False}
    return {"valid": True, **info}


@public_router.post("/{token}", response_model=ProjectIdeaOut)
async def submit_project_idea_by_token(token: str, payload: ProjectIdeaCreate):
    info = await project_idea_service.resolve_link(token)
    if not info:
        raise Exception("Invalid link")
    merged = payload.dict()
    merged.setdefault("project_id", info.get("project_id"))
    merged.setdefault("team_id", info.get("team_id"))
    inserted_id = await project_idea_service.create_project_idea(merged)
    saved = await project_idea_service.get_by_id(inserted_id)
    return saved


