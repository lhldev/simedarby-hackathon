from collections.abc import Callable

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.wallet import (
    CartCheckoutCreate,
    CartQuoteRead,
    ChargeCreate,
    ChargeQuoteCreate,
    ChargeQuoteRead,
    RewardCreate,
    WalletRead,
    WalletTransactionCreate,
)
from app.services import wallet as wallet_service

router = APIRouter(prefix="/api/v1/wallet", tags=["wallet"])


def _run(call: Callable[[], WalletRead]) -> WalletRead:
    try:
        return call()
    except wallet_service.InsufficientFunds as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except wallet_service.WalletError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("", response_model=WalletRead)
def read_wallet(db: Session = Depends(get_db)) -> WalletRead:
    return _run(lambda: wallet_service.get_wallet(db))


@router.post("/transactions", response_model=WalletRead, status_code=201)
def create_transaction(
    payload: WalletTransactionCreate, db: Session = Depends(get_db)
) -> WalletRead:
    return _run(lambda: wallet_service.post_transaction(db, payload))


@router.post("/quote-cart", response_model=CartQuoteRead)
def quote_cart(payload: CartCheckoutCreate) -> CartQuoteRead:
    try:
        return wallet_service.quote_cart(payload)
    except wallet_service.WalletError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/checkout", response_model=WalletRead, status_code=201)
def checkout(payload: CartCheckoutCreate, db: Session = Depends(get_db)) -> WalletRead:
    return _run(lambda: wallet_service.checkout(db, payload))


@router.post("/quote-charge", response_model=ChargeQuoteRead)
def quote_charge(payload: ChargeQuoteCreate) -> ChargeQuoteRead:
    try:
        return wallet_service.quote_charge(payload)
    except wallet_service.WalletError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/charge", response_model=WalletRead, status_code=201)
def charge(payload: ChargeCreate, db: Session = Depends(get_db)) -> WalletRead:
    return _run(lambda: wallet_service.post_charge(db, payload))


@router.post("/rewards", response_model=WalletRead, status_code=201)
def reward(payload: RewardCreate, db: Session = Depends(get_db)) -> WalletRead:
    return _run(lambda: wallet_service.post_reward(db, payload))


@router.post("/pay-bill", response_model=WalletRead, status_code=201)
def pay_bill(db: Session = Depends(get_db)) -> WalletRead:
    return _run(lambda: wallet_service.pay_bill(db))


@router.post("/reset", response_model=WalletRead)
def reset_wallet(db: Session = Depends(get_db)) -> WalletRead:
    return _run(lambda: wallet_service.reset_wallet(db))
