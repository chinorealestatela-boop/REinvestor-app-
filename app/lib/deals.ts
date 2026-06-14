// Assembles raw properties into fully scored deals, and computes the
// market-report summary metrics used on the dashboard.

import type { Property, ScoredDeal, Buyer, BuyerMatch } from "./types";
import { analyzeProperty, DEFAULT_PROFILE, InvestorProfile } from "./analysis";
import { scoreDeal } from "./scoring";
import { matchDealToBuyers, strongMatches } from "./matching";

export function buildScoredDeals(
  properties: Property[],
  profile: InvestorProfile = DEFAULT_PROFILE
): ScoredDeal[] {
  return properties
    .map((property) => {
      const analysis = analyzeProperty(property, profile);
      const score = scoreDeal(property, analysis);
      return { property, analysis, score };
    })
    .sort((a, b) => b.score.total - a.score.total);
}

export interface MarketSummary {
  totalDeals: number;
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
  eliteCount: number;
  avgScore: number;
  avgDiscountToMarket: number;
  totalProjectedProfit: number;
  newToday: number;
  priceReductions: number;
  avgDaysOnMarket: number;
}

export function buildMarketSummary(deals: ScoredDeal[]): MarketSummary {
  const n = deals.length || 1;
  const since = Date.now() - 24 * 3_600_000;
  return {
    totalDeals: deals.length,
    goldCount: deals.filter((d) => d.analysis.classification === "gold").length,
    silverCount: deals.filter((d) => d.analysis.classification === "silver").length,
    bronzeCount: deals.filter((d) => d.analysis.classification === "bronze").length,
    eliteCount: deals.filter((d) => d.score.tier === "elite").length,
    avgScore: Math.round(deals.reduce((s, d) => s + d.score.total, 0) / n),
    avgDiscountToMarket:
      Math.round(
        (deals.reduce((s, d) => s + d.analysis.discountToMarketPct, 0) / n) * 10
      ) / 10,
    totalProjectedProfit: deals.reduce(
      (s, d) => s + Math.max(0, d.analysis.estimatedNetProfit),
      0
    ),
    newToday: deals.filter(
      (d) => new Date(d.property.firstSeen).getTime() >= since
    ).length,
    priceReductions: deals.filter((d) =>
      d.property.priceHistory.some((p) => p.event === "price_change")
    ).length,
    avgDaysOnMarket: Math.round(
      deals.reduce((s, d) => s + d.property.daysOnMarket, 0) / n
    ),
  };
}

// Deals that should trigger an immediate alert per the investor's alert rules.
export function alertDeals(deals: ScoredDeal[]): ScoredDeal[] {
  return deals.filter(
    (d) =>
      d.score.total >= 90 ||
      d.analysis.discountToMarketPct >= 25 ||
      d.analysis.estimatedNetProfit >= 100_000 ||
      d.property.distressSignals.some((s) =>
        ["foreclosure", "pre_foreclosure", "probate"].includes(s)
      )
  );
}

export interface DealWithMatches extends ScoredDeal {
  buyerMatches: BuyerMatch[];
  strongBuyerMatches: BuyerMatch[];
}

export function attachBuyerMatches(
  deals: ScoredDeal[],
  buyers: Buyer[]
): DealWithMatches[] {
  return deals.map((deal) => {
    const buyerMatches = matchDealToBuyers(deal, buyers);
    return {
      ...deal,
      buyerMatches,
      strongBuyerMatches: strongMatches(buyerMatches),
    };
  });
}
