from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.models import Base


def build_engine():
    url = settings.database_url
    if url.startswith("sqlite"):
        return create_engine(
            url,
            future=True,
            pool_pre_ping=True,
            poolclass=StaticPool,
            connect_args={"check_same_thread": False},
        )
    return create_engine(
        url, future=True, pool_pre_ping=True, pool_size=1, max_overflow=0
    )


engine = build_engine()
SessionLocal = sessionmaker(
    bind=engine, future=True, autoflush=False, expire_on_commit=False
)


@contextmanager
def session_scope() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
