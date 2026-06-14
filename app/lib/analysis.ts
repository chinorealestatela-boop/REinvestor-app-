// ============================================================================
// Deal Analysis Engine
// ============================================================================
// Pure functions that turn a Property into a full financial DealAnalysis.
// No external services — every number here is derived from the property data
// plus the investor's configured assumptions, so it runs instantly during a
// scan and is fully testable.

import type {
  Property,
  DealAnalysis,
  RehabLevel,
  InvestorStrategy,
  DealClassification,
  FinancingTerms,
  Comp,
} from "./types";

// The investor's profile, captured during the product interview.
// Defaults below reflect: flip-primary, ~$20k typical rehab (max $50k),
// <6 month hold, $40-50k min profit, beating a 12% cost of capital.
export interface InvestorProfile {
  minProfit: number;
  targetHoldMonths: number;
  maxRehabBudget: number;
  financing: FinancingTerms;
  // Las Vegas cosmetic defaults, tunable as real costs come in.
  rehabCostPerSqft: Record<RehabLevel, number>;
}

export const DEFAULT_PROFILE: InvestorProfile = {
  minProfit: 45_000,
  targetHoldMonths: 5,
  maxRehabBudget: 50_000,
  financing: {
    source: "heloc",
    annualRatePct: 12,
    loanToCostPct: 80,
    pointsPct: 0,
  },
  rehabCostPerSqft: {
    cosmetic: 22,
    moderate: 45,
    heavy: 75,
    gut: 110,
  },
};

// Standard transaction assumptions.
const CLOSING_COST_BUY_PCT = 0.02; // title, escrow, inspection on purchase
const SELLING_COST_PCT = 0.07; // agent commissions + seller closing + concessions

// ----------------------------------------------------------------------------
// Valuation helpers
// ----------------------------------------------------------------------------

// Market value from comps, adjusted for size. Falls back to list price when
// no comps are available (a real feed always supplies them).
export function estimateMarketValue(property: Property): number {
  const usable = property.comps.filter((c) => c.sqft > 0);
  if (usable.length === 0) return property.listPrice;

  const pricePerSqft = weightedPricePerSqft(usable);
  const compValue = pricePerSqft * property.sqft;

  // Blend comp-derived value with list price to avoid single-source error.
  return Math.round(compValue * 0.8 + property.listPrice * 0.2);
}

// Recent + nearby comps weigh more.
function weightedPricePerSqft(comps: Comp[]): number {
  let weightSum = 0;
  let valueSum = 0;
  const now = Date.now();
  for (const c of comps) {
    const ageDays = Math.max(
      1,
      (now - new Date(c.soldDate).getTime()) / 86_400_000
    );
    const recencyWeight = 1 / Math.sqrt(ageDays);
    const proximityWeight = 1 / (1 + c.distanceMiles);
    const weight = recencyWeight * proximityWeight;
    weightSum += weight;
    valueSum += (c.soldPrice / c.sqft) * weight;
  }
  return valueSum / weightSum;
}

// Infer how much work the property needs from listing language + age.
export function inferRehabLevel(property: Property): RehabLevel {
  const remarks = property.listingRemarks.toLowerCase();
  const heavyWords = ["gut", "down to studs", "full rehab", "tear", "rebuild"];
  const moderateWords = [
    "needs work",
    "tlc",
    "handyman",
    "fixer",
    "as-is",
    "as is",
    "investor special",
    "needs updating",
  ];
  const turnkeyWords = [
    "remodeled",
    "updated",
    "move-in ready",
    "move in ready",
    "renovated",
    "turnkey",
    "new kitchen",
  ];

  if (heavyWords.some((w) => remarks.includes(w))) return "heavy";
  if (turnkeyWords.some((w) => remarks.includes(w))) return "cosmetic";
  if (moderateWords.some((w) => remarks.includes(w))) return "moderate";

  // Older homes with no "updated" language tend to need cosmetic refresh.
  const age = new Date().getFullYear() - property.yearBuilt;
  return age > 25 ? "moderate" : "cosmetic";
}

// ARV = the resale value after a cosmetic refresh. We lift the best comps to
// the top of the local range rather than just adding rehab dollars.
export function estimateArv(property: Property, marketValue: number): number {
  const usable = property.comps.filter((c) => c.sqft > 0);
  if (usable.length === 0) return Math.round(marketValue * 1.08);

  // ARV anchored to the strongest (highest $/sqft) recent comps — what a
  // renovated version of this house resells for.
  const perSqft = usable
    .map((c) => c.soldPrice / c.sqft)
    .sort((a, b) => b - a);
  const topQuartile =
    perSqft.slice(0, Math.max(1, Math.ceil(perSqft.length / 4)));
  const arvPerSqft =
    topQuartile.reduce((s, v) => s + v, 0) / topQuartile.length;

  return Math.round(Math.max(arvPerSqft * property.sqft, marketValue));
}

export function estimateRehabCost(
  property: Property,
  level: RehabLevel,
  profile: InvestorProfile
): number {
  const perSqft = profile.rehabCostPerSqft[level];
  const raw = perSqft * property.sqft;
  // Floor of $8k covers fixed costs (dumpster, permits, cleaning) on tiny homes.
  return Math.round(Math.max(raw, 8_000));
}

// ----------------------------------------------------------------------------
// Full analysis
// ----------------------------------------------------------------------------

