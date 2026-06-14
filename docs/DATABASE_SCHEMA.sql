-- ============================================================================
-- DealRadar — Postgres / Supabase schema
-- ============================================================================
-- Mirrors the TypeScript domain model in app/lib/types.ts. Apply in Supabase
-- SQL editor. Enums keep the analysis/scoring/matching engines and the database
-- in sync.

-- ---------- Enums -----------------------------------------------------------
create type property_type as enum
  ('single_family','condo','townhome','duplex','multi_family');

create type rehab_level as enum ('cosmetic','moderate','heavy','gut');

create type investor_strategy as enum
  ('flip','brrrr','rental_hold','wholesale','avoid');

create type deal_classification as enum ('gold','silver','bronze','reject');

create type score_tier as enum
  ('elite','high_priority','strong','average','low');

create type financing_source as enum
  ('cash','hard_money','private_money','heloc','conventional');

-- ---------- Properties ------------------------------------------------------
create table properties (
  id              text primary key,
  address         text not null,
  city            text not null,
  state           text not null,
  zip             text not null,
  lat             double precision,
  lng             double precision,
  property_type   property_type not null,
  beds            int not null,
  baths           numeric(3,1) not null,
  sqft            int not null,
  lot_sqft        int,
  year_built      int,
  list_price      numeric(12,2) not null,
  days_on_market  int not null default 0,
  status          text not null default 'active',
  listing_remarks text,
  photos          jsonb default '[]',
  -- Neighborhood intelligence
  crime_score     int,             -- 0-100, higher = safer
  school_score    int,
  flood_zone      boolean default false,
  neighborhood_growth numeric(5,1),
  rental_demand   int,
  investor_competition int,
  estimated_rent_monthly numeric(10,2),
  distress_signals jsonb default '[]',
  deal_killers    jsonb default '[]',
  first_seen      timestamptz not null default now(),
  last_scanned    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index on properties (zip);
create index on properties (status);
create index on properties (list_price);

-- Price history (one row per event)
create table price_history (
  id          bigserial primary key,
  property_id text references properties(id) on delete cascade,
  event_date  date not null,
  price       numeric(12,2) not null,
  event       text not null  -- listed | price_change | pending | sold | relisted
);
create index on price_history (property_id);

-- Comparable sales
create table comps (
  id            bigserial primary key,
  property_id   text references properties(id) on delete cascade,
  address       text,
  sold_price    numeric(12,2),
  sold_date     date,
  beds          int,
  baths         numeric(3,1),
  sqft          int,
  distance_miles numeric(5,2)
);
create index on comps (property_id);

-- ---------- Deal analysis + score (one current row per property) -----------
create table deals (
  property_id            text primary key references properties(id) on delete cascade,
  -- valuation
  estimated_market_value numeric(12,2),
  estimated_arv          numeric(12,2),
  rehab_level            rehab_level,
  estimated_rehab_cost   numeric(12,2),
  -- cost stack
  holding_cost_total     numeric(12,2),
  closing_cost_buy       numeric(12,2),
  closing_cost_sell      numeric(12,2),
  financing_cost         numeric(12,2),
  -- outcome
  estimated_net_profit   numeric(12,2),
  profit_margin_pct      numeric(6,2),
  estimated_roi_pct      numeric(6,2),
  cost_of_capital_pct    numeric(6,2),
  clears_cost_of_capital boolean,
  discount_to_market_pct numeric(6,2),
  discount_to_arv_pct    numeric(6,2),
  recommended_max_offer  numeric(12,2),
  recommended_strategy   investor_strategy,
  classification         deal_classification,
  monthly_cash_flow      numeric(10,2),
  cap_rate_pct           numeric(6,2),
  -- score
  score_total            int,
  score_tier             score_tier,
  score_breakdown        jsonb,
  reasons                jsonb,
  risk_factors           jsonb,
  opportunity_factors    jsonb,
  analyzed_at            timestamptz not null default now()
);
create index on deals (score_total desc);
create index on deals (classification);

-- ---------- Scan history (diffing) -----------------------------------------
create table scans (
  id            bigserial primary key,
  scan_type     text not null,   -- morning | afternoon | manual
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  new_listings  int default 0,
  price_drops   int default 0,
  distressed_found int default 0,
  notes         text
);

create table scan_changes (
  id          bigserial primary key,
  scan_id     bigint references scans(id) on delete cascade,
  property_id text references properties(id) on delete cascade,
  change_type text not null,     -- new | price_change | status_change | score_change
  old_value   text,
  new_value   text,
  created_at  timestamptz not null default now()
);

-- ---------- Buyer network (CRM + buy box) ----------------------------------
create table buyers (
  id            text primary key,
  name          text not null,
  company       text,
  email         text not null,
  phone         text,
  notes         text,
  active        boolean not null default true,
  -- buy box
  min_price       numeric(12,2) default 0,
  max_price       numeric(12,2),
  zips            jsonb default '[]',
  cities          jsonb default '[]',
  property_types  jsonb default '[]',
  strategies      jsonb default '[]',
  min_beds        int default 0,
  min_baths       numeric(3,1) default 0,
  max_rehab_level rehab_level default 'moderate',
  min_profit      numeric(12,2) default 0,
  min_roi_pct     numeric(6,2) default 0,
  avoid_high_crime boolean default true,
  created_at      timestamptz not null default now()
);

-- Record of matches + CMA emails sent (avoid re-spamming buyers)
create table buyer_matches (
  id           bigserial primary key,
  buyer_id     text references buyers(id) on delete cascade,
  property_id  text references properties(id) on delete cascade,
  match_score  int,
  matched_on   jsonb,
  cma_sent_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (buyer_id, property_id)
);

-- ---------- Contractor & rehab (Phase 3) -----------------------------------
create table contractors (
  id            text primary key,
  name          text not null,
  trades        jsonb default '[]',
  phone         text,
  email         text,
  available_from date,           -- schedule-risk input
  notes         text,
  created_at    timestamptz not null default now()
);

create table rehab_line_items (
  id          bigserial primary key,
  property_id text references properties(id) on delete cascade,
  category    text not null,     -- flooring | kitchen | paint | fixtures | permits ...
  description text,
  est_cost    numeric(10,2),
  actual_cost numeric(10,2),     -- feeds the cost library over time
  created_at  timestamptz not null default now()
);

-- ---------- Portfolio (the investor's own deals) ---------------------------
create table portfolio_deals (
  id            text primary key,
  property_id   text references properties(id),
  stage         text not null,   -- offer | under_contract | rehab | listed | sold
  purchase_price numeric(12,2),
  rehab_spent   numeric(12,2),
  sale_price    numeric(12,2),
  realized_profit numeric(12,2),
  opened_at     timestamptz not null default now(),
  closed_at     timestamptz
);
