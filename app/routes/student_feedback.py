from fastapi import APIRouter, Depends
from app.core.security import require_user
from app.schemas.student_feedback import StudentFeedbackCreate, StudentFeedbackOut
from app.services import student_feedback_service


router = APIRouter(prefix="/student-feedback", tags=["Student Feedback"])


@router.post("/", response_model=StudentFeedbackOut)
async def submit_student_feedback(payload: StudentFeedbackCreate, user=Depends(require_user)):
    inserted_id = await student_feedback_service.create_student_feedback(payload.dict())
    saved = await student_feedback_service.get_by_id(inserted_id)
    return saved


@router.get("/all", response_model=list[StudentFeedbackOut])
async def list_all_student_feedback(user=Depends(require_user)):
    return await student_feedback_service.list_all()


@router.get("/project/{project_id}", response_model=list[StudentFeedbackOut])
async def list_project_student_feedback(project_id: str, user=Depends(require_user)):
    return await student_feedback_service.list_for_project(project_id)


