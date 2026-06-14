// Portfolio repository — tracks the investor's own active and closed deals.
// Supabase when configured; in-memory fallback otherwise.

import { getSupabase } from "./supabase";

export type DealStage =
  | "offer"
  | "under_contract"
  | "rehab"
  | "listed"
  | "sold";

export interface PortfolioDeal {
  id: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  propertyType: string;
  beds: number;
  baths: number;
  sqft: number;
  stage: DealStage;
  purchasePrice: number;
  rehabBudget: number;
  rehabSpent: number;
  arv: number; // expected sale price
  salePrice: number | null; // actual sale price when sold
  listingDate: string | null;
  closingDate: string | null;
  notes: string;
  openedAt: string;
  closedAt: string | null;
}

const TABLE = "portfolio_deals";

const g = globalThis as unknown as { __portfolioStore?: PortfolioDeal[] };
function memStore(): PortfolioDeal[] {
  if (!g.__portfolioStore) g.__portfolioStore = [];
  return g.__portfolioStore;
}

function rowToDeal(r: Record<string, unknown>): PortfolioDeal {
  return {
    id: r.id as string,
    propertyAddress: (r.property_address as string) ?? "",
    propertyCity: (r.property_city as string) ?? "",
    propertyState: (r.property_state as string) ?? "NV",
    propertyZip: (r.property_zip as string) ?? "",
    propertyType: (r.property_type as string) ?? "single_family",
    beds: Number(r.beds ?? 0),
    baths: Number(r.baths ?? 0),
    sqft: Number(r.sqft ?? 0),
    stage: (r.stage as DealStage) ?? "offer",
    purchasePrice: Number(r.purchase_price ?? 0),
    rehabBudget: Number(r.rehab_budget ?? 0),
    rehabSpent: Number(r.rehab_spent ?? 0),
    arv: Number(r.arv ?? 0),
    salePrice: r.sale_price != null ? Number(r.sale_price) : null,
    listingDate: (r.listing_date as string) ?? null,
    closingDate: (r.closing_date as string) ?? null,
    notes: (r.notes as string) ?? "",
    openedAt: (r.opened_at as string) ?? new Date().toISOString(),
    closedAt: (r.closed_at as string) ?? null,
  };
}

function dealToRow(d: PortfolioDeal): Record<string, unknown> {
  return {
    id: d.id,
    property_address: d.propertyAddress,
    property_city: d.propertyCity,
    property_state: d.propertyState,
    property_zip: d.propertyZip,
    property_type: d.propertyType,
    beds: d.beds,
    baths: d.baths,
    sqft: d.sqft,
    stage: d.stage,
    purchase_price: d.purchasePrice,
    rehab_budget: d.rehabBudget,
    rehab_spent: d.rehabSpent,
    arv: d.arv,
    sale_price: d.salePrice,
    listing_date: d.listingDate,
    closing_date: d.closingDate,
    notes: d.notes,
    opened_at: d.openedAt,
    closed_at: d.closedAt,
  };
}

export async function listPortfolioDeals(): Promise<PortfolioDeal[]> {
  const sb = getSupabase();
  if (!sb) return memStore().slice().sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .order("opened_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Record<string, unknown>[]).map(rowToDeal);
}

export async function createPortfolioDeal(deal: PortfolioDeal): Promise<PortfolioDeal> {
  const sb = getSupabase();
  if (!sb) {
    memStore().unshift(deal);
    return deal;
  }
  const { data, error } = await sb
    .from(TABLE)
    .insert(dealToRow(deal))
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToDeal(data as Record<string, unknown>);
}

export async function updatePortfolioDeal(
  id: string,
  deal: PortfolioDeal
): Promise<PortfolioDeal> {
  const sb = getSupabase();
  if (!sb) {
    const store = memStore();
    const i = store.findIndex((d) => d.id === id);
    if (i >= 0) store[i] = deal;
    return deal;
  }
  const { data, error } = await sb
    .from(TABLE)
    .update(dealToRow(deal))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToDeal(data as Record<string, unknown>);
}

export async function deletePortfolioDeal(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    const store = memStore();
    const i = store.findIndex((d) => d.id === id);
    if (i >= 0) store.splice(i, 1);
    return;
  }
  const { error } = await sb.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
