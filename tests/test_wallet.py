def test_wallet_seeds_demo_state(client):
    response = client.get("/api/v1/wallet")
    assert response.status_code == 200
    wallet = response.json()
    assert wallet["balance_cents"] == 348_260
    assert wallet["sd_points"] == 720
    assert wallet["bill_due_cents"] == 2_240
    assert len(wallet["transactions"]) == 6
    assert wallet["transactions"][0]["title"] == "SD reward points earned"
    assert wallet["summary"]["market_spend_cents"] == 8_300
    assert wallet["summary"]["cashback_cents"] == 166


def test_topup_uses_cent_math(client):
    response = client.post(
        "/api/v1/wallet/transactions",
        json={
            "amount": "0.10",
            "direction": "in",
            "kind": "topup",
            "title": "Wallet top-up",
            "meta": "test",
        },
    )
    assert response.status_code == 201
    wallet = response.json()
    assert wallet["balance_cents"] == 348_270
    assert wallet["transactions"][0]["amount_cents"] == 10
    assert wallet["transactions"][0]["balance_after_cents"] == 348_270


def test_payment_rejects_insufficient_balance(client):
    response = client.post(
        "/api/v1/wallet/transactions",
        json={
            "amount": "99999.99",
            "direction": "out",
            "kind": "pay",
            "title": "Too expensive",
            "meta": "",
        },
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Insufficient wallet balance."


def test_amount_rejects_more_than_two_decimals(client):
    response = client.post(
        "/api/v1/wallet/transactions",
        json={
            "amount": "1.001",
            "direction": "in",
            "kind": "topup",
            "title": "Precision attack",
            "meta": "",
        },
    )
    assert response.status_code == 422


def test_cart_quote_and_checkout_use_rust_totals(client):
    payload = {
        "items": [
            {"price": "45.00", "quantity": 2},
            {"price": "38", "quantity": 1},
        ]
    }
    quote = client.post("/api/v1/wallet/quote-cart", json=payload)
    assert quote.status_code == 200
    assert quote.json() == {"count": 3, "total_cents": 12_800}

    checkout = client.post("/api/v1/wallet/checkout", json=payload)
    assert checkout.status_code == 201
    wallet = checkout.json()
    assert wallet["balance_cents"] == 335_460
    assert wallet["transactions"][0]["kind"] == "market"
    assert wallet["transactions"][0]["amount_cents"] == 12_800


def test_charge_quote_and_debit(client):
    quote = client.post(
        "/api/v1/wallet/quote-charge",
        json={"energy_wh": 22_800, "price_cents_per_kwh": 85},
    )
    assert quote.status_code == 200
    assert quote.json()["cost_cents"] == 1_938

    charge = client.post(
        "/api/v1/wallet/charge",
        json={
            "energy_wh": 22_800,
            "price_cents_per_kwh": 85,
            "title": "EV charging · Oasis Hub",
            "meta": "22.8 kWh",
        },
    )
    assert charge.status_code == 201
    wallet = charge.json()
    assert wallet["balance_cents"] == 346_322
    assert wallet["transactions"][0]["kind"] == "charge"
    assert wallet["transactions"][0]["amount_cents"] == 1_938


def test_reward_updates_points_not_cash(client):
    response = client.post(
        "/api/v1/wallet/rewards",
        json={"points": 150, "meta": "Community ride"},
    )
    assert response.status_code == 201
    wallet = response.json()
    assert wallet["sd_points"] == 870
    assert wallet["balance_cents"] == 348_260
    assert wallet["transactions"][0]["points"] == 150
    assert wallet["transactions"][0]["amount_cents"] == 0


def test_pay_bill_clears_liability(client):
    response = client.post("/api/v1/wallet/pay-bill")
    assert response.status_code == 201
    wallet = response.json()
    assert wallet["bill_due_cents"] == 0
    assert wallet["balance_cents"] == 346_020
    assert wallet["transactions"][0]["kind"] == "utility"


def test_reset_restores_seed_wallet(client):
    client.post(
        "/api/v1/wallet/transactions",
        json={
            "amount": "10",
            "direction": "out",
            "kind": "pay",
            "title": "Coffee",
            "meta": "",
        },
    )
    response = client.post("/api/v1/wallet/reset")
    assert response.status_code == 200
    wallet = response.json()
    assert wallet["balance_cents"] == 348_260
    assert wallet["sd_points"] == 720
    assert len(wallet["transactions"]) == 6
