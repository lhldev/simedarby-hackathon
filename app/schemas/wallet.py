from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class WalletTransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    meta: str
    amount_cents: int
    points: int
    direction: Literal["in", "out"]
    kind: str
    at: datetime
    balance_after_cents: int

    @field_validator("at", mode="after")
    @classmethod
    def ensure_utc(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)


class WalletSummary(BaseModel):
    spent_this_month_cents: int
    market_spend_cents: int
    cashback_cents: int
    points_this_week: int


class WalletRead(BaseModel):
    balance_cents: int
    sd_points: int
    bill_due_cents: int
    transactions: list[WalletTransactionRead]
    summary: WalletSummary


class WalletTransactionCreate(BaseModel):
    amount: str = Field(min_length=1, max_length=20)
    direction: Literal["in", "out"]
    kind: Literal["topup", "pay", "transfer"]
    title: str = Field(min_length=1, max_length=120)
    meta: str = Field(default="", max_length=240)


class CartLine(BaseModel):
    price: str = Field(min_length=1, max_length=20)
    quantity: int = Field(ge=1, le=99)


class CartCheckoutCreate(BaseModel):
    items: list[CartLine] = Field(min_length=1, max_length=50)


class CartQuoteRead(BaseModel):
    count: int
    total_cents: int


class ChargeCreate(BaseModel):
    energy_wh: int = Field(gt=0)
    price_cents_per_kwh: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=120)
    meta: str = Field(default="", max_length=240)


class ChargeQuoteCreate(BaseModel):
    energy_wh: int = Field(gt=0)
    price_cents_per_kwh: int = Field(gt=0)


class ChargeQuoteRead(BaseModel):
    cost_cents: int


class RewardCreate(BaseModel):
    points: int = Field(gt=0)
    title: str = Field(default="SD reward points earned", min_length=1, max_length=120)
    meta: str = Field(default="", max_length=240)
