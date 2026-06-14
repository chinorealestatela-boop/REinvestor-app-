// ============================================================================
// Investor Deal Scoring Engine (1-100)
// ============================================================================
// Implements the proprietary score with the weights defined during the product
// interview. Each factor is normalized to 0-1, multiplied by its weight, and
// summed. The result drives ranking, alerts, and tier badges.

import type {
  Property,
  DealAnalysis,
  DealScore,
  ScoreBreakdown,
  ScoreTier,
} from "./types";

// Weights must sum to 100.
export const SCORE_WEIGHTS = {
  arvSpread: 30,
  discountToMarket: 20,
  rehabEfficiency: 15,
  neighborhoodGrowth: 10,
  daysOnMarket: 10,
  priceReductionHistory: 5,
  rentalDemand: 5,
  investorCompetition: 5,
} as const;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function scoreDeal(
  property: Property,
  analysis: DealAnalysis
): DealScore {
  // --- ARV spread (30%): profit relative to a strong $100k target ---------
  const arvSpreadNorm = clamp01(analysis.estimatedNetProfit / 100_000);

  // --- Discount to market (20%): 25%+ under market is a max signal --------
  const discountNorm = clamp01(analysis.discountToMarketPct / 25);

  // --- Rehab efficiency (15%): less work needed = higher (fits buy box) ---
  const rehabEffNorm = {
    cosmetic: 1,
    moderate: 0.65,
    heavy: 0.25,
    gut: 0,
  }[analysis.rehabLevel];

  // --- Neighborhood growth (10%) -----------------------------------------
  const growthNorm = clamp01((property.neighborhoodGrowth + 10) / 25);

  // --- Days on market (10%): longer DOM = more motivated seller ----------
  const domNorm = clamp01(property.daysOnMarket / 90);

  // --- Price reduction history (5%) --------------------------------------
  const reductions = property.priceHistory.filter(
    (p) => p.event === "price_change"
  ).length;
  const reductionNorm = clamp01(reductions / 3);

  // --- Rental demand (5%) -------------------------------------------------
  const rentalNorm = clamp01(property.rentalDemand / 100);

  // --- Investor competition (5%): lower competition scores higher --------
  const competitionNorm = clamp01((100 - property.investorCompetition) / 100);

  const breakdown: ScoreBreakdown = {
    arvSpread: arvSpreadNorm * SCORE_WEIGHTS.arvSpread,
    discountToMarket: discountNorm * SCORE_WEIGHTS.discountToMarket,
    rehabEfficiency: rehabEffNorm * SCORE_WEIGHTS.rehabEfficiency,
    neighborhoodGrowth: growthNorm * SCORE_WEIGHTS.neighborhoodGrowth,
    daysOnMarket: domNorm * SCORE_WEIGHTS.daysOnMarket,
    priceReductionHistory: reductionNorm * SCORE_WEIGHTS.priceReductionHistory,
    rentalDemand: rentalNorm * SCORE_WEIGHTS.rentalDemand,
    investorCompetition: competitionNorm * SCORE_WEIGHTS.investorCompetition,
  };

  let total = Object.values(breakdown).reduce((s, v) => s + v, 0);

  // Hard penalty: deal-killers make this a no-go for the cosmetic buy box.
  if (property.dealKillers.length > 0) {
    total *= 0.5;
  }
  // Penalty: doesn't beat cost of capital.
  if (!analysis.clearsCostOfCapital) {
    total *= 0.85;
  }

  total = Math.round(clamp01(total / 100) * 100);
  total = Math.max(1, total);

  return {
    total,
    tier: tierFor(total),
    breakdown,
    reasons: buildReasons(property, analysis),
    riskFactors: buildRisks(property, analysis),
    opportunityFactors: buildOpportunities(property, analysis),
  };
}

export function tierFor(total: number): ScoreTier {
  if (total >= 90) return "elite";
  if (total >= 85) return "high_priority";
  if (total >= 75) return "strong";
  if (total >= 60) return "average";
  return "low";
}

