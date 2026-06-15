// ============================================================================
// RentCast data source
// ============================================================================
// Fetches active for-sale listings from the RentCast API, pre-filters them
// by buy-box criteria, then fetches AVM + comps only for survivors.
//
// Request budget per scan (default 15 listings fetched, top 10 enriched):
//   1  GET /listings/sale
//   ≤10 GET /avm/value  (1 per survivor — includes comps)
//   ─────────────────────────────────────────────
//   ≤11 total  (vs 41 before — rent calls removed; pre-filter added)
//
// Rent estimates come from neighborhood enrichment ZIP tables, not RentCast,
// since this investor is flip-focused (not buy-and-hold).

import type { Property, PropertyType, Comp, PriceHistoryEntry } from "../types";
import { env, isRentcastConfigured } from "../env";

const BASE = "https://api.rentcast.io/v1";

function headers() {
  return { "X-Api-Key": env.rentcastApiKey, Accept: "application/json" };
}

// RentCast property-type strings -> our enum.
function mapType(t: string | undefined): PropertyType {
  switch ((t ?? "").toLowerCase()) {
    case "condo":
    case "apartment":
      return "condo";
    case "townhouse":
      return "townhome";
    case "duplex":
    case "triplex":
    case "quadplex":
      return "duplex";
    case "multi-family":
    case "multifamily":
      return "multi_family";
    default:
      return "single_family";
  }
}

interface RentcastListing {
  id?: string;
  formattedAddress?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  lotSize?: number;
  yearBuilt?: number;
  price?: number;
  status?: string;
  daysOnMarket?: number;
  listedDate?: string;
  history?: Record<string, { event?: string; price?: number; date?: string }>;
}

interface RentcastComparable {
  formattedAddress?: string;
  price?: number;
  removedDate?: string;
  lastSeenDate?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  distance?: number;
}

function mapHistory(listing: RentcastListing): PriceHistoryEntry[] {
  const out: PriceHistoryEntry[] = [];
  const hist = listing.history ?? {};
  for (const key of Object.keys(hist).sort()) {
    const h = hist[key];
    if (h?.price && h?.date) {
      out.push({
        date: h.date.slice(0, 10),
        price: h.price,
        event:
          h.event === "Price Change"
            ? "price_change"
            : h.event === "Sold"
            ? "sold"
            : "listed",
      });
    }
  }
  if (out.length === 0 && listing.price && listing.listedDate) {
    out.push({
      date: listing.listedDate.slice(0, 10),
      price: listing.price,
      event: "listed",
    });
  }
  return out;
}

// 1 request: AVM + comps bundled in a single call.
// Rent is intentionally excluded — this investor is flip-focused and rent
// estimates come from ZIP-code tables in neighborhood enrichment instead.
async function fetchAvm(
  address: string
): Promise<{ comps: Comp[]; marketValue: number | null }> {
  try {
    const url = `${BASE}/avm/value?address=${encodeURIComponent(address)}&compCount=5`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) return { comps: [], marketValue: null };
    const data = (await res.json()) as {
      price?: number;
      comparables?: RentcastComparable[];
    };
    const comps: Comp[] = (data.comparables ?? [])
      .filter((c) => c.price && c.squareFootage)
      .map((c) => ({
        address: c.formattedAddress ?? "",
        soldPrice: c.price!,
        soldDate: (c.removedDate ?? c.lastSeenDate ?? "").slice(0, 10),
        beds: c.bedrooms ?? 0,
        baths: c.bathrooms ?? 0,
        sqft: c.squareFootage!,
        distanceMiles: Math.round((c.distance ?? 0) * 10) / 10,
      }));
    return { comps, marketValue: data.price ?? null };
  } catch {
    return { comps: [], marketValue: null };
  }
}

