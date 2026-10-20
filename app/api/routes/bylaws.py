from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.services.bylaws import stream_by_law_answer

router = APIRouter(prefix="/api/v1/bylaws", tags=["bylaws"])


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


@router.post("/chat")
async def chat(payload: ChatRequest) -> StreamingResponse:
    return StreamingResponse(
        stream_by_law_answer(payload.message.strip()),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
