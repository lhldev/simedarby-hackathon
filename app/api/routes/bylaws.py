from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.services.bylaws import MAX_HISTORY_TURNS, stream_by_law_answer

router = APIRouter(prefix="/api/v1/bylaws", tags=["bylaws"])


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=MAX_HISTORY_TURNS)


@router.post("/chat")
async def chat(payload: ChatRequest) -> StreamingResponse:
    question = payload.message.strip()
    if not question:
        raise HTTPException(status_code=422, detail="message must not be blank")
    history = [turn.model_dump() for turn in payload.history]
    return StreamingResponse(
        stream_by_law_answer(question, history),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
