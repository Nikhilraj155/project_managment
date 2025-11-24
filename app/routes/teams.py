from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.models.team import TeamCreate, TeamOut
from app.core.security import require_user
from app.services import team_service, email_service
from app.config.database import db  # only for filtered list; you can move this into service if preferred

router = APIRouter(prefix="/teams", tags=["Teams"])

def to_team_out(doc: dict) -> TeamOut:
    return TeamOut(
        id=str(doc["_id"]),
        name=doc["name"],
        mentor_id=doc.get("mentor_id"),
        members=doc.get("members", []),
        project_id=doc.get("project_id"),
        description=doc.get("description"),
        created_at=doc.get("created_at"),
    )

@router.post("/", response_model=TeamOut)
async def create_team(team: TeamCreate, user=Depends(require_user)):
    doc = team.dict()
    doc["created_by"] = str(user["_id"])
    inserted_id = await team_service.create_team(doc)
    saved = await team_service.get_team_by_id(inserted_id)
    return to_team_out(saved)

@router.get("/", response_model=list[TeamOut])
async def list_teams(user=Depends(require_user)):
    out: list[TeamOut] = []
    user_id = str(user["_id"])
    user_role = user.get("role", "")
    
    # Admins can view all teams
    if user_role == "admin":
        query = {}
    elif user_role in ["mentor", "faculty"]:
        # Mentors see teams they created, are members of, OR are assigned as mentor
        query = {
            "$or": [
                {"created_by": user_id},
                {"members": user_id},
                {"mentor_id": user_id}
            ]
        }
    else:
        # Users see teams they created OR teams they are members of
        query = {
            "$or": [
                {"created_by": user_id},
                {"members": user_id}
            ]
        }
    
    cursor = db.teams.find(query)
    async for t in cursor:
        out.append(to_team_out(t))
    return out

@router.get("/{team_id}", response_model=TeamOut)
async def get_team(team_id: str, user=Depends(require_user)):
    doc = await team_service.get_team_by_id(team_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Team not found")
    
    user_id = str(user["_id"])
    user_role = user.get("role", "")
    
    # Admins can access any team
    # Users can access if they created it or are a member
    if user_role != "admin":
        if doc.get("created_by") != user_id and user_id not in doc.get("members", []):
            raise HTTPException(status_code=403, detail="Access denied")
    
    return to_team_out(doc)

@router.put("/{team_id}", response_model=TeamOut)
async def update_team(team_id: str, team: TeamCreate, user=Depends(require_user)):
    existing = await team_service.get_team_by_id(team_id)
    if not existing or existing.get("created_by") != str(user["_id"]):
        raise HTTPException(status_code=404, detail="Team not found")
    updated = await team_service.update_team(team_id, team.dict())
    return to_team_out(updated)

@router.delete("/{team_id}")
async def delete_team(team_id: str, user=Depends(require_user)):
    existing = await team_service.get_team_by_id(team_id)
    if not existing or existing.get("created_by") != str(user["_id"]):
        raise HTTPException(status_code=404, detail="Team not found")
    await team_service.delete_team(team_id)
    return {"deleted": True}

@router.put("/{team_id}/assign-mentor")
async def assign_mentor(team_id: str, mentor_id: str, user=Depends(require_user)):
    existing = await team_service.get_team_by_id(team_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Team not found")
    updated = await team_service.update_team(team_id, {"mentor_id": mentor_id})
    return {"updated": True, "team": to_team_out(updated)}

@router.post("/{team_id}/invite-member")
async def invite_member(team_id: str, invite_data: dict, user=Depends(require_user)):
    """
    Invite a member to join the team via email.

    Request body should contain:
    - email: The email address of the person to invite

    Returns:
    - success: Boolean indicating if invitation was sent successfully
    - message: Success or error message
    """
    email = invite_data.get("email")

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    # Validate email format (basic validation)
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Invalid email format")

    # Validate team_id is a valid ObjectId
    try:
        ObjectId(team_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid team ID format")

    # Check if user exists with this email
    existing_user = await email_service.check_user_exists(email)

    # Get team details
    team = await team_service.get_team_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Check if user has permission to invite (must be team creator)
    if team.get("created_by") != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Only team creator can invite members")

    # Check team size limit (max 4 members)
    current_members = team.get("members", [])
    if len(current_members) >= 4:
        raise HTTPException(status_code=400, detail="Team is already at maximum capacity (4 members)")

    # Prevent inviting existing team members
    if existing_user and str(existing_user["_id"]) in current_members:
        raise HTTPException(status_code=400, detail="User is already a member of this team")

    # Get inviter's name
    inviter_name = user.get("username", user.get("email", "A team member"))

    # Send invitation email
    success = await email_service.send_team_invitation_email(
        team_id=team_id,
        team_name=team.get("name", "Unnamed Team"),
        invitee_email=email,
        inviter_name=inviter_name
    )

    if success:
        return {
            "success": True,
            "message": f"Invitation sent successfully to {email}",
            "user_exists": existing_user is not None
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to send invitation email")