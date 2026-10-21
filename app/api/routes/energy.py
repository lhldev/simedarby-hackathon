from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/energy", tags=["energy"])

ChargerStatus = Literal["available", "busy", "offline"]


class AvailabilityUpdate(BaseModel):
    status: ChargerStatus
    bays_available: int = Field(ge=0)


class ChargerRead(BaseModel):
    id: str
    name: str
    location: str
    connector: str
    power_kw: int
    bays_total: int
    bays_available: int
    price_per_kwh: float
    status: ChargerStatus
    updated_at: datetime


def _seed_chargers() -> dict[str, ChargerRead]:
    now = datetime.now(UTC)
    chargers = [
        ChargerRead(
            id="oasis-hub-1",
            name="Oasis Hub · Bay 1",
            location="Sime Darby Oasis, B1",
            connector="CCS2",
            power_kw=120,
            bays_total=4,
            bays_available=2,
            price_per_kwh=0.85,
            status="available",
            updated_at=now - timedelta(minutes=2),
        ),
        ChargerRead(
            id="ara-green-1",
            name="Ara Green Charge",
            location="Ara Damansara, P1",
            connector="Type 2",
            power_kw=22,
            bays_total=2,
            bays_available=0,
            price_per_kwh=0.65,
            status="busy",
            updated_at=now - timedelta(minutes=4),
        ),
        ChargerRead(
            id="klcc-express",
            name="KLCC Express",
            location="Sime Darby HQ, B2",
            connector="CCS2",
            power_kw=180,
            bays_total=6,
            bays_available=4,
            price_per_kwh=0.95,
            status="available",
            updated_at=now - timedelta(minutes=1),
        ),
        ChargerRead(
            id="hq-guest",
            name="HQ Guest Charger",
            location="Menara Sime Darby, B1",
            connector="Type 2",
            power_kw=11,
            bays_total=1,
            bays_available=0,
            price_per_kwh=0.55,
            status="offline",
            updated_at=now - timedelta(minutes=35),
        ),
    ]
    return {charger.id: charger for charger in chargers}


_chargers = _seed_chargers()


@router.get("/chargers", response_model=list[ChargerRead])
def list_chargers() -> list[ChargerRead]:
    return sorted(_chargers.values(), key=lambda charger: charger.name)


@router.patch("/chargers/{charger_id}/availability", response_model=ChargerRead)
def update_availability(charger_id: str, payload: AvailabilityUpdate) -> ChargerRead:
    charger = _chargers.get(charger_id)
    if charger is None:
        raise HTTPException(status_code=404, detail="Charger not found")
    if payload.bays_available > charger.bays_total:
        raise HTTPException(
            status_code=422,
            detail="bays_available cannot exceed charger capacity",
        )

    updated = charger.model_copy(
        update={
            "status": payload.status,
            "bays_available": payload.bays_available,
            "updated_at": datetime.now(UTC),
        }
    )
    _chargers[charger_id] = updated
    return updated
