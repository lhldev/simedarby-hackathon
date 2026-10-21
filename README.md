# SD-Wallet — Sime Darby All-in-One

A hackathon front end that brings five day-to-day experiences into one
Sime Darby-branded app:

1. **SD-Wallet** — a Touch 'n Go-style wallet with top-ups, payments,
   transfers, a virtual card, rewards and a live transaction feed.
2. **Township By-Laws Alignment** — a streaming chatbot powered by GrafilyLab
   that answers property use, renovation, parking, pet, waste, common-area and
   enforcement questions using `mock-by-laws.txt` as its only knowledge source.
3. **Carpooling** — post a ride as a driver or request a seat as a passenger.
   Carpooling is cash-free: drivers earn 150 SD reward points per passenger
   and seats update live on the board.
4. **Community Marketplace** — search and filter internal listings, add items
   to a basket and check out with SD-Wallet.
5. **EV &amp; Home Energy** — one-tap charging that auto-picks an available
   charger and pays from SD-Wallet, plus home-energy tracking. Charger data is
   exposed through a small integration API for Sime Darby operator systems.

There is **no login flow**. The app runs entirely as a demo identity (Aisyah
Rahman) and keeps wallet, carpool, marketplace, home-energy and charging data
in `localStorage`, so state survives a page reload in the same browser. The
Wallet view includes a one-click **Reset demo** action that restores the
original seed state.

The original FastAPI + Neon Postgres + Rust visitor-log backend is still
present as the stack proof; the root page is now the SD-Wallet experience.

## Why it wins

- **One app, five township journeys.** Wallet, by-laws guidance, carpooling,
  marketplace and clean energy live in a single Sime Darby-branded shell with
  no login friction for judges.
- **A visible sustainability loop.** Shared rides, reused marketplace items and
  EV charging feed one SD Points balance and a unified community-impact panel,
  so the benefit is obvious instead of hidden across separate screens.
- **AI with guardrails.** By-law answers are grounded in `mock-by-laws.txt` and
  clearly labelled as mock or hypothetical when the source is silent.
- **A real operations story.** Charger availability is backed by a live
  integration API that a Sime Darby operator system can update with one PATCH
  call, while the demo UI simply picks a ready bay.
- **A repeatable live demo.** The **Reset demo** action restores seed state and
  releases active charging bays, and the dashboard falls back to cached charger
  data if the API is unavailable.
- **Stack proof, not just UI.** FastAPI, Neon Postgres, a PyO3/Maturin Rust
  extension and a Vercel deployment pipeline are all wired in.

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
app/web/static/app.js          State, rendering, chat, cart, carpool, impact dashboard, energy and chargers
app/api/routes/energy.py       Lightweight in-memory charger availability API
```

Everything is vanilla HTML/CSS/JS — no build step, no front-end dependencies.
Navigation uses `#wallet`, `#bylaws`, `#carpool`, `#marketplace` and `#energy`
deep links.

### Shared UI language

All modules reuse the same primitives: `panel`, `view-heading`, `btn`,
`badge`, `stat-card`, `form-grid`, `segmented`, `modal`, `toast` and the
`tone-*` thumbnail gradients. Each feature is a self-contained view inside one
shell, so switching sections never reloads the page.

Wallet interactions are also woven into the other modules: checking out a
marketplace basket updates the same balance, transaction history and community
impact panel. Carpooling is cash-free and instead awards SD reward points — the
same single points balance shown in the SD rewards panel — which appear as
transactions and on the SD Points badge in the Carpool view. EV charging is
paid from the same wallet, and finished sessions add SD Points plus symbolic
CO₂e savings to the shared impact panel. Home energy bills can also be paid
from SD-Wallet.

### Demo behaviour

| Area | Behaviour |
| --- | --- |
| Wallet | In-browser balance, transactions, top-up/pay/transfer modal, rewards summary, unified community-impact panel and **Reset demo**. |
| By-Laws Alignment | GrafilyLab-assisted streaming answers grounded in `mock-by-laws.txt`, plus suggested prompts. |
| Carpool | Role toggle, route form, ride board, seat reservation and SD reward points. |
| Marketplace | Search, category filters, listing creation, basket quantities and checkout. |
| EV &amp; Energy | One-tap charging with an auto-selected bay, paid sessions, home-energy meter and bill payment, SD Points and CO₂e. |

