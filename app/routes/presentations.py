from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from app.core.security import require_user
from app.core.mongodb_utils import safe_objectid, safe_objectid_list
from app.services import presentation_service
from app.schemas.presentation import PresentationOut
from app.config.database import db
from bson import ObjectId
from fastapi.responses import StreamingResponse
from datetime import datetime

router = APIRouter(prefix="/presentations", tags=["Presentations"])

@router.post("/", response_model=PresentationOut)
async def upload_presentation(
    team_id: str = Form(...),
    project_id: str = Form(...),
    round_number: int = Form(...),
    date: str = Form(...),
    file: UploadFile = File(...),
    assigned_panel_ids: str = Form(''),
    user=Depends(require_user)
):
    # Check if presentation already exists for this project and round
    existing = await db.presentations.find_one({
        "project_id": project_id,
        "round_number": round_number
    })
    
    # Save the file to DB
    file_id = await presentation_service.save_ppt_file(file, user["_id"])

    if existing:
        # Update existing presentation - delete old files first
        old_file_ids = existing.get("file_ids", [])
        if old_file_ids:
            await db.files.delete_many({"_id": {"$in": [ObjectId(fid) for fid in old_file_ids]}})
        
        # Update presentation with new file
        await db.presentations.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "file_ids": [file_id],
                "date": date,
                "team_id": team_id
            }}
        )
        saved = await presentation_service.get_presentation_by_id(str(existing["_id"]))
    else:
        # Create new presentation
        presentation_data = {
            "team_id": team_id,
            "project_id": project_id,
            "round_number": round_number,
            "date": date,
            "file_ids": [file_id],
            "feedback_ids": [],
            "assigned_panel_ids": assigned_panel_ids.split(",") if assigned_panel_ids else [],
            "created_by": user["_id"]
        }
        inserted_id = await presentation_service.create_presentation(presentation_data)
        saved = await presentation_service.get_presentation_by_id(inserted_id)
    
    return saved

@router.get("/assigned", response_model=list[PresentationOut])
async def get_assigned_presentations(user=Depends(require_user)):
    panel_id = str(user["_id"])
    cursor = db.presentations.find({"assigned_panel_ids": panel_id})
    results = []
    async for pres in cursor:
        pres["id"] = str(pres["_id"])
        del pres["_id"]
        results.append(pres)
    results.sort(key=lambda p: (p.get("round_number", 1), p.get("date", "")))
    return results

@router.get("/all")
async def list_all_presentations(user=Depends(require_user)):
    # Admin-wide list of presentations with light fields
    results = []
    cursor = db.presentations.find({})
    async for pres in cursor:
        pres["id"] = str(pres["_id"])
        del pres["_id"]
        results.append(pres)
    return results


@router.get("/file/{file_id}")
async def download_presentation_file(file_id: str, user=Depends(require_user)):
    file_objectid = safe_objectid(file_id)
    if not file_objectid:
        raise HTTPException(status_code=400, detail="Invalid file ID")
    doc = await db.files.find_one({"_id": file_objectid})
    if not doc:
        raise HTTPException(status_code=404, detail="File not found")
    data: bytes = doc.get("data")
    if not data:
        raise HTTPException(status_code=404, detail="File data missing")
    filename = doc.get("filename", "file")
    content_type = doc.get("content_type", "application/octet-stream")
    return StreamingResponse(iter([data]), media_type=content_type, headers={
        "Content-Disposition": f"attachment; filename={filename}"
    })


@router.get("/public/file/{file_id}")
async def download_presentation_file_public(file_id: str):
    file_objectid = safe_objectid(file_id)
    if not file_objectid:
        raise HTTPException(status_code=400, detail="Invalid file ID")
    doc = await db.files.find_one({"_id": file_objectid})
    if not doc:
        raise HTTPException(status_code=404, detail="File not found")
    data: bytes = doc.get("data")
    if not data:
        raise HTTPException(status_code=404, detail="File data missing")
    filename = doc.get("filename", "file")
    content_type = doc.get("content_type", "application/octet-stream")
    return StreamingResponse(iter([data]), media_type=content_type, headers={
        "Content-Disposition": f"attachment; filename={filename}"
    })


@router.get("/assigned_with_files")
async def get_assigned_presentations_with_files(user=Depends(require_user)):
    panel_id = str(user["_id"])
    cursor = db.presentations.find({"assigned_panel_ids": panel_id})
    results = []
    async for pres in cursor:
        pres_id = str(pres["_id"])
        file_ids = pres.get("file_ids", [])
        files = []
        if file_ids:
            valid_file_ids = safe_objectid_list(file_ids)
            if valid_file_ids:
                fcur = db.files.find({"_id": {"$in": valid_file_ids}})
                async for f in fcur:
                    files.append({
                        "id": str(f["_id"]),
                        "filename": f.get("filename"),
                        "uploaded_at": f.get("uploaded_at"),
                        "content_type": f.get("content_type")
                    })
        results.append({
            "id": pres_id,
            "team_id": pres.get("team_id"),
            "project_id": pres.get("project_id"),
            "round_number": pres.get("round_number"),
            "date": pres.get("date"),
            "status": pres.get("status"),
            "file_list": files,
        })
    results.sort(key=lambda p: (p.get("round_number", 1), p.get("date", "")))
    return results


