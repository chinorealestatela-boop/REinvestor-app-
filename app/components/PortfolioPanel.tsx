"use client";

import { useEffect, useState } from "react";
import type { PortfolioDeal, DealStage } from "../lib/db/portfolio-repo";
import { currency } from "../lib/format";

const STAGES: DealStage[] = ["offer", "under_contract", "rehab", "listed", "sold"];
const STAGE_LABEL: Record<DealStage, string> = {
  offer: "Offer Submitted",
  under_contract: "Under Contract",
  rehab: "In Rehab",
  listed: "Listed",
  sold: "Sold",
};
const STAGE_COLOR: Record<DealStage, string> = {
  offer: "#f59e0b",
  under_contract: "#3b82f6",
  rehab: "#a78bfa",
  listed: "#10b981",
  sold: "#22c55e",
};

function blankDeal(): Partial<PortfolioDeal> {
  return {
    propertyAddress: "",
    propertyCity: "Las Vegas",
    propertyState: "NV",
    propertyZip: "",
    propertyType: "single_family",
    beds: 3,
    baths: 2,
    sqft: 1500,
    stage: "offer",
    purchasePrice: 0,
    rehabBudget: 20000,
    rehabSpent: 0,
    arv: 0,
    salePrice: null,
    listingDate: null,
    closingDate: null,
    notes: "",
  };
}