Charging sessions, home-energy values and wallet data can be reset with the
**Reset demo** action in the Wallet view, or by clearing site data for the app.
Active charging bays are released back through the integration API before the reset.

The Wallet's **Your community impact** panel combines rides shared, marketplace
items reused, EV energy charged, SD Points and symbolic CO₂e saved, so judges
can see the sustainability story without visiting each module.

## 2-minute demo script

1. **Wallet (15s).** Open `#wallet`, point out the balance, SD Points and the
   **Your community impact** panel. Use **Add money** or **Pay** to show a live
   transaction updating the feed.
2. **By-Laws Alignment (25s).** Ask "Can I park a lorry overnight?" or tap a
   topic. Call out the direct answer, the grounded limits and the mock by-law
   disclaimer.
3. **Carpool (25s).** Reserve a seat on a driver offer. The toast shows the
   driver's reward; the rides-shared and CO₂e impact values update. Emphasise
   that carpooling is cash-free.
4. **Marketplace (25s).** Add an item, adjust quantity and pay with SD-Wallet.
   The wallet balance, transaction feed and impact panel update together.
5. **EV &amp; Energy (20s).** Open `#energy` — a ready charger is already
   selected. Choose 60/80/100%, start charging and pay from SD-Wallet. Point out
   how the wallet balance, transaction feed, session and home energy update
   together. Stop to release the bay and earn SD Points plus CO₂e.
6. **Reset (10s).** Return to the Wallet view and click **Reset demo** to release
   active bays and restore seed state for the next judge.

## Impact model (symbolic)

All impact numbers are demo estimates, not audited measurements:

| Action | Effect |
| --- | --- |
| Accepted carpool passenger | Driver earns 150 SD Points |
| Each shared ride seat | +4.2 kg CO₂e saved |
| Marketplace purchase | Category-based reuse saving: Electronics 9.5, Fashion 4.8, Home 12.6, Kids 3.2, Services 1.4 kg |
| EV charging session | 0.42 kg CO₂e saved per kWh, plus 40 SD Points when the session ends |
| Eco milestone | Every 50 kg CO₂e |

The UI converts totals to approximate km driven avoided (0.192 kg CO₂e/km) and
tree-years (21 kg CO₂e/tree-year) for presentation only.

## EV charging integration API

Charger availability is the one intentionally lightweight server feature.
State is in memory, which is enough for a single-instance demo but resets when
the process restarts. The EV view deliberately hides this API: it auto-picks a
ready charger, leaving operator integration to Sime Darby.

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/api/v1/energy/chargers` | List chargers with live bay availability |
| `PATCH` | `/api/v1/energy/chargers/{charger_id}/availability` | Update status and free bays |

```bash
curl -X PATCH "http://localhost:8000/api/v1/energy/chargers/klcc-express/availability" \
  -H "Content-Type: application/json" \
  -d '{"status":"available","bays_available":3}'
```

`status` is one of `available`, `busy` or `offline`. `bays_available` must not
exceed the charger capacity. There is no authentication on this demo endpoint.

## Existing backend API

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/health` | Liveness probe |
| `POST` | `/api/v1/bylaws/chat` | Stream a by-law answer as server-sent events |
| `POST` | `/api/v1/visits` | Log a visit signed by the Rust extension |
| `GET` | `/api/v1/visits` | List the 10 most recent visits |

The `visits` table (`id`, `timestamp`, `user_agent`, `rust_signature`) is
created explicitly with `make db`, never during app startup.

## Architecture at a glance

```text
Browser (vanilla HTML/CSS/JS, localStorage demo state)
  |-- /api/v1/bylaws/chat   SSE -> GrafilyLab, grounded in mock-by-laws.txt
  |-- /api/v1/energy       in-memory charger availability API for the live dashboard
  |-- /api/v1/visits       Rust-signed visit log -> Neon Postgres
FastAPI (app/main.py) on Vercel
```

## Stack

- **Python 3.12+** managed by `uv`
- **FastAPI** app exported from `app/main.py` for Vercel
- **SQLAlchemy 2.0** against Neon Postgres via `DATABASE_URL`
- **Native Rust extension** (`starter_rust`, PyO3/Maturin) for visit signatures
- **Vanilla JS/CSS** front end served from `app/web/`

## Theme

The UI stays on the official Sime Darby palette. Tokens are defined in
`app/web/static/styles.css` and consumed by `app/web/templates/index.html`:

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
