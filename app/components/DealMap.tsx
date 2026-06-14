"use client";

import { useState } from "react";
import type { DealWithMatches } from "../lib/deals";
import { currency, TIER_COLOR } from "../lib/format";

// A lightweight, dependency-free map. Markers are positioned by normalizing
// lat/lng within the bounding box of the current deals. When a Google Maps API
// key is added, this component is swapped for a real interactive map — the
// marker data and click behavior stay identical.
export default function DealMap({
  deals,
  onOpen,
}: {
  deals: DealWithMatches[];
  onOpen: (deal: DealWithMatches) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const lats = deals.map((d) => d.property.lat);
  const lngs = deals.map((d) => d.property.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const pad = 0.08;

  const pos = (lat: number, lng: number) => {
    const x =
      ((lng - minLng) / (maxLng - minLng || 1)) * (100 - pad * 200) + pad * 100;
    const y =
      (1 - (lat - minLat) / (maxLat - minLat || 1)) * (100 - pad * 200) +
      pad * 100;
    return { left: `${x}%`, top: `${y}%` };
  };

  return (
    <div
      className="card map-grid-bg relative overflow-hidden"
      style={{ height: 560 }}
    >
      <div
        className="absolute top-3 left-3 z-10 rounded-lg px-3 py-1.5 text-xs"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}
      >
        Las Vegas Metro · {deals.length} deals · marker color = score tier
      </div>

      {deals.map((deal) => {
        const p = pos(deal.property.lat, deal.property.lng);
        const color = TIER_COLOR[deal.score.tier];
        const isHover = hovered === deal.property.id;
        return (
          <button
            key={deal.property.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
            style={p}
            onMouseEnter={() => setHovered(deal.property.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onOpen(deal)}
          >
            <div
              className="flex items-center justify-center rounded-full font-bold text-[11px] text-white transition-transform"
              style={{
                width: 30,
                height: 30,
                background: color,
                border: "2px solid white",
                transform: isHover ? "scale(1.25)" : "scale(1)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
              }}
            >
              {deal.score.total}
            </div>
            {isHover && (
              <div
                className="absolute left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap rounded-lg px-2 py-1 text-xs z-30"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {deal.property.address} · {currency(deal.analysis.estimatedNetProfit, true)} profit
              </div>
            )}
          </button>
        );
      })}

      <div
        className="absolute bottom-3 right-3 z-10 rounded-lg px-3 py-2 text-[11px] space-y-1"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {(
          [
            ["elite", "90-100 Elite"],
            ["high_priority", "85-89 High"],
            ["strong", "75-84 Strong"],
            ["average", "60-74 Average"],
            ["low", "<60 Low"],
          ] as const
        ).map(([tier, label]) => (
          <div key={tier} className="flex items-center gap-2">
            <span
              className="rounded-full"
              style={{ width: 10, height: 10, background: TIER_COLOR[tier] }}
            />
            <span style={{ color: "var(--muted)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