export default function PortfolioPanel() {
  const [deals, setDeals] = useState<PortfolioDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioDeal | null>(null);
  const [form, setForm] = useState<Partial<PortfolioDeal>>(blankDeal());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((j) => setDeals(j.deals ?? []))
      .finally(() => setLoading(false));
  }, []);

  const set = (patch: Partial<PortfolioDeal>) => setForm((p) => ({ ...p, ...patch }));

  function openAdd() {
    setEditing(null);
    setForm(blankDeal());
    setFormOpen(true);
  }

  function openEdit(d: PortfolioDeal) {
    setEditing(d);
    setForm({ ...d });
    setFormOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const isEdit = Boolean(editing);
      const res = await fetch(
        isEdit ? `/api/portfolio/${editing!.id}` : "/api/portfolio",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const j = await res.json();
      if (!res.ok) return;
      setDeals((prev) =>
        isEdit
          ? prev.map((d) => (d.id === j.deal.id ? j.deal : d))
          : [j.deal, ...prev]
      );
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this deal from your portfolio?")) return;
    setDeals((prev) => prev.filter((d) => d.id !== id));
    await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
  }

  // P&L summary
  const active = deals.filter((d) => d.stage !== "sold");
  const closed = deals.filter((d) => d.stage === "sold");
  const totalInvested = active.reduce((s, d) => s + d.purchasePrice + d.rehabSpent, 0);
  const totalProfit = closed.reduce(
    (s, d) => s + ((d.salePrice ?? 0) - d.purchasePrice - d.rehabSpent),
    0
  );

  if (loading) {
    return (
      <div className="text-center py-10 text-sm" style={{ color: "var(--muted)" }}>
        Loading portfolio…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Deals" value={String(active.length)} />
        <StatCard label="Capital Deployed" value={currency(totalInvested, true)} accent />
        <StatCard label="Deals Closed" value={String(closed.length)} />
        <StatCard label="Total Realized Profit" value={currency(totalProfit, true)} accent={totalProfit > 0} />
      </div>

      {/* Pipeline board */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Deal Pipeline</h2>
          <button
            onClick={openAdd}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            + Add Deal
          </button>
        </div>

        {deals.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>
            No portfolio deals yet. Click "+ Add Deal" when you have an offer accepted.
          </p>
        ) : (
          <div className="space-y-3">
            {deals.map((d) => {
              const profit = d.stage === "sold"
                ? (d.salePrice ?? 0) - d.purchasePrice - d.rehabSpent
                : d.arv - d.purchasePrice - d.rehabBudget;
              const rehabPct = d.rehabBudget > 0 ? Math.round((d.rehabSpent / d.rehabBudget) * 100) : 0;

              return (
                <div
                  key={d.id}
                  className="rounded-xl p-4"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="pill"
                          style={{
                            background: `${STAGE_COLOR[d.stage]}22`,
                            color: STAGE_COLOR[d.stage],
                          }}
                        >
                          {STAGE_LABEL[d.stage]}
                        </span>
                        <span className="text-xs" style={{ color: "var(--muted)" }}>
                          {d.propertyType.replace("_", " ")} · {d.beds}bd/{d.baths}ba
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white mt-1.5">
                        {d.propertyAddress}
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                        {d.propertyCity}, {d.propertyState} {d.propertyZip}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => openEdit(d)}
                        className="px-2.5 py-1 rounded text-xs"
                        style={{ background: "var(--surface)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(d.id)}
                        className="px-2.5 py-1 rounded text-xs"
                        style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
                    <Num label="Purchase" value={currency(d.purchasePrice, true)} />
                    <Num label="Rehab Budget" value={currency(d.rehabBudget, true)} />
                    <Num label="Rehab Spent" value={currency(d.rehabSpent, true)} />
                    <Num label={d.stage === "sold" ? "Sale Price" : "ARV"} value={currency(d.stage === "sold" ? (d.salePrice ?? 0) : d.arv, true)} />
                    <Num
                      label={d.stage === "sold" ? "Realized Profit" : "Projected Profit"}
                      value={currency(profit, true)}
                      accent={profit > 0}
                    />
                    {d.stage === "rehab" && (
                      <div className="rounded-lg px-2 py-1.5" style={{ background: "var(--surface)" }}>
                        <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "var(--muted)" }}>
                          Rehab Progress
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: "var(--border)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${rehabPct}%`, background: "#a78bfa" }}
                          />
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>{rehabPct}%</div>
                      </div>
                    )}
                  </div>

                  {d.notes && (
                    <p className="text-xs mt-2 italic" style={{ color: "var(--muted)" }}>
                      {d.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit form modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setFormOpen(false)}
        >
          <div
            className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 screen-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-white mb-4">
              {editing ? "Edit Deal" : "Add Portfolio Deal"}
            </h2>
            <div className="space-y-3">
              <Inp label="Property Address *" value={form.propertyAddress ?? ""} onChange={(v) => set({ propertyAddress: v })} />
              <div className="grid grid-cols-3 gap-2">
                <Inp label="City" value={form.propertyCity ?? ""} onChange={(v) => set({ propertyCity: v })} />
                <Inp label="State" value={form.propertyState ?? ""} onChange={(v) => set({ propertyState: v })} />
                <Inp label="ZIP" value={form.propertyZip ?? ""} onChange={(v) => set({ propertyZip: v })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Inp label="Beds" type="number" value={String(form.beds ?? 0)} onChange={(v) => set({ beds: Number(v) })} />
                <Inp label="Baths" type="number" value={String(form.baths ?? 0)} onChange={(v) => set({ baths: Number(v) })} />
                <Inp label="Sqft" type="number" value={String(form.sqft ?? 0)} onChange={(v) => set({ sqft: Number(v) })} />
              </div>
              <label className="block">
                <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Stage</span>
                <select
                  className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  value={form.stage ?? "offer"}
                  onChange={(e) => set({ stage: e.target.value as DealStage })}
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>{STAGE_LABEL[s]}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Inp label="Purchase Price" type="number" value={String(form.purchasePrice ?? 0)} onChange={(v) => set({ purchasePrice: Number(v) })} />
                <Inp label="ARV (Expected Sale)" type="number" value={String(form.arv ?? 0)} onChange={(v) => set({ arv: Number(v) })} />
                <Inp label="Rehab Budget" type="number" value={String(form.rehabBudget ?? 0)} onChange={(v) => set({ rehabBudget: Number(v) })} />
                <Inp label="Rehab Spent So Far" type="number" value={String(form.rehabSpent ?? 0)} onChange={(v) => set({ rehabSpent: Number(v) })} />
                {form.stage === "sold" && (
                  <Inp label="Actual Sale Price" type="number" value={String(form.salePrice ?? 0)} onChange={(v) => set({ salePrice: Number(v) })} />
                )}
              </div>
              <label className="block">
                <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Notes</span>
                <textarea
                  className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  rows={2}
                  value={form.notes ?? ""}
                  onChange={(e) => set({ notes: e.target.value })}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", color: "var(--muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.propertyAddress?.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--accent)" }}
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Deal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-3">
      <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="text-lg font-bold mt-0.5" style={{ color: accent ? "var(--accent)" : "var(--foreground)" }}>{value}</div>
    </div>
  );
}

function Num({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg px-2 py-1.5" style={{ background: "var(--surface)" }}>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="text-xs font-semibold mt-0.5" style={{ color: accent ? "var(--accent)" : "var(--foreground)" }}>{value}</div>
    </div>
  );
}

function Inp({
  label, value, onChange, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
      />
    </label>
  );
}
