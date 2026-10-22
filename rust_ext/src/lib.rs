use pyo3::exceptions::PyValueError;
use pyo3::prelude::*;

const MAX_WHOLE_DIGITS: usize = 12;

fn money_error(message: &str) -> PyErr {
    PyValueError::new_err(message.to_string())
}

#[pyfunction]
fn process_payload(input: String) -> PyResult<String> {
    Ok(format!("Optimized via native Rust execution: {}", input))
}

#[pyfunction]
fn process_visit(timestamp: String, user_agent: String) -> PyResult<String> {
    let reversed_ua: String = user_agent.chars().rev().collect();

    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in timestamp.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }

    Ok(format!(
        "RUST-{:016x}|rev:{}|ts_len:{}|ua_len:{}",
        hash,
        reversed_ua,
        timestamp.len(),
        user_agent.len()
    ))
}

#[pyfunction]
fn parse_amount_cents(amount: &str) -> PyResult<i64> {
    let trimmed = amount.trim();
    if trimmed.is_empty() {
        return Err(money_error("amount is required"));
    }
    if trimmed.starts_with('-') || trimmed.starts_with('+') {
        return Err(money_error("amount must be a positive decimal"));
    }

    let mut parts = trimmed.split('.');
    let whole = parts.next().unwrap_or("");
    let fraction = parts.next();
    if parts.next().is_some() {
        return Err(money_error("amount must contain at most one decimal point"));
    }
    if whole.is_empty()
        || whole.len() > MAX_WHOLE_DIGITS
        || !whole.chars().all(|character| character.is_ascii_digit())
    {
        return Err(money_error("amount has an invalid whole-number part"));
    }

    let whole_cents = whole
        .parse::<i64>()
        .map_err(|_| money_error("amount is too large"))?
        .checked_mul(100)
        .ok_or_else(|| money_error("amount is too large"))?;

    let fraction_cents = match fraction {
        None => 0,
        Some(value) => {
            if value.is_empty()
                || value.len() > 2
                || !value.chars().all(|character| character.is_ascii_digit())
            {
                return Err(money_error("amount may have at most two decimal places"));
            }
            let digits = value
                .parse::<i64>()
                .map_err(|_| money_error("amount has an invalid decimal part"))?;
            if value.len() == 1 {
                digits * 10
            } else {
                digits
            }
        }
    };

    let cents = whole_cents
        .checked_add(fraction_cents)
        .ok_or_else(|| money_error("amount is too large"))?;
    if cents <= 0 {
        return Err(money_error("amount must be greater than zero"));
    }
    Ok(cents)
}

#[pyfunction]
fn apply_wallet_delta(balance_cents: i64, amount_cents: i64, direction: &str) -> PyResult<i64> {
    if balance_cents < 0 {
        return Err(money_error("wallet balance cannot be negative"));
    }
    if amount_cents <= 0 {
        return Err(money_error("amount must be greater than zero"));
    }

    match direction {
        "in" => balance_cents
            .checked_add(amount_cents)
            .ok_or_else(|| money_error("wallet balance overflow")),
        "out" => {
            let next = balance_cents
                .checked_sub(amount_cents)
                .ok_or_else(|| money_error("wallet balance overflow"))?;
            if next < 0 {
                return Err(money_error("insufficient wallet balance"));
            }
            Ok(next)
        }
        _ => Err(money_error("direction must be 'in' or 'out'")),
    }
}

#[pyfunction]
fn cart_total_cents(prices: Vec<i64>, quantities: Vec<i64>) -> PyResult<i64> {
    if prices.len() != quantities.len() {
        return Err(money_error("each cart line needs a price and quantity"));
    }
    if prices.is_empty() {
        return Err(money_error("cart cannot be empty"));
    }

    let mut total: i64 = 0;
    for (price, quantity) in prices.iter().zip(quantities.iter()) {
        if *price <= 0 {
            return Err(money_error("cart prices must be greater than zero"));
        }
        if *quantity <= 0 {
            return Err(money_error("cart quantities must be greater than zero"));
        }
        let line = price
            .checked_mul(*quantity)
            .ok_or_else(|| money_error("cart line total overflow"))?;
        total = total
            .checked_add(line)
            .ok_or_else(|| money_error("cart total overflow"))?;
    }
    Ok(total)
}

#[pyfunction]
fn charge_cost_cents(energy_wh: i64, price_cents_per_kwh: i64) -> PyResult<i64> {
    if energy_wh <= 0 {
        return Err(money_error("energy must be greater than zero"));
    }
    if price_cents_per_kwh <= 0 {
        return Err(money_error("price must be greater than zero"));
    }

    let numerator = i128::from(energy_wh) * i128::from(price_cents_per_kwh);
    let cents = (numerator + 500) / 1000;
    let cents = i64::try_from(cents).map_err(|_| money_error("charge cost overflow"))?;
    if cents <= 0 {
        return Err(money_error("charge cost must be greater than zero"));
    }
    Ok(cents)
}

#[pyfunction]
fn add_points(current_points: i64, delta_points: i64) -> PyResult<i64> {
    if current_points < 0 {
        return Err(money_error("points balance cannot be negative"));
    }
    if delta_points <= 0 {
        return Err(money_error("points must be greater than zero"));
    }
    current_points
        .checked_add(delta_points)
        .ok_or_else(|| money_error("points balance overflow"))
}

#[pyfunction]
fn cashback_cents(spend_cents: i64) -> PyResult<i64> {
    if spend_cents < 0 {
        return Err(money_error("spend cannot be negative"));
    }
    let cashback = (i128::from(spend_cents) * 2 + 50) / 100;
    i64::try_from(cashback).map_err(|_| money_error("cashback overflow"))
}

#[pyfunction]
fn sum_cents(amounts: Vec<i64>) -> PyResult<i64> {
    let mut total: i64 = 0;
    for amount in amounts {
        if amount < 0 {
            return Err(money_error("amounts must not be negative"));
        }
        total = total
            .checked_add(amount)
            .ok_or_else(|| money_error("amount total overflow"))?;
    }
    Ok(total)
}

#[pymodule]
fn starter_rust(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(process_payload, m)?)?;
    m.add_function(wrap_pyfunction!(process_visit, m)?)?;
    m.add_function(wrap_pyfunction!(parse_amount_cents, m)?)?;
    m.add_function(wrap_pyfunction!(apply_wallet_delta, m)?)?;
    m.add_function(wrap_pyfunction!(cart_total_cents, m)?)?;
    m.add_function(wrap_pyfunction!(charge_cost_cents, m)?)?;
    m.add_function(wrap_pyfunction!(add_points, m)?)?;
    m.add_function(wrap_pyfunction!(cashback_cents, m)?)?;
    m.add_function(wrap_pyfunction!(sum_cents, m)?)?;
    Ok(())
}
