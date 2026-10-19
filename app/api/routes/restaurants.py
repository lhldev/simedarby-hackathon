from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/restaurants", tags=["restaurants"])

VenueStatus = Literal["open", "busy", "closed"]


class AvailabilityUpdate(BaseModel):
    status: VenueStatus
    tables_available: int = Field(ge=0)
    wait_minutes: int = Field(ge=0)


class VenueRead(BaseModel):
    id: str
    name: str
    cuisine: str
    location: str
    capacity: int
    status: VenueStatus
    tables_available: int
    wait_minutes: int
    updated_at: datetime


def _seed_venues() -> dict[str, VenueRead]:
    now = datetime.now(UTC)
    venues = [
        VenueRead(
            id="nasi-lemak-corner",
            name="Nasi Lemak Corner",
            cuisine="Malaysian",
            location="Menara Sime Darby, Level 2",
            capacity=48,
            status="open",
            tables_available=17,
            wait_minutes=5,
            updated_at=now - timedelta(minutes=2),
        ),
        VenueRead(
            id="kopi-and-co",
            name="Kopi & Co.",
            cuisine="Cafe",
            location="Ara Damansara, Tower B",
            capacity=32,
            status="busy",
            tables_available=4,
            wait_minutes=18,
            updated_at=now - timedelta(minutes=4),
        ),
        VenueRead(
            id="the-grill-house",
            name="The Grill House",
            cuisine="Western",
            location="Sime Darby HQ, KLCC",
            capacity=60,
            status="open",
            tables_available=23,
            wait_minutes=8,
            updated_at=now - timedelta(minutes=1),
        ),
        VenueRead(
            id="bites-by-chef-nadia",
            name="Bites by Chef Nadia",
            cuisine="Fusion",
            location="Sime Darby Oasis, Ground Floor",
            capacity=40,
            status="closed",
            tables_available=0,
            wait_minutes=0,
            updated_at=now - timedelta(minutes=35),
        ),
    ]
    return {venue.id: venue for venue in venues}


_venues = _seed_venues()


@router.get("", response_model=list[VenueRead])
def list_venues() -> list[VenueRead]:
    return sorted(_venues.values(), key=lambda venue: venue.name)


@router.patch("/{venue_id}/availability", response_model=VenueRead)
def update_availability(venue_id: str, payload: AvailabilityUpdate) -> VenueRead:
    venue = _venues.get(venue_id)
    if venue is None:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    if payload.tables_available > venue.capacity:
        raise HTTPException(
            status_code=422,
            detail="tables_available cannot exceed venue capacity",
        )

    updated = venue.model_copy(
        update={
            "status": payload.status,
            "tables_available": payload.tables_available,
            "wait_minutes": payload.wait_minutes,
            "updated_at": datetime.now(UTC),
        }
    )
    _venues[venue_id] = updated
    return updated
