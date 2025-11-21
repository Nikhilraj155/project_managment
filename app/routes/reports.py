from fastapi import APIRouter, Depends
from app.core.security import require_user
from app.core.mongodb_utils import safe_objectid, safe_objectid_list
from app.config.database import db

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/summary")
async def reports_summary(user=Depends(require_user)):
    # Totals
    total_students = await db.users.count_documents({"role": "student"})
    total_mentors = await db.users.count_documents({"role": {"$in": ["mentor", "panel"]}})
    total_teams = await db.teams.count_documents({})
    total_projects = await db.projects.count_documents({})

    # Per-mentor team counts
    mentor_team_counts: dict[str, int] = {}
    async for t in db.teams.find({}):
        mentor_id = t.get("mentor_id")
        if not mentor_id:
            continue
        # Normalize mentor_id to string for consistent dictionary keys
        mentor_id_str = str(mentor_id) if mentor_id else None
        if mentor_id_str:
            mentor_team_counts[mentor_id_str] = mentor_team_counts.get(mentor_id_str, 0) + 1

    mentors = {}
    if mentor_team_counts:
        # Safely convert mentor IDs to ObjectIds, filtering out invalid ones
        valid_mentor_objectids = safe_objectid_list(list(mentor_team_counts.keys()))
        if valid_mentor_objectids:
            cursor = db.users.find({"_id": {"$in": valid_mentor_objectids}})
            async for u in cursor:
                mentors[str(u["_id"])] = u.get("username", u.get("email", ""))

    per_mentor = [
        {"mentor_id": m, "mentor_name": mentors.get(m, m), "teams": c}
        for m, c in mentor_team_counts.items()
    ]

    # Project status counts
    status_counts = {"pending": 0, "active": 0, "completed": 0}
    async for p in db.projects.find({}):
        s = (p.get("status", "active") or "").lower()
        if s in status_counts:
            status_counts[s] += 1
        else:
            status_counts["active"] += 1

    return {
        "totals": {
            "students": total_students,
            "mentors": total_mentors,
            "teams": total_teams,
            "projects": total_projects
        },
        "per_mentor": per_mentor,
        "project_status": status_counts
    }


