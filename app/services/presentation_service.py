from bson import ObjectId
from fastapi import UploadFile, HTTPException
from datetime import datetime
from app.config.database import db


# --------------------------------------------------------
# 🧩 1️⃣ Create a new presentation document
# --------------------------------------------------------
async def create_presentation(presentation_data: dict):
    result = await db.presentations.insert_one(presentation_data)
    return str(result.inserted_id)


# --------------------------------------------------------
# 🧩 2️⃣ Get a presentation by ID (convert _id → id)
# --------------------------------------------------------
async def get_presentation_by_id(presentation_id: str):
    presentation = await db.presentations.find_one({"_id": ObjectId(presentation_id)})
    if presentation:
        presentation["id"] = str(presentation["_id"])
        del presentation["_id"]
    return presentation


# --------------------------------------------------------
# 🧩 3️⃣ Get all presentations by user ID
# --------------------------------------------------------
async def get_presentations_by_user(user_id: str):
    presentations = []
    cursor = db.presentations.find({"created_by": user_id})
    async for p in cursor:
        p["id"] = str(p["_id"])
        del p["_id"]
        presentations.append(p)
    return presentations


# --------------------------------------------------------
# 🧩 4️⃣ Save PPT file directly into MongoDB
# --------------------------------------------------------
async def save_ppt_file(file: UploadFile, user_id: str):
    # Allow multiple document types for rounds
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["ppt", "pptx", "pdf", "doc", "docx"]:
        raise HTTPException(status_code=400, detail="Unsupported file type. Allowed: ppt, pptx, pdf, doc, docx")

    # Read binary data
    file_data = await file.read()

    # Prepare Mongo document
    file_doc = {
        "filename": file.filename,
        "content_type": file.content_type,
        "data": file_data,           # binary PPT data stored in Mongo
        "uploaded_by": user_id,
        "uploaded_at": datetime.utcnow().isoformat()
    }

    # Insert file record into MongoDB
    result = await db.files.insert_one(file_doc)
    return str(result.inserted_id)


# --------------------------------------------------------
# 🧩 5️⃣ Fetch presentation + files (optional helper)
# --------------------------------------------------------
async def get_presentation_with_files(presentation_id: str):
    presentation = await get_presentation_by_id(presentation_id)
    if not presentation:
        return None

    file_ids = presentation.get("file_ids", [])
    files = []
    if file_ids:
        cursor = db.files.find({"_id": {"$in": [ObjectId(fid) for fid in file_ids]}})
        async for f in cursor:
            f["id"] = str(f["_id"])
            del f["_id"]
            files.append(f)

    presentation["files"] = files
    return presentation


# --------------------------------------------------------
# 🧩 6️⃣ Get presentations by project_id
# --------------------------------------------------------
async def get_presentations_by_project(project_id: str):
    presentations = []
    cursor = db.presentations.find({"project_id": project_id}).sort("round_number", 1)
    async for p in cursor:
        p["id"] = str(p["_id"])
        del p["_id"]
        # Get file details
        file_ids = p.get("file_ids", [])
        files = []
        if file_ids:
            fcur = db.files.find({"_id": {"$in": [ObjectId(fid) for fid in file_ids]}})
            async for f in fcur:
                files.append({
                    "id": str(f["_id"]),
                    "filename": f.get("filename"),
                    "uploaded_at": f.get("uploaded_at"),
                    "content_type": f.get("content_type")
                })
        p["file_list"] = files
        presentations.append(p)
    return presentations


# --------------------------------------------------------
# 🧩 7️⃣ Update presentation (replace file)
# --------------------------------------------------------
async def update_presentation(presentation_id: str, update_data: dict):
    await db.presentations.update_one({"_id": ObjectId(presentation_id)}, {"$set": update_data})
    return await get_presentation_by_id(presentation_id)


# --------------------------------------------------------
# 🧩 8️⃣ Delete presentation
# --------------------------------------------------------
async def delete_presentation(presentation_id: str):
    presentation = await get_presentation_by_id(presentation_id)
    if presentation:
        # Optionally delete associated files
        file_ids = presentation.get("file_ids", [])
        if file_ids:
            await db.files.delete_many({"_id": {"$in": [ObjectId(fid) for fid in file_ids]}})
        await db.presentations.delete_one({"_id": ObjectId(presentation_id)})
    return {"deleted": True}