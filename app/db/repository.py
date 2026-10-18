from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Visit


def create_visit(
    session: Session,
    timestamp: datetime,
    user_agent: str,
    rust_signature: str,
) -> Visit:
    visit = Visit(
        timestamp=timestamp,
        user_agent=user_agent,
        rust_signature=rust_signature,
    )
    session.add(visit)
    session.flush()
    session.refresh(visit)
    return visit


def get_recent_visits(session: Session, limit: int = 10) -> list[Visit]:
    return list(
        session.execute(
            select(Visit).order_by(Visit.timestamp.desc()).limit(limit)
        ).scalars()
    )
