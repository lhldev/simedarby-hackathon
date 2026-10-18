# Hackathon Starter

Zero-boilerplate foundation: **FastAPI + SQLAlchemy + Neon Postgres + native Rust extension** (PyO3/Maturin), deployable to Vercel.

## Layout

```
app/            FastAPI application (api, db, services, web)
rust_ext/       Rust crate compiled to the `starter_rust` Python module
scripts/        setup.sh (env bootstrap) + init_db.py (schema creation)
tests/          pytest suite backed by transient SQLite
```

## Quickstart

```bash
cp .env.example .env   # set DATABASE_URL
make setup             # installs uv deps and compiles the Rust extension
make dev               # http://localhost:8000 (Swagger UI at /docs)
```

## API

| Method | Path      | Description              |
| ------ | --------- | ------------------------ |
| GET    | `/`       | Jinja2 landing page      |
| GET    | `/health` | Liveness probe           |
| GET    | `/items`  | List items               |
| POST   | `/items`  | Create item (runs Rust `process_payload`) |

## Database

Schema is created **explicitly** — never at app startup — to avoid cold-start races on serverless:

```bash
make db
# or: uv run python scripts/init_db.py
```

## Rust extension

```python
import starter_rust

starter_rust.process_payload("hello")  # "Optimized via native Rust execution: hello"
```

Rebuild after editing `rust_ext/src/lib.rs` with `make setup` (Maturin compiles via `uv sync`).

## Deploy (Vercel)

`.github/workflows/deploy.yml` builds the wheel with `maturin-action`, stages it into `.vercel_wheels/`, and deploys with the Vercel CLI. Required secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Runtime settings (60s max duration, no custom Rust build step) are declared in `vercel.json`.
