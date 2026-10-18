from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Item


def create_item(session: Session, name: str, description: str | None = None) -> Item:
    item = Item(name=name, description=description)
    session.add(item)
    session.flush()
    session.refresh(item)
    return item


def get_item(session: Session, item_id: int) -> Item | None:
    return session.get(Item, item_id)


def list_items(session: Session) -> list[Item]:
    return list(session.execute(select(Item).order_by(Item.id)).scalars())
