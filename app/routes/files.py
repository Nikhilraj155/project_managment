from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from fastapi.responses import StreamingResponse
from app.core.security import require_user
from app.services import file_service

router = APIRouter(prefix="/files", tags=["Files"])


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    project_id: str = Form(None),
    user=Depends(require_user)
):
    saved_file = await file_service.save_file(file, user["_id"], project_id)
    return saved_file

@router.get("/project/{project_id}")
async def get_files_by_project(project_id: str, user=Depends(require_user)):
    """Get all files for a specific project"""
    files = await file_service.get_files_by_project(project_id)
    return files

@router.put("/{file_id}")
async def update_file(
    file_id: str,
    file: UploadFile = File(...),
    user=Depends(require_user)
):
    """Update/replace an existing file"""
    user_id = str(user["_id"])
    user_role = user.get("role", "student")
    updated_file = await file_service.update_file(file_id, file, user_id, user_role)
    return updated_file

@router.delete("/{file_id}")
async def delete_file(file_id: str, user=Depends(require_user)):
    """Delete a file"""
    user_id = str(user["_id"])
    user_role = user.get("role", "student")
    result = await file_service.delete_file(file_id, user_id, user_role)
    return result


@router.get("/{file_id}")
async def download_file(file_id: str, user=Depends(require_user)):
    # Fetch file metadata
    file_data = await file_service.get_file_by_id(file_id)
    if not file_data:
        raise HTTPException(status_code=404, detail="File not found")

    # Get GridFS ID
    gridfs_id = file_data.get("gridfs_id")
    if not gridfs_id:
        raise HTTPException(status_code=400, detail="Invalid file metadata")

    # Stream file
    file_stream = await file_service.get_file_stream(gridfs_id)
    if not file_stream:
        raise HTTPException(status_code=404, detail="File content not found")

    # Return streaming response
    return StreamingResponse(
        file_stream,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={file_data['filename']}"}
    )
