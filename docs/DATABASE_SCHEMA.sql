-- ============================================================================
-- DealRadar — Postgres / Supabase schema  (idempotent — safe to re-run)
-- ============================================================================

-- ---------- Enums -----------------------------------------------------------
do $$ begin
  create type property_type as enum
    ('single_family','condo','townhome','duplex','multi_family');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rehab_level as enum ('cosmetic','moderate','heavy','gut');
exception when duplicate_object then null; end $$;

do $$ begin
  create type investor_strategy as enum
    ('flip','brrrr','rental_hold','wholesale','avoid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deal_classification as enum ('gold','silver','bronze','reject');
exception when duplicate_object then null; end $$;

do $$ begin
  create type score_tier as enum
    ('elite','high_priority','strong','average','low');
exception when duplicate_object then null; end $$;

do $$ begin
  create type financing_source as enum
    ('cash','hard_money','private_money','heloc','conventional');
exception when duplicate_object then null; end $$;

-- ---------- Properties ------------------------------------------------------
create table if not exists properties (
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
  crime_score     int,
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
create index if not exists properties_zip_idx on properties (zip);
create index if not exists properties_status_idx on properties (status);
create index if not exists properties_list_price_idx on properties (list_price);

-- Price history
create table if not exists price_history (
  id          bigserial primary key,
  property_id text references properties(id) on delete cascade,
  event_date  date not null,
  price       numeric(12,2) not null,
  event       text not null
);
create index if not exists price_history_property_idx on price_history (property_id);

-- Comparable sales
create table if not exists comps (
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
create index if not exists comps_property_idx on comps (property_id);

-- ---------- Deal analysis + score ------------------------------------------
create table if not exists deals (
  property_id            text primary key references properties(id) on delete cascade,
  estimated_market_value numeric(12,2),
  estimated_arv          numeric(12,2),
  rehab_level            rehab_level,
  estimated_rehab_cost   numeric(12,2),
  holding_cost_total     numeric(12,2),
  closing_cost_buy       numeric(12,2),
  closing_cost_sell      numeric(12,2),
  financing_cost         numeric(12,2),
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
  score_total            int,
  score_tier             score_tier,
  score_breakdown        jsonb,
  reasons                jsonb,
  risk_factors           jsonb,
  opportunity_factors    jsonb,
  analyzed_at            timestamptz not null default now()
);
create index if not exists deals_score_idx on deals (score_total desc);
create index if not exists deals_classification_idx on deals (classification);

-- ---------- Deal snapshots (operational read/write path) -------------------
create table if not exists deal_snapshots (
  property_id text primary key,
  score       int,
  data        jsonb not null,
  scanned_at  timestamptz not null default now()
);
create index if not exists deal_snapshots_score_idx on deal_snapshots (score desc);

-- ---------- Scan history ---------------------------------------------------
create table if not exists scans (
  id            bigserial primary key,
  scan_type     text not null,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  new_listings  int default 0,
  price_drops   int default 0,
  distressed_found int default 0,
  notes         text
);

create table if not exists scan_changes (
  id          bigserial primary key,
  scan_id     bigint references scans(id) on delete cascade,
  property_id text references properties(id) on delete cascade,
  change_type text not null,
  old_value   text,
  new_value   text,
  created_at  timestamptz not null default now()
);

-- ---------- Buyer network (CRM + buy box) ----------------------------------
create table if not exists buyers (
  id            text primary key,
  name          text not null,
  company       text,
  email         text not null,
  phone         text,
  notes         text,
  active        boolean not null default true,
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

create table if not exists buyer_matches (
  id           bigserial primary key,
  buyer_id     text references buyers(id) on delete cascade,
  property_id  text references properties(id) on delete cascade,
  match_score  int,
  matched_on   jsonb,
  cma_sent_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (buyer_id, property_id)
);

-- ---------- Contractor & rehab ---------------------------------------------
create table if not exists contractors (
  id            text primary key,
  name          text not null,
  trades        jsonb default '[]',
  phone         text,
  email         text,
  available_from date,
  notes         text,
  created_at    timestamptz not null default now()
);

create table if not exists rehab_line_items (
  id          bigserial primary key,
  property_id text references properties(id) on delete cascade,
  category    text not null,
  description text,
  est_cost    numeric(10,2),
  actual_cost numeric(10,2),
  created_at  timestamptz not null default now()
);

-- ---------- Portfolio (the investor's own deals) ---------------------------
create table if not exists portfolio_deals (
  id               text primary key,
  property_address text not null,
  property_city    text not null default '',
  property_state   text not null default 'NV',
  property_zip     text not null default '',
  property_type    text not null default 'single_family',
  beds             int default 0,
  baths            numeric(3,1) default 0,
  sqft             int default 0,
  stage            text not null,
  purchase_price   numeric(12,2) default 0,
  rehab_budget     numeric(12,2) default 0,
  rehab_spent      numeric(12,2) default 0,
  arv              numeric(12,2) default 0,
  sale_price       numeric(12,2),
  listing_date     date,
  closing_date     date,
  notes            text default '',
  opened_at        timestamptz not null default now(),
  closed_at        timestamptz
);
