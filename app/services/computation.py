import starter_rust


def generate_visit_signature(timestamp: str, user_agent: str) -> str:
    try:
        return starter_rust.process_visit(timestamp, user_agent)
    except Exception as exc:
        raise RuntimeError(f"native Rust signature generation failed: {exc}") from exc


def parse_amount_cents(amount: str) -> int:
    try:
        return starter_rust.parse_amount_cents(amount)
    except ValueError as exc:
        raise ValueError(str(exc)) from exc
    except Exception as exc:
        raise RuntimeError(f"native Rust amount parsing failed: {exc}") from exc


def apply_wallet_delta(balance_cents: int, amount_cents: int, direction: str) -> int:
    try:
        return starter_rust.apply_wallet_delta(balance_cents, amount_cents, direction)
    except ValueError as exc:
        raise ValueError(str(exc)) from exc
    except Exception as exc:
        raise RuntimeError(f"native Rust wallet calculation failed: {exc}") from exc


def cart_total_cents(prices: list[int], quantities: list[int]) -> int:
    try:
        return starter_rust.cart_total_cents(prices, quantities)
    except ValueError as exc:
        raise ValueError(str(exc)) from exc
    except Exception as exc:
        raise RuntimeError(f"native Rust cart calculation failed: {exc}") from exc


def charge_cost_cents(energy_wh: int, price_cents_per_kwh: int) -> int:
    try:
        return starter_rust.charge_cost_cents(energy_wh, price_cents_per_kwh)
    except ValueError as exc:
        raise ValueError(str(exc)) from exc
    except Exception as exc:
        raise RuntimeError(f"native Rust charge calculation failed: {exc}") from exc


def add_points(current_points: int, delta_points: int) -> int:
    try:
        return starter_rust.add_points(current_points, delta_points)
    except ValueError as exc:
        raise ValueError(str(exc)) from exc
    except Exception as exc:
        raise RuntimeError(f"native Rust points calculation failed: {exc}") from exc


def cashback_cents(spend_cents: int) -> int:
    try:
        return starter_rust.cashback_cents(spend_cents)
    except ValueError as exc:
        raise ValueError(str(exc)) from exc
    except Exception as exc:
        raise RuntimeError(f"native Rust cashback calculation failed: {exc}") from exc


def sum_cents(amounts: list[int]) -> int:
    try:
        return starter_rust.sum_cents(amounts)
    except ValueError as exc:
        raise ValueError(str(exc)) from exc
    except Exception as exc:
        raise RuntimeError(f"native Rust amount total failed: {exc}") from exc
