from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class VisitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    timestamp: datetime
    user_agent: str
    rust_signature: str


__all__ = ["VisitRead"]