@router.get("/assigned_full")
async def get_assigned_presentations_full(user=Depends(require_user)):
    panel_id = str(user["_id"])
    cursor = db.presentations.find({"assigned_panel_ids": panel_id})
    results = []
    async for pres in cursor:
        pres_id = str(pres["_id"])
        project_id = pres.get("project_id")
        team_id = pres.get("team_id")
        # Load project and team details
        project_objectid = safe_objectid(project_id) if project_id else None
        team_objectid = safe_objectid(team_id) if team_id else None
        project = await db.projects.find_one({"_id": project_objectid}) if project_objectid else None
        team = await db.teams.find_one({"_id": team_objectid}) if team_objectid else None
        members = []
        if team and team.get("member_ids"):
            member_ids = safe_objectid_list(team["member_ids"])
            if member_ids:
                ucur = db.users.find({"_id": {"$in": member_ids}})
            else:
                ucur = []
            async for u in ucur:
                members.append({"id": str(u["_id"]), "name": u.get("username") or u.get("email")})
        file_ids = pres.get("file_ids", [])
        files = []
        if file_ids:
            valid_file_ids = safe_objectid_list(file_ids)
            if valid_file_ids:
                fcur = db.files.find({"_id": {"$in": valid_file_ids}})
            else:
                fcur = []
            async for f in fcur:
                files.append({
                    "id": str(f["_id"]),
                    "filename": f.get("filename"),
                    "uploaded_at": f.get("uploaded_at"),
                    "content_type": f.get("content_type")
                })
        results.append({
            "id": pres_id,
            "team_id": team_id,
            "project_id": project_id,
            "round_number": pres.get("round_number"),
            "date": pres.get("date"),
            "status": pres.get("status"),
            "project_title": project.get("title") if project else None,
            "team_name": team.get("name") if team else None,
            "team_members": members,
            "file_list": files,
        })
    results.sort(key=lambda p: (p.get("round_number", 1), p.get("date", "")))
    return results

@router.get("/project/{project_id}")
async def get_presentations_by_project(project_id: str, user=Depends(require_user)):
    """Get all presentations for a specific project"""
    presentations = await presentation_service.get_presentations_by_project(project_id)
    return presentations

@router.put("/{presentation_id}")
async def update_presentation_file(
    presentation_id: str,
    file: UploadFile = File(...),
    user=Depends(require_user)
):
    """Update/replace the file for an existing presentation"""
    # Get existing presentation
    presentation = await presentation_service.get_presentation_by_id(presentation_id)
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")
    
    user_id = str(user["_id"])
    user_role = user.get("role", "")
    
    # Admins can update any presentation
    is_authorized = (user_role == "admin")
    
    # Check if user created this presentation
    if not is_authorized and str(presentation.get("created_by")) == user_id:
        is_authorized = True
    
    # Check if user is a member of the team that owns this presentation
    if not is_authorized:
        team_id = presentation.get("team_id")
        if team_id:
            team_objectid = safe_objectid(team_id)
            if team_objectid:
                team = await db.teams.find_one({"_id": team_objectid})
                if team:
                    # Check if user is a member of the team
                    members = team.get("members", [])
                    member_ids = team.get("member_ids", [])
                    # Handle both string and ObjectId formats
                    all_member_ids = [str(m) for m in members] + [str(m) for m in member_ids]
                    if user_id in all_member_ids:
                        is_authorized = True
    
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to update this presentation")
    
    # Save new file
    new_file_id = await presentation_service.save_ppt_file(file, user["_id"])
    
    # Delete old files
    old_file_ids = presentation.get("file_ids", [])
    if old_file_ids:
        await db.files.delete_many({"_id": {"$in": [ObjectId(fid) for fid in old_file_ids]}})
    
    # Update presentation with new file
    updated = await presentation_service.update_presentation(presentation_id, {
        "file_ids": [new_file_id],
        "date": datetime.utcnow().isoformat()
    })
    
    return updated

@router.delete("/{presentation_id}")
async def delete_presentation(presentation_id: str, user=Depends(require_user)):
    """Delete a presentation and its associated files"""
    presentation = await presentation_service.get_presentation_by_id(presentation_id)
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")
    
    user_id = str(user["_id"])
    user_role = user.get("role", "")
    
    # Admins can delete any presentation
    if user_role == "admin":
        result = await presentation_service.delete_presentation(presentation_id)
        return result
    
    # Check if user created this presentation
    if str(presentation.get("created_by")) == user_id:
        result = await presentation_service.delete_presentation(presentation_id)
        return result
    
    # Check if user is a member of the team that owns this presentation
    team_id = presentation.get("team_id")
    if team_id:
        team_objectid = safe_objectid(team_id)
        if team_objectid:
            team = await db.teams.find_one({"_id": team_objectid})
            if team:
                # Check if user is a member of the team
                members = team.get("members", [])
                member_ids = team.get("member_ids", [])
                # Handle both string and ObjectId formats
                all_member_ids = [str(m) for m in members] + [str(m) for m in member_ids]
                if user_id in all_member_ids:
                    result = await presentation_service.delete_presentation(presentation_id)
                    return result
    
    # If none of the above conditions are met, deny access
    raise HTTPException(status_code=403, detail="Not authorized to delete this presentation")