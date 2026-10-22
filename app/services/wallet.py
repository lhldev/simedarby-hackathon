from datetime import UTC, datetime, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import repository
from app.db.models import Wallet
from app.schemas.wallet import (
    CartCheckoutCreate,
    CartQuoteRead,
    ChargeCreate,
    ChargeQuoteCreate,
    ChargeQuoteRead,
    RewardCreate,
    WalletRead,
    WalletSummary,
    WalletTransactionCreate,
    WalletTransactionRead,
)
from app.services import computation

WALLET_ID = "demo-aisyah"


class WalletError(Exception):
    pass


class InsufficientFunds(WalletError):
    pass


def _now() -> datetime:
    return datetime.now(UTC)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _is_this_month(value: datetime) -> bool:
    current = _now()
    local = _as_utc(value)
    return local.month == current.month and local.year == current.year


def _is_this_week(value: datetime) -> bool:
    current = _now()
    start = datetime(current.year, current.month, current.day, tzinfo=UTC) - timedelta(
        days=current.weekday()
    )
    return start <= _as_utc(value) < start + timedelta(days=7)


def _seed_wallet(session: Session) -> Wallet:
    wallet = repository.create_wallet(
        session,
        wallet_id=WALLET_ID,
        balance_cents=348_260,
        sd_points=720,
        bill_due_cents=2_240,
    )
    now = _now()
    seeded = [
        (
            "SD reward points earned",
            "Ara Damansara to KLCC · Farah I.",
            0,
            300,
            "in",
            "reward",
            now - timedelta(hours=2),
            348_260,
        ),
        (
            "Marketplace order",
            "2 items from the community market",
            8_300,
            0,
            "out",
            "market",
            now - timedelta(hours=5),
            348_260,
        ),
        (
            "Wallet top-up",
            "FPX · Maybank •• 2841",
            25_000,
            0,
            "in",
            "topup",
            now - timedelta(days=1),
            356_560,
        ),
        (
            "Nasi Lemak Corner",
            "QR payment · Menara Sime Darby",
            1_850,
            0,
            "out",
            "pay",
            now - timedelta(days=1, hours=4),
            331_560,
        ),
        (
            "Expense reimbursement",
            "Travel claim · October",
            14_640,
            0,
            "in",
            "reimburse",
            now - timedelta(days=3),
            333_410,
        ),
        (
            "Transfer to Mei Ling",
            "DuitNow transfer · lunch split",
            3_200,
            0,
            "out",
            "transfer",
            now - timedelta(days=4),
            318_770,
        ),
    ]
    for title, meta, amount_cents, points, direction, kind, at, after in seeded:
        repository.add_wallet_transaction(
            session,
            wallet_id=wallet.id,
            title=title,
            meta=meta,
            amount_cents=amount_cents,
            points=points,
            direction=direction,
            kind=kind,
            at=at,
            balance_after_cents=after,
        )
    return wallet


def _load_wallet(session: Session, for_update: bool = False) -> Wallet:
    wallet = repository.get_wallet(session, WALLET_ID, for_update=for_update)
    if wallet is None:
        try:
            with session.begin_nested():
                wallet = _seed_wallet(session)
        except IntegrityError:
            wallet = repository.get_wallet(session, WALLET_ID, for_update=for_update)
            if wallet is None:
                raise
    return wallet


def _parse_amount(amount: str) -> int:
    try:
        return computation.parse_amount_cents(amount)
    except ValueError as exc:
        raise WalletError(str(exc)) from exc


def _apply_delta(balance_cents: int, amount_cents: int, direction: str) -> int:
    try:
        return computation.apply_wallet_delta(balance_cents, amount_cents, direction)
    except ValueError as exc:
        message = str(exc)
        if "insufficient" in message.lower():
            raise InsufficientFunds("Insufficient wallet balance.") from exc
        raise WalletError(message) from exc


def _wallet_read(session: Session, wallet: Wallet) -> WalletRead:
    all_transactions = repository.list_wallet_transactions(session, wallet.id)
    spent_amounts = [
        transaction.amount_cents
        for transaction in all_transactions
        if transaction.direction == "out"
        and transaction.amount_cents > 0
        and _is_this_month(transaction.at)
    ]
    market_amounts = [
        transaction.amount_cents
        for transaction in all_transactions
        if transaction.kind == "market" and transaction.amount_cents > 0
    ]
    week_points = [
        transaction.points
        for transaction in all_transactions
        if transaction.kind == "reward"
        and transaction.direction == "in"
        and _is_this_week(transaction.at)
    ]

    spent = computation.sum_cents(spent_amounts)
    market_spend = computation.sum_cents(market_amounts)
    cashback = computation.cashback_cents(market_spend)
    points_this_week = computation.sum_cents(week_points)

    return WalletRead(
        balance_cents=wallet.balance_cents,
        sd_points=wallet.sd_points,
        bill_due_cents=wallet.bill_due_cents,
        transactions=[
            WalletTransactionRead.model_validate(transaction)
            for transaction in all_transactions[:100]
        ],
        summary=WalletSummary(
            spent_this_month_cents=spent,
            market_spend_cents=market_spend,
            cashback_cents=cashback,
            points_this_week=points_this_week,
        ),
    )


