"use client";

import ScoreRing from "./ScoreRing";
import type { DealWithMatches } from "../lib/deals";
import {
  currency,
  STRATEGY_LABEL,
  CLASSIFICATION_LABEL,
  CLASSIFICATION_COLOR,
} from "../lib/format";

export default function DealList({
  deals,
  onOpen,
}: {
  deals: DealWithMatches[];
  onOpen: (deal: DealWithMatches) => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div
        className="hidden md:grid grid-cols-[56px_1fr_repeat(5,minmax(0,90px))_110px] gap-3 px-4 py-2.5 text-[11px] uppercase tracking-wide"
        style={{ background: "var(--surface-2)", color: "var(--muted)" }}
      >
        <div>Score</div>
        <div>Property</div>
        <div className="text-right">List</div>
        <div className="text-right">ARV</div>
        <div className="text-right">Profit</div>
        <div className="text-right">ROI</div>
        <div className="text-right">Below Mkt</div>
        <div className="text-right">Class</div>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {deals.map((deal) => {
          const { property, analysis, score } = deal;
          const classColor = CLASSIFICATION_COLOR[analysis.classification];
          return (
            <button
              key={property.id}
              onClick={() => onOpen(deal)}
              className="w-full text-left grid grid-cols-[56px_1fr] md:grid-cols-[56px_1fr_repeat(5,minmax(0,90px))_110px] gap-3 px-4 py-3 items-center hover:bg-[var(--surface-2)] transition-colors"
            >
              <ScoreRing score={score.total} tier={score.tier} size={44} />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {property.address}
                </div>
                <div className="text-xs truncate" style={{ color: "var(--muted)" }}>
                  {property.city} {property.zip} · {property.beds}bd/{property.baths}ba ·{" "}
                  {STRATEGY_LABEL[analysis.recommendedStrategy]}
                  {deal.strongBuyerMatches.length > 0 &&
                    ` · ★${deal.strongBuyerMatches.length}`}
                </div>
              </div>
              <div className="hidden md:block text-right text-sm">
                {currency(property.listPrice, true)}
              </div>
              <div className="hidden md:block text-right text-sm">
                {currency(analysis.estimatedArv, true)}
              </div>
              <div
                className="hidden md:block text-right text-sm font-semibold"
                style={{ color: analysis.estimatedNetProfit >= 45_000 ? "var(--accent)" : undefined }}
              >
                {currency(analysis.estimatedNetProfit, true)}
              </div>
              <div className="hidden md:block text-right text-sm">
                {analysis.estimatedRoiPct}%
              </div>
              <div className="hidden md:block text-right text-sm">
                {analysis.discountToMarketPct}%
              </div>
              <div className="hidden md:flex justify-end">
                <span className="pill" style={{ background: `${classColor}22`, color: classColor }}>
                  {CLASSIFICATION_LABEL[analysis.classification]}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
