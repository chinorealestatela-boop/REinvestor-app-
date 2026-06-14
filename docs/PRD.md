# DealRadar — Product Requirements Document

**AI-Driven Real Estate Investment Acquisition Platform**
Version 0.1 · Owner: chino.realestatela · Primary market: Las Vegas, NV

---

## 1. Vision

Build the most effective AI-powered acquisition platform for an individual real
estate investor — one that consistently surfaces undervalued residential
properties **before** other investors, analyzes each deal end to end, and routes
opportunities either to the investor (to flip) or to a network of buyer-partners
(to wholesale/assign). The platform should reason about the Las Vegas market
"like a local."

## 2. Investor Profile (captured in the product interview)

| Dimension | Value |
|---|---|
| Primary strategy | **Fix-and-flip** |
| Secondary income | **Wholesale / assignment** to a buyers list ($10k–$15k fee) |
| Deal volume target | 1–5 per month |
| Capital | $250,000 (leverage to ~$400k–$500k all-in per deal) |
| Experience | New investor |
| Financing | Hard money, private money, conventional, HELOC (12% interest-only) |
| Typical rehab | ~$20,000 (cosmetic); **hard ceiling $50,000** |
| Min profit | **$40,000–$50,000** per flip |
| Min return | Must beat cost of capital (>12% annualized) with margin |
| Hold time | **< 6 months** purchase → resale |
| Risk tolerance | Low–moderate (≈3–4/10): distressed **price**, not distressed **construction** |
| Acceptable work | Cosmetic only — flooring, kitchen, paint, fixtures |
| Absolute deal-killers | Foundation, structural, mold, fire, unpermitted additions, major electrical/plumbing, title issues, liens |
| Markets | Las Vegas primary; open to virtual/other markets when numbers justify |
| Area constraint | Avoid high-crime areas (wants a crime/safety layer) |

## 3. Core Differentiators

1. **Cost-of-capital-aware scoring.** A deal must clear the investor's *actual*
   borrowing cost (e.g., 12% HELOC) with margin — not a flat ROI threshold.
2. **"Clean cosmetic distressed" buy box.** Auto-rejects construction-distressed
   properties (foundation/mold/structural/title) while prioritizing
   price-distressed ones (motivated sellers, probate, REO, long DOM).
3. **Dual routing engine.** Every deal is evaluated twice: *should I flip it?*
   and *does it fit a buyer on my list?* — turning every good find into income.
4. **Buyer Network CRM + auto-CMA.** Investor partners have stored buy boxes;
   strong matches (≥70%) auto-generate a CMA and email it to the buyer.
5. **Local intelligence layer.** Crime, schools, flood zone, growth, rental
   demand, and investor competition feed both scoring and resale confidence.

## 4. Functional Requirements

### 4.1 Property ingestion & scanning
- Twice-daily scans (7:00 AM and 4:00 PM local) for new listings, price
  reductions, distressed filings, foreclosures, probate, and high-equity.
- Track historical changes per property and diff against prior scans.

### 4.2 Deal analysis engine *(implemented: `app/lib/analysis.ts`)*
- Estimate market value (comps), ARV (top-comp lift), rehab level + cost,
  holding/closing/financing costs, net profit, ROI, cash-on-cash, MAO,
  cap rate, and monthly cash flow (rental fallback).
- Classify Gold / Silver / Bronze / Reject.
- Recommend strategy: Flip / BRRRR / Rental Hold / Wholesale / Avoid.

### 4.3 Investor deal score (1–100) *(implemented: `app/lib/scoring.ts`)*
Weights: ARV spread 30, discount-to-market 20, rehab efficiency 15,
neighborhood growth 10, days-on-market 10, price-reduction history 5,
rental demand 5, investor competition 5. Penalties for deal-killers and for
failing the cost-of-capital test. Tiers: Elite 90+, High 85–89, Strong 75–84,
Average 60–74, Low <60.

### 4.4 Investment gap finder *(implemented in analysis)*
Flag properties 15% / 20% / 25%+ below estimated market value; elevate
mispriced, under-marketed, and overlooked listings.

