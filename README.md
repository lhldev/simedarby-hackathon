# SD-Wallet — Sime Darby All-in-One

A hackathon front end that brings five day-to-day experiences into one
Sime Darby-branded app:

1. **SD-Wallet** — a Touch 'n Go-style wallet with top-ups, payments,
   transfers, a virtual card, rewards and a live transaction feed.
2. **Township By-Laws Alignment** — a streaming chatbot powered by GrafilyLab
   that answers property use, renovation, parking, pet, waste, common-area and
   enforcement questions using `mock-by-laws.txt` as its only knowledge source.
3. **Carpooling** — post a ride as a driver or request a seat as a passenger.
   Carpooling is cash-free: drivers earn 150 PRIME Reward Points per passenger
   and seats update live on the board.
4. **Community Marketplace** — search and filter internal listings, add items
   to a basket and check out with SD-Wallet.
5. **Restaurant Monitor** — live table availability, photo uploads, owner
   status controls and an automation API for POS/kitchen systems.

There is **no login flow**. The app runs entirely as a demo identity (Aisyah
Rahman) and keeps wallet, carpool and marketplace data in `localStorage`, so
state survives a page reload in the same browser.

The original FastAPI + Neon Postgres + Rust visitor-log backend is still
present as the stack proof; the root page is now the SD-Wallet experience.

## Run it

```bash
cp .env.example .env   # set DATABASE_URL (Neon Postgres or sqlite://) and GRAFILAB_KEY
make setup             # install uv deps + compile the Rust extension
make db                # create the visits table (visitor-log API only)
make dev               # http://localhost:8000
```

`make test` runs the pytest suite. `make lint` runs Ruff.

## Front-end layout

```
app/web/templates/index.html   App shell, navigation and all five views
app/web/static/styles.css      Sime Darby design system and responsive layout
app/web/static/app.js          State, rendering, chat, cart, carpool and live venues
app/api/routes/restaurants.py  Lightweight in-memory availability API
```

Everything is vanilla HTML/CSS/JS — no build step, no front-end dependencies.
Navigation uses `#wallet`, `#bylaws`, `#carpool`, `#marketplace` and
`#restaurant` deep links.

### Shared UI language

All modules reuse the same primitives: `panel`, `view-heading`, `btn`,
`badge`, `stat-card`, `form-grid`, `segmented`, `modal`, `toast` and the
`tone-*` thumbnail gradients. Each feature is a self-contained view inside one
shell, so switching sections never reloads the page.

Wallet interactions are also woven into the other modules: checking out a
marketplace basket and posting a listing update the same balance and transaction
history. Carpooling is cash-free and instead awards PRIME Reward Points, which
appear as transactions and on the PRIME Points badge in the Carpool view.

### Demo behaviour

| Area | Behaviour |
| --- | --- |
| Wallet | In-browser balance, transactions, top-up/pay/transfer modal, rewards summary. |
| By-Laws Alignment | GrafilyLab-assisted streaming answers grounded in `mock-by-laws.txt`, plus suggested prompts. |
| Carpool | Role toggle, route form, ride board, seat reservation and PRIME Reward Points. |
| Marketplace | Search, category filters, listing creation, basket quantities and checkout. |
| Restaurants | API-backed availability, 15-second polling, photo previews, status toggles and activity feed. |

Restaurant photos are previewed with `FileReader` and kept in memory only; they
are not uploaded to storage. Wallet, carpool and marketplace data can be reset
by clearing site data for the app.

## Restaurant automation API

Restaurant availability is the one intentionally lightweight server feature.
State is in memory, which is enough for a single-instance demo but resets when
the process restarts.

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/api/v1/restaurants` | List venues with live availability |
| `PATCH` | `/api/v1/restaurants/{venue_id}/availability` | Update status, free tables and wait time |

```bash
curl -X PATCH "http://localhost:8000/api/v1/restaurants/the-grill-house/availability" \
  -H "Content-Type: application/json" \
  -d '{"status":"busy","tables_available":6,"wait_minutes":20}'
```

`status` is one of `open`, `busy` or `closed`. `tables_available` must not
exceed the venue capacity. There is no authentication on this demo endpoint.

## Existing backend API

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/health` | Liveness probe |
| `POST` | `/api/v1/bylaws/chat` | Stream a by-law answer as server-sent events |
| `POST` | `/api/v1/visits` | Log a visit signed by the Rust extension |
| `GET` | `/api/v1/visits` | List the 10 most recent visits |

The `visits` table (`id`, `timestamp`, `user_agent`, `rust_signature`) is
created explicitly with `make db`, never during app startup.

## Stack

- **Python 3.12+** managed by `uv`
- **FastAPI** app exported from `app/main.py` for Vercel
- **SQLAlchemy 2.0** against Neon Postgres via `DATABASE_URL`
- **Native Rust extension** (`starter_rust`, PyO3/Maturin) for visit signatures
- **Vanilla JS/CSS** front end served from `app/web/`

## Theme

The UI stays on the official Sime Darby palette. Tokens are defined in
`app/web/static/styles.css` and `app/web/templates/index.html`:

| Token | Hex | Role |
| --- | --- | --- |
| `--sime-navy` | `#003866` | Primary surfaces, headings |
| `--sime-navy-dark` | `#001D33` | Sidebar, code blocks |
| `--sime-orange` | `#FF6B12` | CTAs, active states, live indicators |
| `--sime-orange-dark` | `#D9550B` | Hover and accent text |
| `--sime-ink` | `#182B3A` | Body text |
| `--sime-muted` | `#8B959D` | Secondary text |
| `--sime-surface` | `#FFFFFF` | Panels |
| `--sime-surface-2` | `#F2F4F7` | Page background, subtle fills |
| `--sime-border` | `#CFCFCF` | Borders and dividers |

Keep new components on navy for structure and orange for emphasis. No off-brand
colors or external UI libraries.

## Deploy

`.github/workflows/deploy.yml` builds the Rust wheel with `maturin-action`,
stages it into `.vercel_wheels/`, and deploys with the Vercel CLI. Required
secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Runtime settings
(60s max duration, no custom Rust build step) are declared in `vercel.json`.
