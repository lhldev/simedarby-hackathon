# Sime Darby Hackathon — Visitor Log

Zero-boilerplate foundation for the **Sime Darby Hackathon**: **FastAPI + SQLAlchemy + Neon Postgres + native Rust extension** (PyO3/Maturin), deployable to Vercel.

A simple Visitor Log app proves the full stack is wired: the browser posts a visit, the FastAPI route hands the timestamp + user agent to the **native Rust extension** for signing, the signature is persisted to **Neon Postgres**, and the dashboard table lists the recent signed visits.

## Layout

```
app/            FastAPI application (api, db, services, web)
rust_ext/       Rust crate compiled to the `starter_rust` Python module
scripts/        setup.sh (env bootstrap) + init_db.py (schema creation)
tests/          pytest suite backed by transient SQLite
```

## Quickstart

```bash
cp .env.example .env   # set DATABASE_URL (Neon Postgres connection string)
make setup             # installs uv deps and compiles the Rust extension
make db                # creates the visits table
make dev               # http://localhost:8000 — click "Log My Visit"
```

## Using the Visitor Log

1. Open http://localhost:8000 — the dashboard loads the recent visits table automatically.
2. Click **"Log My Visit (Triggers Rust & DB)"**.
3. Behind the scenes: the browser POSTs to `/api/v1/visits`, the route captures the current UTC timestamp and your `User-Agent` header, and passes both to `starter_rust.process_visit` — the **natively compiled Rust function**. Rust reverses the user agent, runs an FNV-1a-style pseudo-hash over the timestamp, and returns a signature like `RUST-3f2a…|rev:tnemtseT…|ts_len:35|ua_len:12`. That record is saved to Postgres and appears in the table.

### Verify the Rust extension compiled

```bash
uv run python -c "import starter_rust; print(starter_rust.process_visit('2026-10-18T00:00:00+00:00', 'Mozilla/5.0'))"
# RUST-<hash>|rev:0.5/allizuaM|ts_len:25|ua_len:11
```

If that prints a `RUST-` signature (not an import error), the PyO3/Maturin build succeeded.

### Verify the database schema

```bash
make db
# or: uv run python scripts/init_db.py -> "Database schema created."
```

## API

| Method | Path                | Description                          |
| ------ | ------------------- | ------------------------------------ |
| GET    | `/`                 | Visitor Log dashboard (vanilla JS)   |
| GET    | `/health`           | Liveness probe                       |
| POST   | `/api/v1/visits`    | Log a visit; returns the signed record |
| GET    | `/api/v1/visits`    | List the 10 most recent visits        |

## Theme

The dashboard (`app/web/templates/index.html`) uses the **Sime Darby color theme**, taken from the official Sime brand identity (<https://www.sime.com/about/bridging-opportunities/>). Colors are exposed as CSS custom properties so they can be reused:

| Token                | Hex       | Role                    |
| -------------------- | --------- | ----------------------- |
| `--sime-navy`        | `#003866` | Primary / headings      |
| `--sime-navy-dark`   | `#001D33` | Deep navy accents       |
| `--sime-orange`      | `#FF6B12` | Accent / CTAs / links   |
| `--sime-orange-dark` | `#D9550B` | Accent hover            |
| `--sime-ink`         | `#182B3A` | Body text               |
| `--sime-muted`       | `#8B959D` | Secondary text          |
| `--sime-surface`     | `#FFFFFF` | Page background         |
| `--sime-surface-2`   | `#F2F2F2` | Subtle surfaces         |
| `--sime-border`      | `#CFCFCF` | Borders / dividers      |

Keep new UI on this palette (navy for structure, orange for emphasis) so the app stays on brand.

## Database

Schema is created **explicitly** — never at app startup — to avoid cold-start races on serverless:

```bash
make db
# or: uv run python scripts/init_db.py
```

The `visits` table: `id` (UUID), `timestamp` (timestamptz), `user_agent`, `rust_signature`.

## Rust extension

```python
import starter_rust

starter_rust.process_visit("2026-10-18T00:00:00+00:00", "curl/8.0")
# 'RUST-<fnv1a-hash>|rev:0.8/lrc|ts_len:25|ua_len:7'
```

Rebuild after editing `rust_ext/src/lib.rs` with `make setup` (Maturin compiles via `uv sync`). Only `pyo3` + std are used, so recompilation stays fast.

## Deploy (Vercel)

`.github/workflows/deploy.yml` builds the wheel with `maturin-action`, stages it into `.vercel_wheels/`, and deploys with the Vercel CLI. Required secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Runtime settings (60s max duration, no custom Rust build step) are declared in `vercel.json`.
