def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_index(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "Hackathon Starter" in response.text


def test_create_and_list_items(client):
    response = client.post("/items", json={"name": "demo", "description": "first item"})
    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 1
    assert body["name"] == "demo"
    assert body["optimized"] == ("Optimized via native Rust execution: demo")

    listing = client.get("/items")
    assert listing.status_code == 200
    assert [item["name"] for item in listing.json()] == ["demo"]