def get_wallet(session: Session) -> WalletRead:
    wallet = _load_wallet(session)
    return _wallet_read(session, wallet)


def post_transaction(session: Session, payload: WalletTransactionCreate) -> WalletRead:
    wallet = _load_wallet(session, for_update=True)
    amount_cents = _parse_amount(payload.amount)
    new_balance = _apply_delta(wallet.balance_cents, amount_cents, payload.direction)
    wallet.balance_cents = new_balance
    wallet.updated_at = _now()
    repository.add_wallet_transaction(
        session,
        wallet_id=wallet.id,
        title=payload.title.strip(),
        meta=payload.meta.strip(),
        amount_cents=amount_cents,
        points=0,
        direction=payload.direction,
        kind=payload.kind,
        at=_now(),
        balance_after_cents=new_balance,
    )
    session.flush()
    return _wallet_read(session, wallet)


def quote_cart(payload: CartCheckoutCreate) -> CartQuoteRead:
    prices = [_parse_amount(item.price) for item in payload.items]
    quantities = [item.quantity for item in payload.items]
    try:
        total = computation.cart_total_cents(prices, quantities)
    except ValueError as exc:
        raise WalletError(str(exc)) from exc
    return CartQuoteRead(
        count=sum(quantities),
        total_cents=total,
    )


def checkout(session: Session, payload: CartCheckoutCreate) -> WalletRead:
    wallet = _load_wallet(session, for_update=True)
    prices = [_parse_amount(item.price) for item in payload.items]
    quantities = [item.quantity for item in payload.items]
    try:
        total = computation.cart_total_cents(prices, quantities)
    except ValueError as exc:
        raise WalletError(str(exc)) from exc
    new_balance = _apply_delta(wallet.balance_cents, total, "out")
    wallet.balance_cents = new_balance
    wallet.updated_at = _now()
    repository.add_wallet_transaction(
        session,
        wallet_id=wallet.id,
        title="Marketplace order",
        meta=f"{sum(quantities)} item(s) from the community market",
        amount_cents=total,
        points=0,
        direction="out",
        kind="market",
        at=_now(),
        balance_after_cents=new_balance,
    )
    session.flush()
    return _wallet_read(session, wallet)


def quote_charge(payload: ChargeQuoteCreate) -> ChargeQuoteRead:
    try:
        cost = computation.charge_cost_cents(
            payload.energy_wh, payload.price_cents_per_kwh
        )
    except ValueError as exc:
        raise WalletError(str(exc)) from exc
    return ChargeQuoteRead(cost_cents=cost)


def post_charge(session: Session, payload: ChargeCreate) -> WalletRead:
    wallet = _load_wallet(session, for_update=True)
    try:
        cost = computation.charge_cost_cents(
            payload.energy_wh, payload.price_cents_per_kwh
        )
    except ValueError as exc:
        raise WalletError(str(exc)) from exc
    new_balance = _apply_delta(wallet.balance_cents, cost, "out")
    wallet.balance_cents = new_balance
    wallet.updated_at = _now()
    repository.add_wallet_transaction(
        session,
        wallet_id=wallet.id,
        title=payload.title.strip(),
        meta=payload.meta.strip(),
        amount_cents=cost,
        points=0,
        direction="out",
        kind="charge",
        at=_now(),
        balance_after_cents=new_balance,
    )
    session.flush()
    return _wallet_read(session, wallet)


def post_reward(session: Session, payload: RewardCreate) -> WalletRead:
    wallet = _load_wallet(session, for_update=True)
    try:
        new_points = computation.add_points(wallet.sd_points, payload.points)
    except ValueError as exc:
        raise WalletError(str(exc)) from exc
    wallet.sd_points = new_points
    wallet.updated_at = _now()
    repository.add_wallet_transaction(
        session,
        wallet_id=wallet.id,
        title=payload.title.strip(),
        meta=payload.meta.strip(),
        amount_cents=0,
        points=payload.points,
        direction="in",
        kind="reward",
        at=_now(),
        balance_after_cents=wallet.balance_cents,
    )
    session.flush()
    return _wallet_read(session, wallet)


def pay_bill(session: Session) -> WalletRead:
    wallet = _load_wallet(session, for_update=True)
    if wallet.bill_due_cents <= 0:
        raise WalletError("No energy bill is due right now.")
    amount = wallet.bill_due_cents
    new_balance = _apply_delta(wallet.balance_cents, amount, "out")
    wallet.balance_cents = new_balance
    wallet.bill_due_cents = 0
    wallet.updated_at = _now()
    repository.add_wallet_transaction(
        session,
        wallet_id=wallet.id,
        title="Home energy bill",
        meta="Ara Damansara residence · monthly statement",
        amount_cents=amount,
        points=0,
        direction="out",
        kind="utility",
        at=_now(),
        balance_after_cents=new_balance,
    )
    session.flush()
    return _wallet_read(session, wallet)


def reset_wallet(session: Session) -> WalletRead:
    wallet = repository.get_wallet(session, WALLET_ID, for_update=True)
    if wallet is not None:
        repository.delete_wallet(session, wallet)
    seeded = _seed_wallet(session)
    session.flush()
    return _wallet_read(session, seeded)
