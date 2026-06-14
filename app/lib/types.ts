// ============================================================================
// Domain model for the AI Real Estate Investment Platform
// ============================================================================
// These types describe properties, deal analysis, scoring, and the investor
// buyer network. They are the single source of truth shared by the analysis
// engine, the matching engine, and the UI.

export type PropertyType =
  | "single_family"
  | "condo"
  | "townhome"
  | "duplex"
  | "multi_family";

export type DistressSignal =
  | "pre_foreclosure"
  | "foreclosure"
  | "reo"
  | "probate"
  | "estate_sale"
  | "tax_delinquent"
  | "absentee_owner"
  | "vacant"
  | "code_violation"
  | "long_dom"
  | "major_price_reduction"
  | "motivated_seller";

// Red flags that auto-reject a property for the investor's "clean cosmetic"
// buy box. Detected from listing remarks, permits, and public records.
export type DealKiller =
  | "foundation"
  | "structural"
  | "mold"
  | "fire_damage"
  | "unpermitted_addition"
  | "major_electrical"
  | "major_plumbing"
  | "title_issue"
  | "lien";

export type RehabLevel = "cosmetic" | "moderate" | "heavy" | "gut";

export type InvestorStrategy =
  | "flip"
  | "brrrr"
  | "rental_hold"
  | "wholesale"
  | "avoid";

export type DealClassification = "gold" | "silver" | "bronze" | "reject";

export interface PriceHistoryEntry {
  date: string; // ISO date
  price: number;
  event: "listed" | "price_change" | "pending" | "sold" | "relisted";
}

export interface Comp {
  address: string;
  soldPrice: number;
  soldDate: string; // ISO date
  beds: number;
  baths: number;
  sqft: number;
  distanceMiles: number;
}

export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;

  propertyType: PropertyType;
  beds: number;
  baths: number;
  sqft: number;
  lotSqft: number;
  yearBuilt: number;

  listPrice: number;
  daysOnMarket: number;
  status: "active" | "pending" | "coming_soon" | "off_market";
  listingRemarks: string;
  photos: string[];

  priceHistory: PriceHistoryEntry[];
  comps: Comp[];

  distressSignals: DistressSignal[];
  dealKillers: DealKiller[];

  // Neighborhood intelligence
  crimeScore: number; // 0-100, higher = safer
  schoolScore: number; // 0-100
  floodZone: boolean;
  neighborhoodGrowth: number; // -100..100, YoY appreciation signal
  rentalDemand: number; // 0-100
  investorCompetition: number; // 0-100, higher = more competition

  estimatedRentMonthly: number;

  firstSeen: string; // ISO datetime, when our scanner first found it
  lastScanned: string; // ISO datetime
}

// ----------------------------------------------------------------------------
// Financial analysis output
// ----------------------------------------------------------------------------

export interface FinancingTerms {
  // The investor's cost of capital for THIS deal. Used to ensure the deal
  // clears the borrowing cost with margin.
  source: "cash" | "hard_money" | "private_money" | "heloc" | "conventional";
  annualRatePct: number; // e.g. 12 for the 12% interest-only HELOC
  loanToCostPct: number; // % of all-in cost that is borrowed
  pointsPct: number; // origination points
}

export interface DealAnalysis {
  // Valuation
  estimatedMarketValue: number;
  estimatedArv: number;
  rehabLevel: RehabLevel;
  estimatedRehabCost: number;

  // Cost stack
  purchasePrice: number; // assumed = list for initial pass
  holdingCostMonthly: number;
  holdingMonths: number;
  holdingCostTotal: number;
  closingCostBuy: number;
  closingCostSell: number;
  financingCost: number;

  // Outcome
  estimatedNetProfit: number;
  profitMarginPct: number; // profit / ARV
  estimatedRoiPct: number; // profit / cash invested
  cashOnCashPct: number;
  costOfCapitalPct: number; // the rate this deal must beat
  clearsCostOfCapital: boolean;

  // Gap finder
  discountToMarketPct: number;
  discountToArvPct: number;

  // Recommendation
  recommendedMaxOffer: number; // MAO
  recommendedStrategy: InvestorStrategy;
  classification: DealClassification;

  // Backup rental exit
  monthlyCashFlow: number;
  capRatePct: number;
}

export interface ScoreBreakdown {
  arvSpread: number; // weighted contribution (out of weight)
  discountToMarket: number;
  rehabEfficiency: number;
  neighborhoodGrowth: number;
  daysOnMarket: number;
  priceReductionHistory: number;
  rentalDemand: number;
  investorCompetition: number;
}

export type ScoreTier =
  | "elite" // 90-100
  | "high_priority" // 85-89
  | "strong" // 75-84
  | "average" // 60-74
  | "low"; // <60

export interface DealScore {
  total: number; // 1-100
  tier: ScoreTier;
  breakdown: ScoreBreakdown;
  reasons: string[]; // why it was selected
  riskFactors: string[];
  opportunityFactors: string[];
}

// A property joined with its analysis and score — the unit shown in the UI.
export interface ScoredDeal {
  property: Property;
  analysis: DealAnalysis;
  score: DealScore;
}

// ----------------------------------------------------------------------------
// Investor buyer network (the CRM + matching engine)
// ----------------------------------------------------------------------------

export interface BuyerBuyBox {
  minPrice: number;
  maxPrice: number;
  zips: string[]; // empty = any
  cities: string[]; // empty = any
  propertyTypes: PropertyType[]; // empty = any
  strategies: InvestorStrategy[];
  minBeds: number;
  minBaths: number;
  maxRehabLevel: RehabLevel;
  minProfit: number;
  minRoiPct: number;
  avoidHighCrime: boolean;
}

export interface Buyer {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  notes?: string;
  active: boolean;
  buyBox: BuyerBuyBox;
  createdAt: string;
}

export interface BuyerMatch {
  buyer: Buyer;
  deal: ScoredDeal;
  matchScore: number; // 0-100 how well the deal fits this buyer
  matchedOn: string[]; // criteria that matched
  failedOn: string[]; // criteria that did not match (for near-misses)
}
