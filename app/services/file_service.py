import os
from fastapi import UploadFile, HTTPException
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from app.config.database import db
from bson import ObjectId
from datetime import datetime

bucket = AsyncIOMotorGridFSBucket(db, bucket_name="files")
ALLOWED_EXTENSIONS = {".pdf", ".ppt", ".pptx", ".doc", ".docx"}


async def save_file(file: UploadFile, uploader_id: str, project_id: str = None):
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    upload_stream = bucket.open_upload_stream(
        filename,
        metadata={"uploader_id": uploader_id, "upload_date": datetime.utcnow()},
    )

    content = await file.read()
    await upload_stream.write(content)
    await upload_stream.close()

    file_doc = {
        "filename": filename,
        "uploader_id": uploader_id,
        "upload_date": datetime.utcnow(),
        "url": f"/files/{str(upload_stream._id)}",
        "version": 1,
        "gridfs_id": str(upload_stream._id),
        "project_id": project_id,
    }

    result = await db.files.insert_one(file_doc)
    file_doc["_id"] = str(result.inserted_id)
    file_doc["id"] = str(result.inserted_id)
    # Convert datetime to ISO string for JSON serialization
    if "upload_date" in file_doc and hasattr(file_doc["upload_date"], "isoformat"):
        file_doc["upload_date"] = file_doc["upload_date"].isoformat()
    file_doc = {k: str(v) if isinstance(v, ObjectId) else v for k, v in file_doc.items()}

    return file_doc


async def get_file_by_id(file_id: str):
    file_doc = await db.files.find_one({"_id": ObjectId(file_id)})
    if not file_doc:
        return None
    file_doc["id"] = str(file_doc["_id"])
    del file_doc["_id"]
    # Convert datetime to ISO string if needed
    if "upload_date" in file_doc and hasattr(file_doc["upload_date"], "isoformat"):
        file_doc["upload_date"] = file_doc["upload_date"].isoformat()
    file_doc = {k: str(v) if isinstance(v, ObjectId) else v for k, v in file_doc.items()}
    return file_doc


# ✅ This function was missing in your local copy
async def get_file_stream(gridfs_id: str):
    """
    Returns an AsyncIOMotorGridOut stream from GridFS by the stored gridfs_id.
    """
    try:
        grid_out = await bucket.open_download_stream(ObjectId(gridfs_id))
        return grid_out
    except Exception:
        return None

async def get_files_by_project(project_id: str):
    """Get all files for a specific project"""
    files = []
    cursor = db.files.find({"project_id": project_id}).sort("upload_date", -1)
    async for f in cursor:
        f["id"] = str(f["_id"])
        del f["_id"]
        # Convert datetime to ISO string if needed
        if "upload_date" in f and hasattr(f["upload_date"], "isoformat"):
            f["upload_date"] = f["upload_date"].isoformat()
        files.append(f)
    return files

async def update_file(file_id: str, file: UploadFile, uploader_id: str):
    """Update/replace an existing file"""
    # Get existing file
    existing = await get_file_by_id(file_id)
    if not existing:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check if user is the uploader
    if existing.get("uploader_id") != uploader_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this file")
    
    # Delete old GridFS file
    old_gridfs_id = existing.get("gridfs_id")
    if old_gridfs_id:
        try:
            await bucket.delete(ObjectId(old_gridfs_id))
        except Exception:
            pass
    
    # Save new file
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
    
    upload_stream = bucket.open_upload_stream(
        filename,
        metadata={"uploader_id": uploader_id, "upload_date": datetime.utcnow()},
    )
    
    content = await file.read()
    await upload_stream.write(content)
    await upload_stream.close()
    
    # Update file document
    await db.files.update_one(
        {"_id": ObjectId(file_id)},
        {"$set": {
            "filename": filename,
            "gridfs_id": str(upload_stream._id),
            "url": f"/files/{str(upload_stream._id)}",
            "upload_date": datetime.utcnow(),
            "version": existing.get("version", 1) + 1
        }}
    )
    
    return await get_file_by_id(file_id)

async def delete_file(file_id: str, uploader_id: str):
    """Delete a file"""
    file_doc = await get_file_by_id(file_id)
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check if user is the uploader
    if file_doc.get("uploader_id") != uploader_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this file")
    
    # Delete GridFS file
    gridfs_id = file_doc.get("gridfs_id")
    if gridfs_id:
        try:
            await bucket.delete(ObjectId(gridfs_id))
        except Exception:
            pass
    
    # Delete file document
    await db.files.delete_one({"_id": ObjectId(file_id)})
    return {"deleted": True}
