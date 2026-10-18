from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db import repository
from app.schemas import ItemCreate, ItemRead
from app.services.computation import run_optimized_task

router = APIRouter(tags=["items"])


@router.get("/items", response_model=list[ItemRead])
def list_items(db: Session = Depends(get_db)) -> list[ItemRead]:
    return [ItemRead.model_validate(item) for item in repository.list_items(db)]


@router.post("/items", response_model=ItemRead, status_code=201)
def create_item(payload: ItemCreate, db: Session = Depends(get_db)) -> ItemRead:
    item = repository.create_item(db, payload.name, payload.description)
    result = run_optimized_task(payload.name)
    return ItemRead(
        id=item.id,
        name=item.name,
        description=item.description,
        optimized=result["result"],
    )
