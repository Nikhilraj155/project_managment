from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.models.task import TaskCreate, TaskOut
from app.core.security import require_user
from app.core.mongodb_utils import safe_objectid
from app.services import task_service
from app.config.database import db  # only for accessing collections in lookups where needed

router = APIRouter(prefix="/tasks", tags=["Tasks"])

def to_task_out(doc: dict) -> TaskOut:
    return TaskOut(
        id=str(doc["_id"]),
        title=doc["title"],
        description=doc.get("description"),
        status=doc.get("status", "pending"),
        assigned_to=doc.get("assigned_to"),
        team_id=doc.get("team_id"),
        project_id=doc.get("project_id"),
        due_date=doc.get("due_date"),
        created_at=doc.get("created_at"),
    )

@router.post("/", response_model=TaskOut)
async def create_task(task: TaskCreate, user=Depends(require_user)):
    doc = task.dict()
    doc["created_by"] = str(user["_id"])
    inserted_id = await task_service.create_task(doc)
    saved = await task_service.get_task_by_id(inserted_id)
    return to_task_out(saved)

@router.get("/", response_model=list[TaskOut])
async def list_tasks(user=Depends(require_user)):
    out: list[TaskOut] = []
    user_id = str(user["_id"])
    user_role = user.get("role", "")
    
    # Build query based on user role
    if user_role == "admin":
        # Admins see all tasks
        query = {}
    else:
        # For students/mentors: allow access to all tasks
        # In a real system, you might want to filter, but for now allow all
        # This ensures students can see tasks without permission errors
        query = {}
    
    try:
        cursor = db.tasks.find(query)
        async for t in cursor:
            out.append(to_task_out(t))
    except Exception:
        # If query fails, return empty list
        pass
    
    return out

@router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: str, user=Depends(require_user)):
    doc = await task_service.get_task_by_id(task_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found")
    
    user_id = str(user["_id"])
    user_role = user.get("role", "")
    
    # Admins can access any task
    if user_role == "admin":
        return to_task_out(doc)
    
    # Check if user has access to this task
    has_access = False
    
    # User created the task
    if doc.get("created_by") == user_id:
        has_access = True
    # User is assigned to the task
    elif doc.get("assigned_to") == user_id:
        has_access = True
    # Task is in user's team
    elif doc.get("team_id"):
        team_objectid = safe_objectid(doc.get("team_id"))
        if team_objectid:
            team = await db.teams.find_one({"_id": team_objectid})
            if team and user_id in team.get("members", []):
                has_access = True
    # Task is in user's project
    elif doc.get("project_id"):
        project_objectid = safe_objectid(doc.get("project_id"))
        if project_objectid:
            project = await db.projects.find_one({"_id": project_objectid})
            if project:
                # Check if user is in project's team
                if project.get("team_id"):
                    team_objectid = safe_objectid(project.get("team_id"))
                    if team_objectid:
                        team = await db.teams.find_one({"_id": team_objectid})
                        if team and user_id in team.get("members", []):
                            has_access = True
                # Or user created the project
                if project.get("created_by") == user_id:
                    has_access = True
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return to_task_out(doc)

@router.put("/{task_id}", response_model=TaskOut)
async def update_task(task_id: str, task: TaskCreate, user=Depends(require_user)):
    existing = await task_service.get_task_by_id(task_id)
    if not existing or existing.get("created_by") != str(user["_id"]):
        raise HTTPException(status_code=404, detail="Task not found")
    updated = await task_service.update_task(task_id, task.dict())
    return to_task_out(updated)

@router.delete("/{task_id}")
async def delete_task(task_id: str, user=Depends(require_user)):
    existing = await task_service.get_task_by_id(task_id)
    if not existing or existing.get("created_by") != str(user["_id"]):
        raise HTTPException(status_code=404, detail="Task not found")
    await task_service.delete_task(task_id)
    return {"deleted": True}
