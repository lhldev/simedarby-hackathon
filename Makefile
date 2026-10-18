.PHONY: setup db test lint dev

setup:
	bash scripts/setup.sh

db:
	uv run python scripts/init_db.py

test:
	uv run pytest

lint:
	uv run ruff format .
	uv run ruff check .

dev:
	uv run uvicorn app.main:app --reload