export function analyzeProperty(
  property: Property,
  profile: InvestorProfile = DEFAULT_PROFILE
): DealAnalysis {
  const estimatedMarketValue = estimateMarketValue(property);
  const rehabLevel = inferRehabLevel(property);
  const estimatedArv = estimateArv(property, estimatedMarketValue);
  const estimatedRehabCost = estimateRehabCost(property, rehabLevel, profile);

  const purchasePrice = property.listPrice;
  const holdingMonths = profile.targetHoldMonths;

  // Holding costs: taxes, insurance, utilities, lawn ~ 1.5% of value / year.
  const holdingCostMonthly = Math.round(
    (estimatedMarketValue * 0.015) / 12 + 250
  );
  const holdingCostTotal = holdingCostMonthly * holdingMonths;

  const closingCostBuy = Math.round(purchasePrice * CLOSING_COST_BUY_PCT);
  const closingCostSell = Math.round(estimatedArv * SELLING_COST_PCT);

  // Financing cost on the borrowed portion of the all-in basis.
  const allInBeforeFinance =
    purchasePrice + estimatedRehabCost + holdingCostTotal + closingCostBuy;
  const borrowed = allInBeforeFinance * (profile.financing.loanToCostPct / 100);
  const interest =
    borrowed * (profile.financing.annualRatePct / 100) * (holdingMonths / 12);
  const points = borrowed * (profile.financing.pointsPct / 100);
  const financingCost = Math.round(interest + points);

  const totalCost =
    purchasePrice +
    estimatedRehabCost +
    holdingCostTotal +
    closingCostBuy +
    closingCostSell +
    financingCost;

  const estimatedNetProfit = Math.round(estimatedArv - totalCost);

  const cashInvested = Math.max(
    allInBeforeFinance - borrowed + closingCostSell + financingCost,
    1
  );
  const profitMarginPct = round1((estimatedNetProfit / estimatedArv) * 100);
  const estimatedRoiPct = round1((estimatedNetProfit / cashInvested) * 100);

  // Cost of capital this deal must beat (annualized borrowing rate).
  const costOfCapitalPct = profile.financing.annualRatePct;
  const annualizedReturn =
    estimatedRoiPct * (12 / Math.max(holdingMonths, 1));
  const clearsCostOfCapital = annualizedReturn > costOfCapitalPct;

  const discountToMarketPct = round1(
    ((estimatedMarketValue - purchasePrice) / estimatedMarketValue) * 100
  );
  const discountToArvPct = round1(
    ((estimatedArv - purchasePrice) / estimatedArv) * 100
  );

  // Maximum Allowable Offer. Classic 70% rule on ARV, less rehab, then capped
  // so the investor's minimum profit is preserved.
  const seventyRuleMao = estimatedArv * 0.7 - estimatedRehabCost;
  const profitConstrainedMao =
    estimatedArv -
    estimatedRehabCost -
    holdingCostTotal -
    closingCostBuy -
    closingCostSell -
    financingCost -
    profile.minProfit;
  const recommendedMaxOffer = Math.round(
    Math.max(0, Math.min(seventyRuleMao, profitConstrainedMao))
  );

  // Backup rental exit.
  const monthlyCashFlow = Math.round(
    property.estimatedRentMonthly - holdingCostMonthly - borrowed * 0.005
  );
  const annualNoi = (property.estimatedRentMonthly - holdingCostMonthly) * 12;
  const capRatePct = round1((annualNoi / estimatedMarketValue) * 100);

  const classification = classifyDeal(estimatedNetProfit, profile);
  const recommendedStrategy = recommendStrategy({
    property,
    estimatedNetProfit,
    rehabLevel,
    clearsCostOfCapital,
    monthlyCashFlow,
    profile,
  });

  return {
    estimatedMarketValue,
    estimatedArv,
    rehabLevel,
    estimatedRehabCost,
    purchasePrice,
    holdingCostMonthly,
    holdingMonths,
    holdingCostTotal,
    closingCostBuy,
    closingCostSell,
    financingCost,
    estimatedNetProfit,
    profitMarginPct,
    estimatedRoiPct,
    cashOnCashPct: estimatedRoiPct,
    costOfCapitalPct,
    clearsCostOfCapital,
    discountToMarketPct,
    discountToArvPct,
    recommendedMaxOffer,
    recommendedStrategy,
    classification,
    monthlyCashFlow,
    capRatePct,
  };
}

function classifyDeal(
  profit: number,
  profile: InvestorProfile
): DealClassification {
  if (profit > 100_000) return "gold";
  if (profit >= 50_000) return "silver";
  if (profit >= 25_000) return "bronze";
  // Anything under the investor's own minimum is a reject for them.
  return profit >= profile.minProfit ? "bronze" : "reject";
}

function recommendStrategy(args: {
  property: Property;
  estimatedNetProfit: number;
  rehabLevel: RehabLevel;
  clearsCostOfCapital: boolean;
  monthlyCashFlow: number;
  profile: InvestorProfile;
}): InvestorStrategy {
  const {
    property,
    estimatedNetProfit,
    rehabLevel,
    clearsCostOfCapital,
    monthlyCashFlow,
    profile,
  } = args;

  // Deal-killers or work beyond the cosmetic appetite => not a flip for us.
  const tooMuchWork = rehabLevel === "heavy" || rehabLevel === "gut";
  const hasKillers = property.dealKillers.length > 0;

  if (estimatedNetProfit < profile.minProfit || !clearsCostOfCapital) {
    // Still might be a wholesale assignment for someone on the buyers list.
    return estimatedNetProfit > 15_000 ? "wholesale" : "avoid";
  }
  if (hasKillers || tooMuchWork) {
    // We don't touch it, but it can be assigned to a heavier-rehab buyer.
    return "wholesale";
  }
  if (estimatedNetProfit >= profile.minProfit) return "flip";
  if (monthlyCashFlow > 300) return "rental_hold";
  return "avoid";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
