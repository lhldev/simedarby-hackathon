# Product decisions log

Purpose: record opinionated product proposals and their outcomes so future
agents do not repeatedly ask for the same changes. Before proposing product
work, read this file. Do **not** re-propose a rejected item unless the user
explicitly asks for it.

## 2026-10-23 — By-laws chat carries the visible conversation

### Accepted and implemented

- **Multi-turn context.** The browser sends the on-screen conversation
  (`history`) with each `/api/v1/bylaws/chat` request; the server rebuilds
  `[system, history, latest user]` and caps history at the latest 20 turns.
  Only `user` and `assistant` roles are accepted, so clients cannot inject a
  system prompt. History is ephemeral and cleared by **Reset chat**.
- **Latest message wins.** The system prompt instructs the model to answer the
  latest user message and use earlier turns only for context, avoiding repeats
  of an earlier answer.

### Verification for this pass

- `uv run pytest -q` — 24 passed.
- `uv run ruff check .` — clean.
- `node --check app/web/static/app.js` — clean.

## 2026-10-22 — Money moves into Postgres; Rust owns the arithmetic

### Accepted and implemented

- **Server-authoritative wallet.** `wallets` stores `balance_cents`,
  `sd_points` and `bill_due_cents`; `wallet_transactions` is the append-only
  ledger. Both are created by `make db`.
- **Rust owns every money calculation.** Decimal strings are parsed to integer
  cents, debits/credits are validated for sign, precision, overflow and
  insufficient funds, and cart totals, charge costs, points and cashback are
  computed in `starter_rust`. Python and JavaScript only transport and format
  the result.
- **No browser balance mutation.** Top-up, pay, transfer, marketplace checkout,
  EV charging, energy-bill payment and rewards all call `/api/v1/wallet`.
  Non-money demo state (carpool, listings/cart, EV battery/sessions, carbon)
  remains in `localStorage`.
- **Reset covers both layers.** **Reset demo** reseeds the Postgres wallet and
  ledger, clears browser demo state and releases charging bays.
- **Pitch repositioning.** Documentation now leads with financial safety and
  native speed. The `visits` endpoint remains as an anonymous audit demo but is
  no longer described as login/signing or as the reason Rust exists.

### Verification for this pass

- `uv run pytest -q` — 18 passed.
- `uv run ruff check .` — clean.
- `cargo fmt --check` — clean.
- `node --check app/web/static/app.js` — clean.

## 2026-10-21 — EV & Energy replaces Restaurant Monitor

### Accepted and implemented

- **Replace Restaurant Monitor.** The user judged table monitoring a weak fit
  for a township super-app. The fifth view is now **EV & Energy**: live charger
  bays from an in-memory FastAPI endpoint, paid charging sessions from
  SD-Wallet, home-energy meter/bill payment, SD Points and symbolic CO₂e.
- **Integration over a standalone monitor.** Charging sessions and home-energy
  values live in demo `localStorage`, feed the wallet transaction feed and the
  unified **Your community impact** panel, and are cleared by **Reset demo**
  (which also releases active bays through the operator API).
- **Operator API kept, UI simplified.** `GET /api/v1/energy/chargers` and
  `PATCH /api/v1/energy/chargers/{id}/availability` remain as the backend
  integration surface for Sime Darby. The UI does not list chargers or expose
  API controls; it auto-picks a ready bay for a one-tap charge flow.

This supersedes the Restaurant Monitor and the "restaurant availability is not
reset" note below.

## 2026-10-21 — Hackathon polish pass

### Accepted and implemented

- **One-click demo reset.** Added a **Reset demo** action on the Wallet view
  that clears demo `localStorage` and reloads the seed state at `#wallet`.
  Restaurant availability was API-backed and was not reset (superseded by the
  EV & Energy entry above).
- **Unified community impact dashboard.** Replaced the Wallet's carbon-only
  panel with a single **Your community impact** panel showing rides shared,
  marketplace items reused, SD Points and CO₂e saved, plus the existing carbon
  milestone bar.
- **README pitch pack.** Added "Why it wins", a 2-minute demo script, an
  architecture sketch and a symbolic impact-model table to the README.

### Rejected / not pursuing

These were proposed and deliberately not selected. Do not re-propose them
unless the user explicitly reopens the topic.

- **Demo-safe local by-laws fallback.** A local retrieval fallback for when
  `GRAFILAB_KEY` is missing or the upstream LLM fails. Skipped; the app keeps
  its current explicit "not configured / unavailable" messages.
- **By-law source citations.** Showing the specific mock by-law section behind
  each chat answer. Skipped; current answers remain grounded but uncited.
- **Judge guided tour.** A 90-second overlay walking judges through the five
  views. Skipped; the README demo script covers this instead.
- **Carpool smart matches / carpool UX redesign.** Proposed filtering the board
  by role, clarifying seat labels and reward wording, and showing scored
  matches after posting. The user explicitly chose to skip all carpool changes
  for this pass. Current carpool behaviour is unchanged.

### Verification for this pass

- `uv run pytest -q` — 9 passed.
- `uv run ruff check .` — clean.
- `node --check app/web/static/app.js` — clean.
