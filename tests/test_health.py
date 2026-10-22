def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_index(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "SD-Wallet" in response.text
    assert "By-Laws Alignment" in response.text
    assert "EV &amp; Energy" in response.text
    assert "Your community impact" in response.text
    assert "Reset demo" in response.text


def test_log_and_list_visits(client):
    response = client.post(
        "/api/v1/visits", headers={"User-Agent": "Mozilla/5.0 TestAgent"}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["user_agent"] == "Mozilla/5.0 TestAgent"
    assert body["rust_signature"].startswith("RUST-")
    assert "ts_len:" in body["rust_signature"]
    assert "ua_len:" in body["rust_signature"]

    listing = client.get("/api/v1/visits")
    assert listing.status_code == 200
    rows = listing.json()
    assert len(rows) == 1
    assert rows[0]["id"] == body["id"]
    assert rows[0]["rust_signature"] == body["rust_signature"]


def test_log_visit_truncates_long_user_agent(client):
    response = client.post("/api/v1/visits", headers={"User-Agent": "x" * 2000})
    assert response.status_code == 201
    body = response.json()
    assert body["user_agent"] == "x" * 256


def test_chat_rejects_blank_message(client):
    response = client.post("/api/v1/bylaws/chat", json={"message": "   "})
    assert response.status_code == 422