### 4.5 Deal-killer filter *(implemented: `inferRehabLevel` + killers in scoring)*
NLP scan of listing remarks + public records to detect and down-rank/reject
foundation, mold, structural, fire, unpermitted, title, and lien issues.

### 4.6 Buyer Network CRM & matching *(implemented: `app/lib/matching.ts`)*
- Store buyers with contact info and a structured buy box.
- Match every deal to every buyer; surface strong matches; auto-CMA email.

### 4.7 Daily market report *(UI implemented; data to be wired)*
Market summary, rental market, investor metrics, hottest ZIPs — delivered as
in-app dashboard + emailed PDF + SMS summary, AM and PM.

### 4.8 Alerts
Immediate notification (email + SMS + push) when: score ≥ 90; 25%+ below
market; ARV spread > $100k; foreclosure/pre-foreclosure/probate appears; major
price reduction; motivated seller detected.

### 4.9 Dashboard *(implemented)*
Three views — ranked **list**, **card grid**, **map** — plus deal detail report,
Buyer Network tab, and Daily Report tab.

### 4.10 Contractor & rehab module *(planned)*
Contractor roster with availability; itemized rehab estimator; schedule-risk
factor feeding the score; learns the investor's real costs over time.

### 4.11 Portfolio tracking *(planned)*
Track the investor's own active deals/performance alongside market data.

### 4.12 Financing finder *(planned)*
Surface and compare loan programs (DSCR, hard money, private, fix-and-flip
lines, local NV programs) to pick the cheapest capital per deal.

## 5. Data Sources

| Tier | Source | Use | Cost |
|---|---|---|---|
| MVP | RentCast API | Property records, AVM, comps, rent | Free→$ |
| MVP | Clark County Assessor/Recorder | Ownership, tax, NOD/liens (distress) | Free |
| MVP | FBI Crime + LVMPD open data | Safety layer | Free |
| MVP | GreatSchools, FEMA flood, Google Maps | Neighborhood intel, geocoding | Free→$ |
| Phase 2 | ATTOM Data | Deep public records, foreclosure, permits | $$$ |
| Phase 2 | MLS / RESO (via investor's NV license) | Freshest listings, DOM, reductions | Low |
| Phase 2 | PropStream, probate leads, auction feeds | Distressed lead lists | $ |

## 6. Technical Architecture

- **Frontend/Backend:** Next.js (App Router) + React + TypeScript + Tailwind.
- **Database:** Supabase (Postgres) — properties, deals, scores, buyers, scans,
  contractors, portfolio. (Schema: `docs/DATABASE_SCHEMA.sql`.)
- **Engine:** Pure TypeScript modules (`analysis`, `scoring`, `matching`) —
  deterministic, testable, run during each scan.
- **AI:** Anthropic Claude — listing-remark NLP, CMA narrative generation,
  report writing, and natural-language deal Q&A.
- **Jobs:** Vercel Cron / Inngest for the 7 AM & 4 PM scans.
- **Notifications:** Gmail/Resend (email + PDF), Twilio (SMS), FCM/OneSignal (push).
- **Integrations connected:** Gmail (CMA email), Notion (CRM mirror), Canva
  (flyer/CMA design), GitHub (code).
- **Hosting:** Vercel.

## 7. MVP Roadmap

**Phase 0 — Foundation (this commit):** domain model, analysis + scoring +
matching engines, sample data, dashboard (list/grid/map), deal detail, buyer
network, daily report shell. Builds clean, no external keys required.

**Phase 1 — Live data + persistence:** Supabase schema; RentCast integration;
Clark County + crime/school/flood ingestion; replace sample data; scan job +
history diffing.

**Phase 2 — Buyer ops + alerts:** buyer add/edit UI; Claude-generated CMA;
Gmail CMA delivery; Twilio SMS + push alerts; emailed PDF daily report.

**Phase 3 — Investor tooling:** contractor/rehab module; portfolio tracking;
financing finder; MLS feed once NV license active.

**Phase 4 — Scale:** multi-market support; mobile app; partner-investor
collaboration; optional SaaS/revenue model.

## 8. Revenue Model (optional, future)

Primary value is the investor's own deal flow. Future optional monetization:
subscription access for other investors, per-deal CMA/lead fees to the buyer
network, and white-label market reports.
