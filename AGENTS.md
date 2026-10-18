# AGENTS.md

## Stack

- **Python 3.12+**, managed by `uv` (see `.python-version`, `pyproject.toml` + `uv.lock`).
- **FastAPI** app in `app/main.py` — exports `app` for Vercel auto-detection.
- **SQLAlchemy 2.0** against Neon Postgres, configured solely via `DATABASE_URL`.
- **Native Rust extension** (`starter_rust`) built with PyO3/Maturin into a wheel. Import it directly — never bridge via `subprocess`.

## Commands

```bash
make setup    # install toolchain + uv sync (compiles Rust ext via Maturin)
make db       # create schema via scripts/init_db.py
make test     # pytest (auto-uses in-memory SQLite via tests/conftest.py)
make lint     # ruff format + ruff check
make dev      # uvicorn --reload
```

## Conventions

- Never call `Base.metadata.create_all` inside the app lifespan (serverless cold-start races). Schema is created only by `scripts/init_db.py`.
- Serverless DB connections: non-SQLite engines are created with `pool_size=1, max_overflow=0`. Do not change this without revisiting Neon connection limits.
- Always use the `session_scope()` context manager for DB access (auto commit/rollback).
- Config lives in `app/core/config.py` (pydantic-settings). Copy `.env.example` to `.env` and set `DATABASE_URL` for local work.
- Rust changes: edit `rust_ext/src/lib.rs`, then `uv sync` (or `make setup`) to recompile. The compiled module is `starter_rust`.
- Pydantic schemas live in `app/schemas/`; DB models in `app/db/models.py`; data access in `app/db/repository.py`.
- Keep the dependency set minimal; add deps in `pyproject.toml`, never a `requirements.txt`.
