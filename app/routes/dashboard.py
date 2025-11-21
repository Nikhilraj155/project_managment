from fastapi import APIRouter, Depends
from app.core.security import require_user
from app.config.database import db
from collections import Counter
from datetime import datetime, timedelta

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
async def get_dashboard_stats(user=Depends(require_user)):
    """Get dashboard statistics for admin panel"""
    
    # Count total students
    total_students = await db.users.count_documents({"role": "student"})
    
    # Count total mentors
    total_mentors = await db.users.count_documents({"role": {"$in": ["mentor", "panel"]}})
    
    # Count total teams
    total_teams = await db.teams.count_documents({})
    
    # Count total projects
    total_projects = await db.projects.count_documents({})
    
    # Get projects per department (assuming projects have a department field or extract from description)
    projects = []
    async for p in db.projects.find({}):
        projects.append(p)
    
    # Extract department from project title/description or use a default
    # For now, we'll categorize based on common keywords or use a default field
    department_counts = {
        "Computer Science": 0,
        "Mechanical": 0,
        "Electrical": 0,
        "Civil": 0
    }
    
    # Try to categorize projects by title keywords
    for project in projects:
        title = (project.get("title", "") + " " + project.get("description", "")).lower()
        if any(word in title for word in ["computer", "software", "ai", "ml", "data", "algorithm"]):
            department_counts["Computer Science"] += 1
        elif any(word in title for word in ["mechanical", "mech", "engine", "machine"]):
            department_counts["Mechanical"] += 1
        elif any(word in title for word in ["electrical", "circuit", "power", "electronics"]):
            department_counts["Electrical"] += 1
        elif any(word in title for word in ["civil", "construction", "structure"]):
            department_counts["Civil"] += 1
        else:
            # Default to Computer Science if no match
            department_counts["Computer Science"] += 1
    
    # Get project status distribution
    # Map various status values to our three categories
    all_projects = []
    async for p in db.projects.find({}):
        all_projects.append(p.get("status", "active"))
    
    status_counts = {
        "Ongoing": 0,
        "Pending": 0,
        "Completed": 0
    }
    
    for status in all_projects:
        status_lower = (status or "").lower()
        if status_lower in ["completed", "finished", "done"]:
            status_counts["Completed"] += 1
        elif status_lower in ["pending", "waiting", "not_started"]:
            status_counts["Pending"] += 1
        else:  # active, in_progress, ongoing, etc.
            status_counts["Ongoing"] += 1
    
    # Get upcoming events (presentations and deadlines)
    upcoming_events = []
    async for pres in db.presentations.find({}).sort("date", 1).limit(5):
        pres_date = pres.get("date")
        if pres_date:
            upcoming_events.append({
                "event": f"Presentation Round {pres.get('round_number', 1)}",
                "date": pres_date
            })
    
    # Active users in last 24h
    twenty_four_hours_ago = (datetime.utcnow() - timedelta(hours=24)).isoformat()
    active_students = await db.users.count_documents({"role": "student", "last_login": {"$gte": twenty_four_hours_ago}})
    active_mentors = await db.users.count_documents({"role": {"$in": ["mentor", "panel"]}, "last_login": {"$gte": twenty_four_hours_ago}})

    return {
        "summary": {
            "total_students": total_students,
            "total_mentors": total_mentors,
            "total_teams": total_teams,
            "total_projects": total_projects,
            "active_students_24h": active_students,
            "active_mentors_24h": active_mentors
        },
        "projects_per_department": department_counts,
        "project_status": status_counts,
        "upcoming_events": upcoming_events[:5]  # Limit to 5 events
    }

