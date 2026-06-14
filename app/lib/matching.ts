// ============================================================================
// Buyer Matching Engine
// ============================================================================
// Routes every scored deal against each buyer's saved buy box. Powers the
// "this deal fits Buyer X" alerts and the auto-generated CMA emails. The goal
// is precision: only surface genuinely relevant deals so the buyers list never
// gets spammed.

import type {
  Buyer,
  ScoredDeal,
  BuyerMatch,
  RehabLevel,
  PropertyType,
} from "./types";

const REHAB_RANK: Record<RehabLevel, number> = {
  cosmetic: 1,
  moderate: 2,
  heavy: 3,
  gut: 4,
};

// Score a single deal against a single buyer. Returns null if it violates a
// hard constraint (price ceiling, deal-killer for a buyer who won't rehab,
// excluded area). Otherwise returns a 0-100 fit score with explanations.
export function matchDealToBuyer(
  deal: ScoredDeal,
  buyer: Buyer
): BuyerMatch | null {
  if (!buyer.active) return null;

  const { property, analysis } = deal;
  const box = buyer.buyBox;
  const matchedOn: string[] = [];
  const failedOn: string[] = [];

  // --- Hard constraints (any failure rejects the match) ------------------
  if (property.listPrice > box.maxPrice) {
    failedOn.push(`Over budget ($${property.listPrice.toLocaleString()})`);
    return null;
  }
  if (box.minPrice > 0 && property.listPrice < box.minPrice) {
    failedOn.push("Below buyer's minimum price");
    return null;
  }
  if (
    box.zips.length > 0 &&
    !box.zips.includes(property.zip) &&
    box.cities.length > 0 &&
    !box.cities.includes(property.city)
  ) {
    failedOn.push("Outside target areas");
    return null;
  }
  if (
    box.propertyTypes.length > 0 &&
    !box.propertyTypes.includes(property.propertyType as PropertyType)
  ) {
    failedOn.push("Property type not wanted");
    return null;
  }
  if (
    REHAB_RANK[analysis.rehabLevel] > REHAB_RANK[box.maxRehabLevel]
  ) {
    failedOn.push("More rehab than buyer wants");
    return null;
  }
  if (box.avoidHighCrime && property.crimeScore < 40) {
    failedOn.push("Buyer avoids high-crime areas");
    return null;
  }

  // --- Soft scoring (the deal qualifies; how good is the fit?) -----------
  let score = 0;

  // Price headroom (cheaper relative to ceiling is better). 25 pts.
  const headroom = 1 - property.listPrice / Math.max(box.maxPrice, 1);
  score += Math.max(0, headroom) * 25;
  matchedOn.push("Within budget");

  // Profit vs. buyer's minimum. 25 pts.
  if (analysis.estimatedNetProfit >= box.minProfit) {
    score += 25;
    matchedOn.push(
      `Profit $${analysis.estimatedNetProfit.toLocaleString()} ≥ target`
    );
  } else {
    score += 25 * (analysis.estimatedNetProfit / Math.max(box.minProfit, 1));
    failedOn.push("Profit below buyer's target");
  }

  // ROI vs. buyer's minimum. 15 pts.
  if (analysis.estimatedRoiPct >= box.minRoiPct) {
    score += 15;
    matchedOn.push(`ROI ${analysis.estimatedRoiPct}% ≥ target`);
  } else {
    score += 15 * (analysis.estimatedRoiPct / Math.max(box.minRoiPct, 1));
  }

  // Strategy alignment. 15 pts.
  if (box.strategies.includes(analysis.recommendedStrategy)) {
    score += 15;
    matchedOn.push(`Matches ${analysis.recommendedStrategy} strategy`);
  }

  // Beds / baths. 10 pts.
  if (property.beds >= box.minBeds && property.baths >= box.minBaths) {
    score += 10;
    matchedOn.push(`${property.beds}bd / ${property.baths}ba meets minimum`);
  } else {
    failedOn.push("Below bed/bath minimum");
  }

  // Area is an explicit target (bonus). 10 pts.
  if (
    box.zips.includes(property.zip) ||
    box.cities.includes(property.city)
  ) {
    score += 10;
    matchedOn.push(`In target area (${property.city} ${property.zip})`);
  } else if (box.zips.length === 0 && box.cities.length === 0) {
    score += 5; // buyer is area-agnostic
  }

  return {
    buyer,
    deal,
    matchScore: Math.round(Math.max(0, Math.min(100, score))),
    matchedOn,
    failedOn,
  };
}

// For one deal, return every buyer it fits, best fit first.
export function matchDealToBuyers(
  deal: ScoredDeal,
  buyers: Buyer[]
): BuyerMatch[] {
  return buyers
    .map((b) => matchDealToBuyer(deal, b))
    .filter((m): m is BuyerMatch => m !== null)
    .sort((a, b) => b.matchScore - a.matchScore);
}

// For one buyer, return every current deal that fits, best fit first.
export function matchBuyerToDeals(
  buyer: Buyer,
  deals: ScoredDeal[]
): BuyerMatch[] {
  return deals
    .map((d) => matchDealToBuyer(d, buyer))
    .filter((m): m is BuyerMatch => m !== null)
    .sort((a, b) => b.matchScore - a.matchScore);
}

// Only surface strong matches for proactive CMA emails to avoid spamming.
export const STRONG_MATCH_THRESHOLD = 70;

export function strongMatches(matches: BuyerMatch[]): BuyerMatch[] {
  return matches.filter((m) => m.matchScore >= STRONG_MATCH_THRESHOLD);
}
