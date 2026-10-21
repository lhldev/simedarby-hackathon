import os

os.environ["DATABASE_URL"] = "sqlite://"

import pytest
from fastapi.testclient import TestClient

from app.db.engine import create_tables, engine
from app.db.models import Base
from app.main import app


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    create_tables()
    with TestClient(app) as test_client:
        yield test_client
