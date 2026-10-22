from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.models import Visit, Wallet, WalletTransaction


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


def get_wallet(
    session: Session, wallet_id: str, for_update: bool = False
) -> Wallet | None:
    statement = select(Wallet).where(Wallet.id == wallet_id)
    if for_update:
        statement = statement.with_for_update()
    return session.execute(statement).scalar_one_or_none()


def create_wallet(
    session: Session,
    wallet_id: str,
    balance_cents: int,
    sd_points: int,
    bill_due_cents: int,
) -> Wallet:
    wallet = Wallet(
        id=wallet_id,
        balance_cents=balance_cents,
        sd_points=sd_points,
        bill_due_cents=bill_due_cents,
    )
    session.add(wallet)
    session.flush()
    return wallet


def add_wallet_transaction(
    session: Session,
    wallet_id: str,
    title: str,
    meta: str,
    amount_cents: int,
    points: int,
    direction: str,
    kind: str,
    at: datetime,
    balance_after_cents: int,
) -> WalletTransaction:
    transaction = WalletTransaction(
        wallet_id=wallet_id,
        title=title,
        meta=meta,
        amount_cents=amount_cents,
        points=points,
        direction=direction,
        kind=kind,
        at=at,
        balance_after_cents=balance_after_cents,
    )
    session.add(transaction)
    session.flush()
    session.refresh(transaction)
    return transaction


def list_wallet_transactions(
    session: Session, wallet_id: str, limit: int | None = None
) -> list[WalletTransaction]:
    statement = (
        select(WalletTransaction)
        .where(WalletTransaction.wallet_id == wallet_id)
        .order_by(WalletTransaction.at.desc())
    )
    if limit is not None:
        statement = statement.limit(limit)
    return list(session.execute(statement).scalars())


def delete_wallet(session: Session, wallet: Wallet) -> None:
    session.execute(
        delete(WalletTransaction).where(WalletTransaction.wallet_id == wallet.id)
    )
    session.delete(wallet)
    session.flush()
