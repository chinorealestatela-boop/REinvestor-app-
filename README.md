# DealRadar

**AI-driven real estate investment acquisition platform.** Finds undervalued
residential properties in Las Vegas (and beyond) before other investors,
analyzes every deal end to end, scores it 1–100, and routes it either to you
(to flip) or to a buyer on your network (to wholesale/assign).

Built for a fix-and-flip investor with a "clean cosmetic distressed" buy box:
distressed in **price**, not in **construction**.

## Status

**Phase 0 — Foundation (current).** Runs entirely on realistic Las Vegas sample
data, no API keys required. Implemented:

- **Deal analysis engine** (`app/lib/analysis.ts`) — market value, ARV, rehab,
  holding/closing/financing costs, net profit, ROI, MAO, cap rate, strategy,
  Gold/Silver/Bronze classification, and a cost-of-capital test.
- **1–100 scoring engine** (`app/lib/scoring.ts`) — weighted score with
  deal-killer and cost-of-capital penalties, tiers, reasons, risks, opportunities.
- **Buyer matching engine** (`app/lib/matching.ts`) — routes each deal to every
  buyer's stored buy box; strong matches (≥70%) are CMA-ready.
- **Dashboard** — ranked list, card grid, and map views; deal-detail report;
  Buyer Network CRM; daily market report; priority alerts.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## What's next

See `docs/PRD.md` for the full plan and `docs/DATABASE_SCHEMA.sql` for the
Postgres/Supabase schema. Next steps: wire Supabase + RentCast + Clark County
public records, then the twice-daily scan job and CMA email delivery.

## Configuration

Copy `.env.example` → `.env.local`. The app runs with no keys set; add them to
enable live data, persistence, and notifications.
