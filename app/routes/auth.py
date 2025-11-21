from fastapi import APIRouter, HTTPException
from app.models.user import UserCreate, LoginInput, UserOut
from app.services.auth_service import hash_password, verify_password
from app.core.security import create_access_token
from app.config.database import users_collection, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut)
async def register(user: UserCreate):
    existing = await users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    doc = user.dict()
    doc["password"] = hash_password(user.password)
    inserted = await users_collection.insert_one(doc)
    return UserOut(id=str(inserted.inserted_id), username=user.username, email=user.email, role=user.role)

@router.post("/login")
async def login(user: LoginInput):
    db_user = await users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    # Update last_login timestamp
    try:
        from datetime import datetime
        await users_collection.update_one({"_id": db_user["_id"]}, {"$set": {"last_login": datetime.utcnow().isoformat()}})
    except Exception:
        pass
    token = create_access_token(
        {"user_id": str(db_user["_id"]), "sub": db_user["email"], "role": db_user["role"]},
        expires_in_minutes=ACCESS_TOKEN_EXPIRE_MINUTES,
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": db_user["role"]  # <--- Add this
    }


