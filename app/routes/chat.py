from fastapi import APIRouter, Depends, HTTPException
from app.models.chat import ChatMessageCreate, ChatMessageOut
from app.core.security import require_user
from app.services import chat_service, user_service, team_service
from app.config.database import db
from bson import ObjectId
from bson.errors import InvalidId

router = APIRouter(prefix="/chat", tags=["Chat"])

def is_valid_objectid(id_str: str) -> bool:
    """Check if a string is a valid ObjectId"""
    if not id_str or not isinstance(id_str, str):
        return False
    try:
        ObjectId(id_str)
        return True
    except (InvalidId, Exception):
        return False

async def safe_get_user(user_id: str):
    """Safely get user by ID, returns None if invalid"""
    if not is_valid_objectid(user_id):
        return None
    try:
        return await user_service.get_user_by_id(user_id)
    except Exception:
        return None

@router.post("/", response_model=ChatMessageOut)
async def send_message(message: ChatMessageCreate, user=Depends(require_user)):
    message_data = message.dict()
    user_id = str(user["_id"])
    user_role = user.get("role", "")
    
    # If this is a mentor-student message, automatically set mentor_id/student_id
    if not message_data.get("team_id") and (message_data.get("mentor_id") or message_data.get("student_id")):
        # This is a mentor-student message
        if user_role in ["mentor", "faculty"]:
            # Mentor sending to student
            message_data["mentor_id"] = user_id
            if not message_data.get("student_id"):
                # If student_id not provided, we need to get it from the request
                # For now, we'll require it in the request
                pass
        elif user_role == "student":
            # Student sending to mentor
            message_data["student_id"] = user_id
            # Get mentor_id from student's team or user record
            if not message_data.get("mentor_id"):
                # Try to get from user's mentor_id field
                user_doc = await user_service.get_user_by_id(user_id)
                if user_doc and user_doc.get("mentor_id"):
                    message_data["mentor_id"] = user_doc["mentor_id"]
                else:
                    # Try to get from team
                    teams = await team_service.get_teams()
                    for team in teams:
                        if user_id in team.get("members", []):
                            if team.get("mentor_id"):
                                message_data["mentor_id"] = team["mentor_id"]
                                break
    
    # Get sender name
    sender = await safe_get_user(message_data["sender_id"])
    if sender:
        message_data["sender_name"] = sender.get("username", "Unknown")
    
    inserted_id = await chat_service.send_message(message_data)
    saved = await chat_service.get_message_by_id(inserted_id)
    
    # Add sender name to response
    if sender:
        saved["sender_name"] = sender.get("username", "Unknown")
    
    return saved

@router.get("/mentor", response_model=list[ChatMessageOut])
async def get_mentor_communication(user=Depends(require_user)):
    """Get all messages between mentor and their assigned students"""
    user_id = str(user["_id"])
    user_role = user.get("role", "")
    
    if user_role not in ["mentor", "faculty"]:
        return []
    
    messages = await chat_service.get_mentor_student_messages(user_id)
    formatted_messages = []
    for msg in messages:
        # Get sender name
        sender_name = "Unknown"
        if msg.get("sender_id"):
            sender = await safe_get_user(msg["sender_id"])
            if sender:
                sender_name = sender.get("username", "Unknown")
        
        formatted_msg = {
            "id": msg.get("id", str(msg.get("_id", ""))),
            "team_id": msg.get("team_id"),
            "sender_id": msg.get("sender_id", ""),
            "content": msg.get("content", msg.get("message", "")),
            "timestamp": msg.get("timestamp", msg.get("created_at")),
            "mentor_id": msg.get("mentor_id"),
            "student_id": msg.get("student_id"),
            "sender_name": sender_name
        }
        formatted_messages.append(formatted_msg)
    return formatted_messages

@router.get("/student", response_model=list[ChatMessageOut])
async def get_student_communication(user=Depends(require_user)):
    """Get all messages between student and their assigned mentor"""
    user_id = str(user["_id"])
    user_role = user.get("role", "")
    
    if user_role != "student":
        return []
    
    messages = await chat_service.get_student_mentor_messages(user_id)
    formatted_messages = []
    for msg in messages:
        # Get sender name
        sender_name = "Unknown"
        if msg.get("sender_id"):
            sender = await safe_get_user(msg["sender_id"])
            if sender:
                sender_name = sender.get("username", "Unknown")
        
        formatted_msg = {
            "id": msg.get("id", str(msg.get("_id", ""))),
            "team_id": msg.get("team_id"),
            "sender_id": msg.get("sender_id", ""),
            "content": msg.get("content", msg.get("message", "")),
            "timestamp": msg.get("timestamp", msg.get("created_at")),
            "mentor_id": msg.get("mentor_id"),
            "student_id": msg.get("student_id"),
            "sender_name": sender_name
        }
        formatted_messages.append(formatted_msg)
    return formatted_messages

@router.get("/team/{team_id}", response_model=list[ChatMessageOut])
async def get_team_chat(team_id: str, user=Depends(require_user)):
    # Validate team_id is a valid ObjectId
    if not is_valid_objectid(team_id):
        raise HTTPException(status_code=400, detail="Invalid team_id format")
    
    messages = await chat_service.get_messages(team_id)
    # Ensure all messages are properly formatted
    formatted_messages = []
    for msg in messages:
        # Get sender name - safely handle invalid sender_ids
        sender_name = "Unknown"
        sender_id = msg.get("sender_id")
        if sender_id:
            sender = await safe_get_user(sender_id)
            if sender:
                sender_name = sender.get("username", "Unknown")
        
        formatted_msg = {
            "id": msg.get("id", str(msg.get("_id", ""))),
            "team_id": msg.get("team_id"),
            "sender_id": msg.get("sender_id", ""),
            "content": msg.get("content", msg.get("message", "")),
            "timestamp": msg.get("timestamp", msg.get("created_at")),
            "sender_name": sender_name
        }
        formatted_messages.append(formatted_msg)
    return formatted_messages

# Keep the old endpoint for backward compatibility - but validate team_id
@router.get("/{team_id}", response_model=list[ChatMessageOut])
async def get_team_chat_old(team_id: str, user=Depends(require_user)):
    # Validate that this is not a reserved path
    if team_id in ["mentor", "student", "team"]:
        raise HTTPException(status_code=404, detail="Not found")
    
    # Validate team_id is a valid ObjectId
    if not is_valid_objectid(team_id):
        raise HTTPException(status_code=400, detail="Invalid team_id format")
    
    return await get_team_chat(team_id, user)
