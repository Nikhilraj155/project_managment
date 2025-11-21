from fastapi import HTTPException

def check_role(user, allowed_roles):
    if user.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail="Permission denied")
    return True

def is_team_member(user, team):
    if user["id"] not in team["members"]:
        raise HTTPException(status_code=403, detail="Not a team member")
    return True

def is_mentor(user, team):
    if user["id"] != team["mentor_id"]:
        raise HTTPException(status_code=403, detail="Not a mentor")
    return True

def is_panel(user):
    if user.get("role") != "panel":
        raise HTTPException(status_code=403, detail="Panel access only")
    return True
