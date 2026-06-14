"use client";

import ScoreRing from "./ScoreRing";
import type { DealWithMatches } from "../lib/deals";
import { TIER_LABEL } from "../lib/scoring";
import {
  currency,
  PROPERTY_TYPE_LABEL,
  STRATEGY_LABEL,
  CLASSIFICATION_LABEL,
  CLASSIFICATION_COLOR,
  TIER_COLOR,
} from "../lib/format";

export default function DealCard({
  deal,
  onOpen,
}: {
  deal: DealWithMatches;
  onOpen: (deal: DealWithMatches) => void;
}) {
  const { property, analysis, score } = deal;
  const classColor = CLASSIFICATION_COLOR[analysis.classification];

  return (
    <button
      onClick={() => onOpen(deal)}
      className="card card-hover text-left p-4 w-full flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <ScoreRing score={score.total} tier={score.tier} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="pill"
              style={{ background: `${classColor}22`, color: classColor }}
            >
              {CLASSIFICATION_LABEL[analysis.classification]}
            </span>
            <span
              className="pill"
              style={{
                background: `${TIER_COLOR[score.tier]}22`,
                color: TIER_COLOR[score.tier],
              }}
            >
              {TIER_LABEL[score.tier]}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-white mt-1.5 truncate">
            {property.address}
          </h3>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {property.city}, {property.state} {property.zip} ·{" "}
            {PROPERTY_TYPE_LABEL[property.propertyType]} · {property.beds}bd/
            {property.baths}ba · {property.sqft.toLocaleString()} sqft
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="List" value={currency(property.listPrice, true)} />
        <Metric label="ARV" value={currency(analysis.estimatedArv, true)} />
        <Metric
          label="Net Profit"
          value={currency(analysis.estimatedNetProfit, true)}
          highlight={analysis.estimatedNetProfit >= 45_000}
        />
        <Metric label="ROI" value={`${analysis.estimatedRoiPct}%`} />
        <Metric
          label="Below Mkt"
          value={`${analysis.discountToMarketPct}%`}
          highlight={analysis.discountToMarketPct >= 15}
        />
        <Metric
          label="Strategy"
          value={STRATEGY_LABEL[analysis.recommendedStrategy]}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span style={{ color: "var(--muted)" }}>
          {property.daysOnMarket} days on market
        </span>
        {deal.strongBuyerMatches.length > 0 && (
          <span
            className="pill"
            style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}
          >
            ★ {deal.strongBuyerMatches.length} buyer match
            {deal.strongBuyerMatches.length > 1 ? "es" : ""}
          </span>
        )}
      </div>
    </button>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-lg px-2 py-1.5"
      style={{ background: "var(--surface-2)" }}
    >
      <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      <div
        className="text-sm font-semibold"
        style={{ color: highlight ? "var(--accent)" : "var(--foreground)" }}
      >
        {value}
      </div>
    </div>
  );
}
