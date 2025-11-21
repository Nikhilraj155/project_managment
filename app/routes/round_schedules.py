from fastapi import APIRouter, Depends
from app.core.security import require_user
from app.schemas.round_schedule import RoundScheduleUpsert, RoundScheduleOut
from app.services import round_schedule_service


router = APIRouter(prefix="/round-schedules", tags=["Round Schedules"])


@router.post("/", response_model=RoundScheduleOut)
async def upsert_round_schedule(payload: RoundScheduleUpsert, user=Depends(require_user)):
    sid = await round_schedule_service.upsert(payload.dict())
    saved = await round_schedule_service.get_by_project(payload.project_id)
    return saved


@router.get("/project/{project_id}", response_model=RoundScheduleOut | None)
async def get_round_schedule(project_id: str, user=Depends(require_user)):
    return await round_schedule_service.get_by_project(project_id)

