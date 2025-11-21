# app/core/dependencies.py
from fastapi import Depends, HTTPException, status
from jose import JWTError, jwt
from app.config.database import users_collection
from app.core.security import require_role
# Single source of truth: reuse the security implementation
from app.core.security import get_current_user
__all__ = ["get_current_user"]


# Utility to get user from JWT
async def get_current_user(token: str = Depends(lambda: None)):
    from fastapi.security import OAuth2PasswordBearer
    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

    token = await oauth2_scheme()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = await users_collection.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user

# Dependency example for role-based auth
def role_required(role: str):
    async def dependency(user=Depends(require_role)):
        if user.get("role") != role:
            raise HTTPException(status_code=403, detail="Forbidden: role required")
        return user
    return Depends(dependency)