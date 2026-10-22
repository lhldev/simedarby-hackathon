# AGENTS.md

## Stack

- **Python 3.12+**, managed by `uv` (see `.python-version`, `pyproject.toml` + `uv.lock`).
- **FastAPI** app in `app/main.py` — exports `app` for Vercel auto-detection.
- **SQLAlchemy 2.0** against Neon Postgres, configured solely via `DATABASE_URL`.
- **Native Rust extension** (`starter_rust`) built with PyO3/Maturin into a wheel. Import it directly — never bridge via `subprocess`. Its primary domain is **money**: integer-cent parsing, wallet debits/credits, cart and charge totals, points and cashback (see `app/services/computation.py`, `app/services/wallet.py`, `app/api/routes/wallet.py`). It also produces anonymous visit fingerprints via `process_visit()` for the demo `visits` audit log, stored with `app/api/routes/visits.py`. The visit endpoint is not authentication or login tracking.
- **SD-Wallet front end**: one vanilla HTML/CSS/JS shell in `app/web/templates/index.html` + `app/web/static/` with five views — Wallet, By-Laws Alignment, Carpool, Marketplace, EV & Energy. There is deliberately **no login**. Money is **server-authoritative**: wallet balance, cash ledger, energy-bill liability and SD Points live in Postgres (`wallets`, `wallet_transactions`) and are mutated only through `/api/v1/wallet`; all money arithmetic is done by Rust in integer cents. Only non-money demo state (carpool posts, marketplace listings/cart, EV battery, charging sessions, carbon estimates) lives in `localStorage`. Charger availability is backed by the lightweight in-memory API in `app/api/routes/energy.py`; the EV view auto-picks a ready charger for a one-tap flow. The By-Laws Alignment demo streams answers from GrafilyLab (`GRAFILAB_KEY`) via `app/api/routes/bylaws.py`, grounded in `mock-by-laws.txt`. The Carpool view is strictly **cash-free**: drivers earn SD reward points (+150 per passenger) through the wallet rewards endpoint; points are rendered by `renderSdPoints()`. The Wallet view also has a unified **Your community impact** panel (`renderImpact()`) and a **Reset demo** action that reseeds the Postgres wallet, clears browser demo `localStorage` and releases active charging bays.

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
- **Money rule:** never do money arithmetic in JavaScript or Python. Send decimal strings/integers to the Rust wrappers (`parse_amount_cents`, `apply_wallet_delta`, `cart_total_cents`, `charge_cost_cents`, `add_points`, `cashback_cents`) and persist the result. Never trust a browser-provided balance or total; recompute it server-side.
- Wallet mutations must load the wallet with `for_update=True` so the row lock and ledger insert commit together. `wallets.balance_cents`, `sd_points` and `bill_due_cents` are authoritative.
- Pydantic schemas live in `app/schemas/`; DB models in `app/db/models.py`; data access in `app/db/repository.py`.
- UI uses the **Sime Darby color theme** (navy `#003866` + orange `#FF6B12`). Reuse the `--sime-*` CSS custom properties defined in `app/web/static/styles.css`; don't introduce off-brand colors.
- Keep the dependency set minimal; add deps in `pyproject.toml`, never a `requirements.txt`.
- Read `docs/DECISIONS.md` before proposing product changes. Do not re-propose a rejected item unless the user explicitly asks.
