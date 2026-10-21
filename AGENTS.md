# AGENTS.md

## Stack

- **Python 3.12+**, managed by `uv` (see `.python-version`, `pyproject.toml` + `uv.lock`).
- **FastAPI** app in `app/main.py` — exports `app` for Vercel auto-detection.
- **SQLAlchemy 2.0** against Neon Postgres, configured solely via `DATABASE_URL`.
- **Native Rust extension** (`starter_rust`) built with PyO3/Maturin into a wheel. Import it directly — never bridge via `subprocess`. Current domain: the `Item` boilerplate was replaced by a `Visit` log — visits are signed by `starter_rust.process_visit(timestamp, user_agent)` and stored in the `visits` table (see `app/services/computation.py`, `app/api/routes/visits.py`).
- **SD-Wallet front end**: one vanilla HTML/CSS/JS shell in `app/web/templates/index.html` + `app/web/static/` with five views — Wallet, By-Laws Alignment, Carpool, Marketplace, Restaurant Monitor. There is deliberately **no login**; demo state lives in `localStorage`. Restaurant availability is backed by the lightweight in-memory API in `app/api/routes/restaurants.py`. The By-Laws Alignment demo streams answers from GrafilyLab (`GRAFILAB_KEY`) via `app/api/routes/bylaws.py`, grounded in `mock-by-laws.txt` — a deliberately stripped-down mock, not real by-laws. The Carpool view is strictly **cash-free**: no fiat pricing or wallet charges — drivers earn SD reward points (+150 per passenger) — the single app-wide points system, tracked in `state.sdPoints` and rendered by `renderSdPoints()`. The Wallet view also has a unified **Your community impact** panel (`renderImpact()`) and a **Reset demo** action that clears demo `localStorage` and reloads seed state.

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
- UI uses the **Sime Darby color theme** (navy `#003866` + orange `#FF6B12`). Reuse the `--sime-*` CSS custom properties defined in `app/web/static/styles.css`; don't introduce off-brand colors.
- Keep the dependency set minimal; add deps in `pyproject.toml`, never a `requirements.txt`.
- Read `docs/DECISIONS.md` before proposing product changes. Do not re-propose a rejected item unless the user explicitly asks.
