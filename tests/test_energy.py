def test_list_chargers(client):
    response = client.get("/api/v1/energy/chargers")
    assert response.status_code == 200
    chargers = response.json()
    assert len(chargers) == 4
    assert {charger["id"] for charger in chargers} == {
        "oasis-hub-1",
        "ara-green-1",
        "klcc-express",
        "hq-guest",
    }
    assert all("bays_available" in charger for charger in chargers)
    assert all("price_cents_per_kwh" in charger for charger in chargers)


def test_update_availability(client):
    response = client.patch(
        "/api/v1/energy/chargers/klcc-express/availability",
        json={"status": "busy", "bays_available": 1},
    )
    assert response.status_code == 200
    charger = response.json()
    assert charger["status"] == "busy"
    assert charger["bays_available"] == 1

    listing = client.get("/api/v1/energy/chargers").json()
    updated = next(item for item in listing if item["id"] == "klcc-express")
    assert updated["bays_available"] == 1


def test_update_rejects_unknown_charger(client):
    response = client.patch(
        "/api/v1/energy/chargers/not-a-charger/availability",
        json={"status": "available", "bays_available": 1},
    )
    assert response.status_code == 404


def test_update_rejects_over_capacity(client):
    response = client.patch(
        "/api/v1/energy/chargers/ara-green-1/availability",
        json={"status": "available", "bays_available": 99},
    )
    assert response.status_code == 422
