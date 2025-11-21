from fastapi import APIRouter, HTTPException, Depends
from app.services import user_service
# from app.core.security import require_user  # Uncomment to protect with token if needed

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/")
async def list_users(role: str | None = None):
    # If you want to protect this, add: user = Depends(require_user)
    if role:
        return await user_service.list_users_by_role(role)
    return await user_service.list_users()

@router.get("/{user_id}")
async def get_user(user_id: str):
    user = await user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": str(user["_id"]), "username": user["username"], "email": user["email"]}

@router.get("/by-email/{email}")
async def get_user_by_email(email: str):
    user = await user_service.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": str(user["_id"]), "username": user["username"], "email": user["email"]}

@router.put("/{user_id}/assign-mentor")
async def assign_mentor_to_user(user_id: str, mentor_id: str):
    updated = await user_service.assign_mentor(user_id, mentor_id)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return {"updated": True}