export const TIER_LABEL: Record<ScoreTier, string> = {
  elite: "Elite Opportunity",
  high_priority: "High Priority",
  strong: "Strong Opportunity",
  average: "Average Opportunity",
  low: "Low Priority",
};

function buildReasons(property: Property, analysis: DealAnalysis): string[] {
  const reasons: string[] = [];
  if (analysis.discountToMarketPct >= 25)
    reasons.push(
      `Listed ${analysis.discountToMarketPct}% below estimated market value`
    );
  else if (analysis.discountToMarketPct >= 15)
    reasons.push(
      `Listed ${analysis.discountToMarketPct}% under market — pricing inefficiency`
    );
  if (analysis.estimatedNetProfit >= 50_000)
    reasons.push(
      `Projected net profit of $${analysis.estimatedNetProfit.toLocaleString()}`
    );
  if (analysis.rehabLevel === "cosmetic")
    reasons.push("Cosmetic-only rehab fits the clean buy box");
  if (property.daysOnMarket >= 60)
    reasons.push(`${property.daysOnMarket} days on market — likely motivated`);
  const reductions = property.priceHistory.filter(
    (p) => p.event === "price_change"
  ).length;
  if (reductions > 0)
    reasons.push(`${reductions} price reduction(s) since listing`);
  for (const sig of property.distressSignals) {
    reasons.push(DISTRESS_LABEL[sig]);
  }
  return reasons;
}

function buildRisks(property: Property, analysis: DealAnalysis): string[] {
  const risks: string[] = [];
  for (const k of property.dealKillers) risks.push(KILLER_LABEL[k]);
  if (!analysis.clearsCostOfCapital)
    risks.push(
      `Annualized return may not clear ${analysis.costOfCapitalPct}% cost of capital`
    );
  if (property.crimeScore < 40)
    risks.push("Below-average neighborhood safety score");
  if (property.floodZone) risks.push("Located in a FEMA flood zone");
  if (property.investorCompetition > 70)
    risks.push("High investor competition in this area");
  if (analysis.rehabLevel === "heavy" || analysis.rehabLevel === "gut")
    risks.push("Rehab scope exceeds cosmetic appetite");
  if (property.daysOnMarket < 5)
    risks.push("Very new listing — limited negotiating leverage yet");
  return risks;
}

function buildOpportunities(
  property: Property,
  analysis: DealAnalysis
): string[] {
  const opps: string[] = [];
  if (analysis.discountToArvPct >= 30)
    opps.push(`${analysis.discountToArvPct}% discount to ARV`);
  if (property.neighborhoodGrowth > 5)
    opps.push(`Appreciating area (+${property.neighborhoodGrowth}% YoY)`);
  if (property.investorCompetition < 35)
    opps.push("Low investor competition — overlooked");
  if (property.crimeScore >= 70) opps.push("Strong neighborhood safety score");
  if (property.schoolScore >= 70) opps.push("Good schools support resale");
  if (analysis.monthlyCashFlow > 300)
    opps.push("Positive cash flow as a rental fallback");
  return opps;
}

const DISTRESS_LABEL: Record<string, string> = {
  pre_foreclosure: "Pre-foreclosure — motivated seller",
  foreclosure: "Active foreclosure",
  reo: "Bank-owned (REO)",
  probate: "Probate sale",
  estate_sale: "Estate sale",
  tax_delinquent: "Tax delinquent",
  absentee_owner: "Absentee owner",
  vacant: "Vacant property",
  code_violation: "Open code violation",
  long_dom: "Long days on market",
  major_price_reduction: "Major price reduction",
  motivated_seller: "Motivated seller signals detected",
};

const KILLER_LABEL: Record<string, string> = {
  foundation: "Possible foundation issues",
  structural: "Structural concerns",
  mold: "Mold / water damage indicated",
  fire_damage: "Fire damage",
  unpermitted_addition: "Unpermitted addition",
  major_electrical: "Major electrical work needed",
  major_plumbing: "Major plumbing work needed",
  title_issue: "Title issue / clouded title",
  lien: "Lien against the property",
};
