from fastapi import APIRouter, Depends, HTTPException
from app.models.feedback import FeedbackCreate, FeedbackOut
from app.core.security import require_user
from app.services import feedback_service
from app.services import presentation_service

router = APIRouter(prefix="/feedback", tags=["Feedback"])

@router.post("/", response_model=FeedbackOut)
async def submit_feedback(feedback: FeedbackCreate, user=Depends(require_user)):
    payload = feedback.dict()
    if not payload.get("evaluator_id"):
        payload["evaluator_id"] = str(user["_id"])
    inserted_id = await feedback_service.submit_feedback(payload)
    saved = await feedback_service.get_feedback_by_id(inserted_id)
    return saved

@router.get("/{team_id}", response_model=list[FeedbackOut])
async def view_feedback(team_id: str, user=Depends(require_user)):
    return await feedback_service.get_feedback_by_team(team_id)


@router.post("/evaluate", response_model=FeedbackOut)
async def evaluate_presentation(
    presentation_id: str,
    technical_implementation: int,
    presentation_clarity: int,
    problem_solving: int,
    overall_impression: int,
    comments: str | None = None,
    user=Depends(require_user)
):
    pres = await presentation_service.get_presentation_by_id(presentation_id)
    if not pres:
        raise HTTPException(status_code=404, detail="Presentation not found")
    score = technical_implementation + presentation_clarity + problem_solving + overall_impression
    doc = {
        "team_id": pres.get("team_id"),
        "project_id": pres.get("project_id"),
        "round_number": pres.get("round_number"),
        "evaluator_id": str(user["_id"]),
        "score": score,
        "comments": comments,
    }
    inserted_id = await feedback_service.submit_feedback(doc)
    saved = await feedback_service.get_feedback_by_id(inserted_id)
    return saved
