def test_list_restaurants(client):
    response = client.get("/api/v1/restaurants")
    assert response.status_code == 200
    venues = response.json()
    assert len(venues) == 4
    assert {venue["id"] for venue in venues} == {
        "nasi-lemak-corner",
        "kopi-and-co",
        "the-grill-house",
        "bites-by-chef-nadia",
    }


def test_update_availability(client):
    response = client.patch(
        "/api/v1/restaurants/the-grill-house/availability",
        json={"status": "busy", "tables_available": 6, "wait_minutes": 20},
    )
    assert response.status_code == 200
    venue = response.json()
    assert venue["status"] == "busy"
    assert venue["tables_available"] == 6
    assert venue["wait_minutes"] == 20

    listing = client.get("/api/v1/restaurants").json()
    updated = next(item for item in listing if item["id"] == "the-grill-house")
    assert updated["tables_available"] == 6


def test_update_rejects_unknown_venue(client):
    response = client.patch(
        "/api/v1/restaurants/not-a-venue/availability",
        json={"status": "open", "tables_available": 2, "wait_minutes": 5},
    )
    assert response.status_code == 404


def test_update_rejects_over_capacity(client):
    response = client.patch(
        "/api/v1/restaurants/kopi-and-co/availability",
        json={"status": "open", "tables_available": 999, "wait_minutes": 5},
    )
    assert response.status_code == 422
