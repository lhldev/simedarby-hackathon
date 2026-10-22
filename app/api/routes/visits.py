from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db import repository
from app.schemas import VisitRead
from app.services.computation import generate_visit_signature

router = APIRouter(tags=["visits"])

MAX_USER_AGENT_LENGTH = 256


@router.post("/api/v1/visits", response_model=VisitRead, status_code=201)
def log_visit(request: Request, db: Session = Depends(get_db)) -> VisitRead:
    user_agent = request.headers.get("user-agent", "")[:MAX_USER_AGENT_LENGTH]
    timestamp = datetime.now(UTC)
    signature = generate_visit_signature(timestamp.isoformat(), user_agent)
    visit = repository.create_visit(
        db, timestamp=timestamp, user_agent=user_agent, rust_signature=signature
    )
    return VisitRead.model_validate(visit)


@router.get("/api/v1/visits", response_model=list[VisitRead])
def list_visits(db: Session = Depends(get_db)) -> list[VisitRead]:
    visits = repository.get_recent_visits(db)
    return [VisitRead.model_validate(visit) for visit in visits]
