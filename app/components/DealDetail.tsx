"use client";

import ScoreRing from "./ScoreRing";
import type { DealWithMatches } from "../lib/deals";
import { TIER_LABEL, SCORE_WEIGHTS } from "../lib/scoring";
import {
  currency,
  PROPERTY_TYPE_LABEL,
  STRATEGY_LABEL,
  CLASSIFICATION_LABEL,
  CLASSIFICATION_COLOR,
} from "../lib/format";

export default function DealDetail({
  deal,
  onClose,
}: {
  deal: DealWithMatches | null;
  onClose: () => void;
}) {
  if (!deal) return null;
  const { property, analysis, score } = deal;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-xl overflow-y-auto screen-enter"
        style={{ background: "var(--bg)", borderLeft: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <ScoreRing score={score.total} tier={score.tier} size={48} />
            <div>
              <h2 className="text-base font-semibold text-white">{property.address}</h2>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {property.city}, {property.state} {property.zip} · {TIER_LABEL[score.tier]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm"
            style={{ background: "var(--surface-2)", color: "var(--muted)" }}
          >
            Close
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Headline numbers */}
          <div className="grid grid-cols-2 gap-3">
            <Big label="List Price" value={currency(property.listPrice)} />
            <Big label="Est. Market Value" value={currency(analysis.estimatedMarketValue)} />
            <Big label="Est. ARV" value={currency(analysis.estimatedArv)} />
            <Big
              label="Est. Net Profit"
              value={currency(analysis.estimatedNetProfit)}
              accent
            />
          </div>

          {/* Classification + strategy */}
          <div className="flex flex-wrap gap-2">
            <Tag
              text={CLASSIFICATION_LABEL[analysis.classification]}
              color={CLASSIFICATION_COLOR[analysis.classification]}
            />
            <Tag text={`Strategy: ${STRATEGY_LABEL[analysis.recommendedStrategy]}`} color="#3b82f6" />
            <Tag text={`${analysis.rehabLevel} rehab`} color="#a78bfa" />
            <Tag
              text={analysis.clearsCostOfCapital ? "Beats cost of capital" : "Tight vs. cost of capital"}
              color={analysis.clearsCostOfCapital ? "#10b981" : "#f59e0b"}
            />
          </div>

          {/* Financial breakdown */}
          <Section title="Deal Analysis">
            <Row label="Estimated Rehab Cost" value={currency(analysis.estimatedRehabCost)} />
            <Row label="Holding Costs" value={`${currency(analysis.holdingCostTotal)} (${analysis.holdingMonths} mo)`} />
            <Row label="Closing (Buy)" value={currency(analysis.closingCostBuy)} />
            <Row label="Closing (Sell)" value={currency(analysis.closingCostSell)} />
            <Row label="Financing Cost" value={currency(analysis.financingCost)} />
            <Row label="Projected ROI" value={`${analysis.estimatedRoiPct}%`} />
            <Row label="Profit Margin" value={`${analysis.profitMarginPct}%`} />
            <Row label="Discount to Market" value={`${analysis.discountToMarketPct}%`} />
            <Row label="Discount to ARV" value={`${analysis.discountToArvPct}%`} />
            <Row
              label="Recommended Max Offer"
              value={currency(analysis.recommendedMaxOffer)}
              accent
            />
            <Row label="Rental Cash Flow (fallback)" value={`${currency(analysis.monthlyCashFlow)}/mo`} />
            <Row label="Cap Rate" value={`${analysis.capRatePct}%`} />
          </Section>

          {/* Score breakdown */}
          <Section title="Score Breakdown (1-100)">
            {(
              Object.keys(SCORE_WEIGHTS) as (keyof typeof SCORE_WEIGHTS)[]
            ).map((k) => (
              <ScoreBar
                key={k}
                label={LABELS[k]}
                value={score.breakdown[k]}
                max={SCORE_WEIGHTS[k]}
              />
            ))}
          </Section>

          {/* Neighborhood */}
          <Section title="Neighborhood Intelligence">
            <Row label="Safety Score" value={`${property.crimeScore}/100`} />
            <Row label="School Score" value={`${property.schoolScore}/100`} />
            <Row label="Rental Demand" value={`${property.rentalDemand}/100`} />
            <Row label="Investor Competition" value={`${property.investorCompetition}/100`} />
            <Row label="Neighborhood Growth" value={`${property.neighborhoodGrowth}% YoY`} />
            <Row label="Flood Zone" value={property.floodZone ? "Yes" : "No"} />
          </Section>

          {/* Why selected / risks / opportunities */}
          {score.reasons.length > 0 && (
            <ListSection title="Why It Was Selected" items={score.reasons} color="#10b981" />
          )}
          {score.opportunityFactors.length > 0 && (
            <ListSection title="Opportunity Factors" items={score.opportunityFactors} color="#3b82f6" />
          )}
          {score.riskFactors.length > 0 && (
            <ListSection title="Risk Factors" items={score.riskFactors} color="#f59e0b" />
          )}

          {/* Buyer matches */}
          {deal.buyerMatches.length > 0 && (
            <Section title={`Buyer Matches (${deal.buyerMatches.length})`}>
              {deal.buyerMatches.map((m) => (
                <div
                  key={m.buyer.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 mb-2"
                  style={{ background: "var(--surface-2)" }}
                >
                  <div>
                    <div className="text-sm font-medium text-white">
                      {m.buyer.name}
                      {m.buyer.company ? ` · ${m.buyer.company}` : ""}
                    </div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>
                      {m.matchedOn.slice(0, 2).join(" · ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-sm font-bold"
                      style={{ color: m.matchScore >= 70 ? "#60a5fa" : "var(--muted)" }}
                    >
                      {m.matchScore}%
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--muted)" }}>
                      match
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                In production, a strong match (≥70%) auto-generates a CMA and emails it to the buyer.
              </p>
            </Section>
          )}

          {/* Listing remarks */}
          <Section title="Listing Remarks">
            <p className="text-sm" style={{ color: "var(--foreground)" }}>
              {property.listingRemarks}
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

const LABELS: Record<string, string> = {
  arvSpread: "ARV Spread (30%)",
  discountToMarket: "Discount to Market (20%)",
  rehabEfficiency: "Rehab Efficiency (15%)",
  neighborhoodGrowth: "Neighborhood Growth (10%)",
  daysOnMarket: "Days on Market (10%)",
  priceReductionHistory: "Price Reductions (5%)",
  rentalDemand: "Rental Demand (5%)",
  investorCompetition: "Low Competition (5%)",
};

function Big({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-3">
      <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      <div
        className="text-lg font-bold mt-0.5"
        style={{ color: accent ? "var(--accent)" : "var(--foreground)" }}
      >
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--muted)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span className="font-medium" style={{ color: accent ? "var(--accent)" : "var(--foreground)" }}>
        {value}
      </span>
    </div>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  return (
    <span className="pill" style={{ background: `${color}22`, color }}>
      {text}
    </span>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = (value / max) * 100;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: "var(--muted)" }}>{label}</span>
        <span style={{ color: "var(--foreground)" }}>
          {value.toFixed(1)}/{max}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "var(--surface-2)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: "var(--accent)" }}
        />
      </div>
    </div>
  );
}

function ListSection({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color }}>
        {title}
      </h3>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm" style={{ color: "var(--foreground)" }}>
            <span style={{ color }}>•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
