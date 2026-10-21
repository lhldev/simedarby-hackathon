# Product decisions log

Purpose: record opinionated product proposals and their outcomes so future
agents do not repeatedly ask for the same changes. Before proposing product
work, read this file. Do **not** re-propose a rejected item unless the user
explicitly asks for it.

## 2026-10-21 — Hackathon polish pass

### Accepted and implemented

- **One-click demo reset.** Added a **Reset demo** action on the Wallet view
  that clears demo `localStorage` and reloads the seed state at `#wallet`.
  Restaurant availability is API-backed and is not reset.
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
