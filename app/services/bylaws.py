import json
from collections.abc import AsyncIterator
from pathlib import Path

import httpx

from app.core.config import settings

BYLAWS_PATH = Path(__file__).resolve().parents[2] / "mock-by-laws.txt"

SYSTEM_PROMPT = """You are the SD-Wallet Township By-Laws Alignment assistant.

Answer questions covered by the mock by-laws below using ONLY those by-laws.
Keep replies concise: a short direct answer followed by at most 3 bullet points,
formatted in simple Markdown. Quote limits, approvals, deadlines and fines
exactly when present.

If the mock by-laws do NOT cover the question, do not refuse. Say clearly that
the mock by-laws are silent on it, then give a short answer under a heading like
"Hypothetical / common practice". Base that answer on general Malaysian
township and strata living conventions, keep it to at most 3 bullet points, and
do not invent specific by-law numbers, limits, fines or deadlines. Never
present this general guidance as binding by-law text.

If relevant, remind the user that this is a mock by-law set, not legal advice,
and that they should confirm anything important with the township management
office.

MOCK BY-LAWS:
"""


def load_by_laws() -> str:
    return BYLAWS_PATH.read_text(encoding="utf-8")


def build_messages(question: str) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": SYSTEM_PROMPT + load_by_laws()},
        {"role": "user", "content": question},
    ]


def _sse(payload: dict[str, str]) -> str:
    return "data: " + json.dumps(payload) + "\n\n"


async def stream_by_law_answer(question: str) -> AsyncIterator[str]:
    if not settings.grafilab_key:
        yield _sse(
            {
                "delta": "The by-law assistant is not configured. Please contact your township management office."
            }
        )
        yield "data: [DONE]\n\n"
        return

    try:
        messages = build_messages(question)
    except OSError:
        yield _sse(
            {
                "delta": "The mock by-laws could not be loaded. Please contact your township management office."
            }
        )
        yield "data: [DONE]\n\n"
        return

    payload = {
        "messages": messages,
        "model": settings.grafilab_model,
        "temperature": 0.3,
        "top_p": 1,
        "stream": True,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + settings.grafilab_key,
    }

    try:
        async with (
            httpx.AsyncClient(timeout=60.0) as client,
            client.stream(
                "POST", settings.grafilab_base_url, json=payload, headers=headers
            ) as response,
        ):
            if response.status_code != 200:
                await response.aread()
                yield _sse(
                    {
                        "delta": "The by-law assistant is unavailable right now. Please try again or contact your township management office."
                    }
                )
            else:
                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data = line[6:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    choices = chunk.get("choices") or []
                    if not choices:
                        continue
                    content = (choices[0].get("delta") or {}).get("content")
                    if content:
                        yield _sse({"delta": content})
    except httpx.HTTPError:
        yield _sse(
            {
                "delta": "The by-law assistant is unavailable right now. Please try again or contact your township management office."
            }
        )

    yield "data: [DONE]\n\n"
