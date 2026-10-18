import os

os.environ["DATABASE_URL"] = "sqlite://"

import pytest
from fastapi.testclient import TestClient

from app.db.engine import create_tables
from app.main import app


@pytest.fixture()
def client():
    create_tables()
    with TestClient(app) as test_client:
        yield test_client
