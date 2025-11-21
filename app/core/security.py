# app/core/security.py
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from bson import ObjectId
from app.config.database import SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES, users_collection

ALGORITHM = "HS256"
bearer = HTTPBearer(auto_error=True)

# ---- Token generation ----
def create_access_token(
    claims: Dict[str, Any],
    expires_in_minutes: Optional[int] = None,
) -> str:
    exp = datetime.utcnow() + timedelta(minutes=expires_in_minutes or ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {**claims, "exp": exp}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ---- Token verification (presence + signature + expiry) ----
def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# ---- Dependency: enforce Authorization: Bearer <token> and return user ----
async def require_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid auth scheme")
    claims = decode_token(credentials.credentials)
    user_id = claims.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user  # attach full user doc to route

# Add role-based requirements:
async def require_role(role: str, user=Depends(require_user)):
    if user.get("role") != role:
        raise HTTPException(status_code=403, detail=f"Access denied for role: {user.get('role')}")
    return user