async function mapListing(listing: RentcastListing): Promise<Property> {
  const address =
    listing.formattedAddress ??
    `${listing.addressLine1}, ${listing.city}, ${listing.state} ${listing.zipCode}`;
  const { comps, marketValue } = await fetchAvm(address);

  return {
    id: listing.id ?? address,
    address: listing.addressLine1 ?? listing.formattedAddress ?? address,
    city: listing.city ?? "",
    state: listing.state ?? "NV",
    zip: listing.zipCode ?? "",
    lat: listing.latitude ?? 0,
    lng: listing.longitude ?? 0,
    propertyType: mapType(listing.propertyType),
    beds: listing.bedrooms ?? 0,
    baths: listing.bathrooms ?? 0,
    sqft: listing.squareFootage ?? 0,
    lotSqft: listing.lotSize ?? 0,
    yearBuilt: listing.yearBuilt ?? 1990,
    listPrice: listing.price ?? marketValue ?? 0,
    daysOnMarket: listing.daysOnMarket ?? 0,
    status: "active",
    listingRemarks: "",
    photos: [],
    priceHistory: mapHistory(listing),
    comps,
    distressSignals: deriveDistress(listing),
    dealKillers: [],
    crimeScore: 50,
    schoolScore: 50,
    floodZone: false,
    neighborhoodGrowth: 0,
    rentalDemand: 60,
    investorCompetition: 50,
    estimatedRentMonthly: 0, // filled by neighborhood enrichment via ZIP table
    firstSeen: new Date().toISOString(),
    lastScanned: new Date().toISOString(),
  };
}

// Lightweight distress inference from listing metadata (no extra API call).
function deriveDistress(listing: RentcastListing): Property["distressSignals"] {
  const signals: Property["distressSignals"] = [];
  if ((listing.daysOnMarket ?? 0) >= 60) signals.push("long_dom");
  const hist = listing.history ?? {};
  const drops = Object.values(hist).filter(
    (h) => h?.event === "Price Change"
  ).length;
  if (drops >= 1) signals.push("major_price_reduction");
  return signals;
}

// Pre-filter: discard listings that can't possibly fit the buy box before
// spending AVM request budget on them.
function passesPreFilter(
  listing: RentcastListing,
  params: ScanParams
): boolean {
  const price = listing.price ?? 0;
  const beds = listing.bedrooms ?? 0;
  const type = mapType(listing.propertyType);

  // Hard price ceiling
  if (params.maxPrice && price > params.maxPrice) return false;
  // Skip anything without a price or sqft (incomplete data)
  if (!price || !listing.squareFootage) return false;
  // Must have at least 2 beds (single-room condos not in buy box)
  if (beds < 2) return false;
  // Skip multi-family — this investor targets 1-4 unit residential flips
  if (type === "multi_family") return false;

  return true;
}

export interface ScanParams {
  city?: string;
  state?: string;
  zipCode?: string;
  maxPrice?: number;
  // How many listings to pull from RentCast (1 request regardless of count).
  fetchLimit?: number;
  // How many survivors to enrich with AVM after pre-filtering (1 request each).
  enrichLimit?: number;
}

// Pull active sale listings, pre-filter by buy box, then enrich survivors
// with AVM + comps. Total requests = 1 + enrichLimit (default ≤10).
export async function scanRentcast(params: ScanParams): Promise<Property[]> {
  if (!isRentcastConfigured()) {
    throw new Error("RentCast is not configured (set RENTCAST_API_KEY).");
  }

  const fetchLimit = params.fetchLimit ?? 40; // cast wide net in 1 request
  const enrichLimit = params.enrichLimit ?? 10; // AVM budget per scan

  const q = new URLSearchParams({
    status: "Active",
    limit: String(fetchLimit),
  });
  if (params.city) q.set("city", params.city);
  if (params.state) q.set("state", params.state);
  if (params.zipCode) q.set("zipCode", params.zipCode);
  if (params.maxPrice) q.set("maxPrice", String(params.maxPrice));

  const res = await fetch(`${BASE}/listings/sale?${q.toString()}`, {
    headers: headers(),
  });
  if (!res.ok) {
    throw new Error(`RentCast listings error: ${res.status} ${res.statusText}`);
  }
  const listings = (await res.json()) as RentcastListing[];

  // Pre-filter before spending any AVM requests.
  const candidates = listings
    .filter((l) => passesPreFilter(l, params))
    .slice(0, enrichLimit);

  // Enrich survivors sequentially to stay under the 20 req/sec rate limit.
  const out: Property[] = [];
  for (const listing of candidates) {
    out.push(await mapListing(listing));
  }
  return out;
}
