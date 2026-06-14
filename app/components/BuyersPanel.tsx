"use client";

import { useState } from "react";
import type { Buyer, RehabLevel } from "../lib/types";
import type { DealWithMatches } from "../lib/deals";
import { matchBuyerToDeals } from "../lib/matching";
import {
  currency,
  STRATEGY_LABEL,
  PROPERTY_TYPE_LABEL,
} from "../lib/format";

export default function BuyersPanel({
  buyers,
  deals,
  onOpen,
}: {
  buyers: Buyer[];
  deals: DealWithMatches[];
  onOpen: (deal: DealWithMatches) => void;
}) {
  const [openBuyer, setOpenBuyer] = useState<string | null>(buyers[0]?.id ?? null);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-white mb-1">Buyer Network</h2>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {buyers.length} investor partners on your list. Each deal is matched against every buy box;
          strong matches (≥70%) trigger an auto-generated CMA email.
        </p>
      </div>

      {buyers.map((buyer) => {
        const matches = matchBuyerToDeals(buyer, deals).filter((m) => m.matchScore >= 50);
        const isOpen = openBuyer === buyer.id;
        return (
          <div key={buyer.id} className="card overflow-hidden">
            <button
              onClick={() => setOpenBuyer(isOpen ? null : buyer.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{buyer.name}</span>
                  {buyer.company && (
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      {buyer.company}
                    </span>
                  )}
                  {!buyer.active && (
                    <span className="pill" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                      inactive
                    </span>
                  )}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {buyer.email}
                  {buyer.phone ? ` · ${buyer.phone}` : ""}
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-sm font-bold"
                  style={{ color: matches.length > 0 ? "var(--accent)" : "var(--muted)" }}
                >
                  {matches.length}
                </div>
                <div className="text-[10px]" style={{ color: "var(--muted)" }}>
                  matches
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                {/* Buy box */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-3">
                  <BuyBoxItem label="Budget" value={`${currency(buyer.buyBox.minPrice, true)}–${currency(buyer.buyBox.maxPrice, true)}`} />
                  <BuyBoxItem
                    label="Areas"
                    value={
                      [...buyer.buyBox.cities, ...buyer.buyBox.zips].join(", ") || "Any"
                    }
                  />
                  <BuyBoxItem
                    label="Types"
                    value={
                      buyer.buyBox.propertyTypes.length
                        ? buyer.buyBox.propertyTypes.map((t) => PROPERTY_TYPE_LABEL[t]).join(", ")
                        : "Any"
                    }
                  />
                  <BuyBoxItem
                    label="Strategy"
                    value={buyer.buyBox.strategies.map((s) => STRATEGY_LABEL[s]).join(", ")}
                  />
                  <BuyBoxItem label="Min Profit" value={currency(buyer.buyBox.minProfit, true)} />
                  <BuyBoxItem label="Max Rehab" value={REHAB_LABEL[buyer.buyBox.maxRehabLevel]} />
                </div>

                {buyer.notes && (
                  <p className="text-xs italic" style={{ color: "var(--muted)" }}>
                    “{buyer.notes}”
                  </p>
                )}

                {/* Matched deals */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--muted)" }}>
                    Matched Deals
                  </h4>
                  {matches.length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      No current deals match this buy box.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {matches.map((m) => (
                        <button
                          key={m.deal.property.id}
                          onClick={() => onOpen(m.deal as DealWithMatches)}
                          className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left"
                          style={{ background: "var(--surface-2)" }}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {m.deal.property.address}
                            </div>
                            <div className="text-xs truncate" style={{ color: "var(--muted)" }}>
                              {currency(m.deal.analysis.estimatedNetProfit, true)} profit ·{" "}
                              {m.matchedOn.slice(0, 2).join(" · ")}
                            </div>
                          </div>
                          <div className="text-right pl-2">
                            <div
                              className="text-sm font-bold"
                              style={{ color: m.matchScore >= 70 ? "#60a5fa" : "var(--muted)" }}
                            >
                              {m.matchScore}%
                            </div>
                            {m.matchScore >= 70 && (
                              <div className="text-[10px]" style={{ color: "#60a5fa" }}>
                                CMA ready
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="card p-4 text-center">
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          + Adding a new buyer (name, contact, and buy box) is the next build step. Buyer profiles will be
          stored in the database so the AI matches every future scan against them automatically.
        </p>
      </div>
    </div>
  );
}

const REHAB_LABEL: Record<RehabLevel, string> = {
  cosmetic: "Cosmetic",
  moderate: "Moderate",
  heavy: "Heavy",
  gut: "Gut",
};

function BuyBoxItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-2 py-1.5" style={{ background: "var(--surface-2)" }}>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      <div className="text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>
        {value}
      </div>
    </div>
  );
}
