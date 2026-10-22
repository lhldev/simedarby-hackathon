import uuid
from datetime import UTC, datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import UUID


class Base(DeclarativeBase):
    pass


class Visit(Base):
    __tablename__ = "visits"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    timestamp: Mapped[datetime] = mapped_column(nullable=False)
    user_agent: Mapped[str] = mapped_column(String(1024), nullable=False)
    rust_signature: Mapped[str] = mapped_column(String(512), nullable=False)


class Wallet(Base):
    __tablename__ = "wallets"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    balance_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    sd_points: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    bill_due_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"
    __table_args__ = (Index("ix_wallet_transactions_wallet_at", "wallet_id", "at"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    wallet_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    meta: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    points: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    direction: Mapped[str] = mapped_column(String(3), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    balance_after_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
