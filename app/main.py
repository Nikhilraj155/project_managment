from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder as _original_jsonable_encoder

from app.routes import auth, users, teams, projects, tasks, feedback, presentations, notifications, files, student_feedback, project_ideas, round_schedules, dashboard, announcements, reports, csv_uploads
from app.config.database import check_db_connection, users_collection
from app.services.auth_service import hash_password
from app.core.json_encoder import jsonable_encoder
from datetime import datetime
import os

# Override FastAPI's default jsonable_encoder with our custom one
import fastapi.encoders
fastapi.encoders.jsonable_encoder = jsonable_encoder

app = FastAPI(
    title="Project Management System",
    redirect_slashes=False  # Disable automatic trailing slash redirects
)

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite default frontend
        "http://127.0.0.1:5173"   # Alternative localhost
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.[0-9]+\.[0-9]+)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": await check_db_connection()}

@app.get("/")
async def root():
    return {"message": "Project Management System API is running"}

# Public routes
app.include_router(auth.router)
app.include_router(users.router)

# Protected routes (these import require_user dependency)
app.include_router(teams.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(feedback.router)
app.include_router(presentations.router)
app.include_router(student_feedback.router)
app.include_router(project_ideas.router)
app.include_router(project_ideas.public_router)
app.include_router(notifications.router)
app.include_router(files.router)
app.include_router(round_schedules.router)
app.include_router(dashboard.router)
app.include_router(announcements.router)
app.include_router(reports.router)
app.include_router(csv_uploads.router)


# -------------------------------------------------------------
# Create a default admin user on startup (if none exists)
# Configure with env vars: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME
# -------------------------------------------------------------
@app.on_event("startup")
async def ensure_default_admin():
    try:
        admin_exists = await users_collection.find_one({"role": "admin"})
        if admin_exists:
            return

        email = os.getenv("ADMIN_EMAIL", "admin@example.com")
        username = os.getenv("ADMIN_USERNAME", "admin")
        password = os.getenv("ADMIN_PASSWORD", "123456789")

        # Avoid duplicate by email
        by_email = await users_collection.find_one({"email": email})
        if by_email and by_email.get("role") != "admin":
            # Promote this account to admin if email already exists
            await users_collection.update_one({"_id": by_email["_id"]}, {"$set": {"role": "admin"}})
            print(f"Promoted existing user {email} to admin role")
            return

        if not by_email:
            await users_collection.insert_one({
                "username": username,
                "email": email,
                "password": hash_password(password),
                "role": "admin",
                "created_at": datetime.utcnow().isoformat()
            })
            print(f"Default admin created: {email}")
    except Exception as e:
        # Startup should not crash if this fails; just log
        print("ensure_default_admin error:", e)
