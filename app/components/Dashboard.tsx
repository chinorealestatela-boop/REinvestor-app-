"use client";

import { useMemo, useState } from "react";
import type { ScoredDeal, Buyer } from "../lib/types";
import {
  attachBuyerMatches,
  buildMarketSummary,
  isAlertDeal,
  type DealWithMatches,
  type MarketSummary,
} from "../lib/deals";
import DealCard from "./DealCard";
import DealList from "./DealList";
import DealMap from "./DealMap";
import DealDetail from "./DealDetail";
import BuyersPanel from "./BuyersPanel";
import BuyerForm from "./BuyerForm";
import PortfolioPanel from "./PortfolioPanel";
import { currency } from "../lib/format";

type View = "grid" | "list" | "map";
type Tab = "deals" | "buyers" | "portfolio" | "report";
type StrategyFilter = "all" | "flip" | "wholesale" | "rental_hold";

export default function Dashboard({
  initialDeals,
  summary: initialSummary,
  initialBuyers,
  persisted,
  liveData,
}: {
  initialDeals: ScoredDeal[];
  summary: MarketSummary;
  initialBuyers: Buyer[];
  persisted: boolean;
  liveData: boolean;
}) {
  const [deals, setDeals] = useState<ScoredDeal[]>(initialDeals);
  const [summary, setSummary] = useState<MarketSummary>(initialSummary);
  const [buyers, setBuyers] = useState<Buyer[]>(initialBuyers);

  const [tab, setTab] = useState<Tab>("deals");
  const [view, setView] = useState<View>("grid");
  const [selected, setSelected] = useState<DealWithMatches | null>(null);
  const [strategy, setStrategy] = useState<StrategyFilter>("all");
  const [hideKillers, setHideKillers] = useState(false);
  const [minScore, setMinScore] = useState(0);

  const [scanning, setScanning] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // Buyer form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<Buyer | null>(null);
  const [savingBuyer, setSavingBuyer] = useState(false);

  // Matches + alerts recompute whenever deals or buyers change.
  const dealsWithMatches = useMemo(
    () => attachBuyerMatches(deals, buyers),
    [deals, buyers]
  );
  const alerts = useMemo(
    () => dealsWithMatches.filter(isAlertDeal),
    [dealsWithMatches]
  );

  const filtered = useMemo(() => {
    return dealsWithMatches.filter((d) => {
      if (strategy !== "all" && d.analysis.recommendedStrategy !== strategy)
        return false;
      if (hideKillers && d.property.dealKillers.length > 0) return false;
      if (d.score.total < minScore) return false;
      return true;
    });
  }, [dealsWithMatches, strategy, hideKillers, minScore]);

  // ---- Scan ----------------------------------------------------------------
  async function runScan() {
    setScanning(true);
    setBanner(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: "Las Vegas", state: "NV", maxPrice: 500_000 }),
      });
      const json = await res.json();
      if (!res.ok) {
        setBanner(json.error ?? "Scan failed.");
        return;
      }
      setDeals(json.deals as ScoredDeal[]);
      setSummary(buildMarketSummary(json.deals as ScoredDeal[]));
      setBanner(
        `Scan complete — ${json.scanned} listings analyzed${
          json.persisted ? " and saved" : ""
        }.`
      );
    } catch {
      setBanner("Scan request failed.");
    } finally {
      setScanning(false);
    }
  }

  // ---- Buyer CRUD ----------------------------------------------------------
  async function saveBuyer(buyer: Buyer) {
    setSavingBuyer(true);
    try {
      const isEdit = Boolean(editingBuyer);
      const res = await fetch(
        isEdit ? `/api/buyers/${buyer.id}` : "/api/buyers",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buyer),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setBanner(json.error ?? "Could not save buyer.");
        return;
      }
      const saved = json.buyer as Buyer;
      setBuyers((prev) =>
        isEdit ? prev.map((b) => (b.id === saved.id ? saved : b)) : [saved, ...prev]
      );
      setFormOpen(false);
      setEditingBuyer(null);
    } catch {
      setBanner("Could not save buyer.");
    } finally {
      setSavingBuyer(false);
    }
  }

  async function deleteBuyer(id: string) {
    setBuyers((prev) => prev.filter((b) => b.id !== id)); // optimistic
    try {
      await fetch(`/api/buyers/${id}`, { method: "DELETE" });
    } catch {
      setBanner("Could not delete buyer on the server.");
    }
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header
        className="sticky top-0 z-30 px-4 md:px-8 py-3 flex items-center gap-3"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "var(--accent)" }}
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold text-white leading-tight">DealRadar</h1>
          <p className="text-[10px]" style={{ color: "var(--muted)" }}>
            Las Vegas · AI Acquisition Engine
          </p>
        </div>

        <nav className="ml-6 hidden md:flex items-center gap-1">
          {(["deals", "buyers", "portfolio", "report"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: tab === t ? "var(--surface-2)" : "transparent",
                color: tab === t ? "var(--foreground)" : "var(--muted)",
              }}
            >
              {t === "report" ? "Daily Report" : t === "buyers" ? "Buyer Network" : t === "portfolio" ? "Portfolio" : "Deals"}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={runScan}
            disabled={scanning}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--accent)" }}
          >
            {scanning ? "Scanning…" : "Run Scan"}
          </button>
          <span
            className="pill hidden sm:inline-flex"
            style={{ background: "rgba(16,185,129,0.15)", color: "var(--accent)" }}
          >
            ● {alerts.length} alerts
          </span>
        </div>
      </header>

      {/* Mobile tabs */}
      <div className="md:hidden flex gap-1 px-4 pt-3 overflow-x-auto">
        {(["deals", "buyers", "portfolio", "report"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium capitalize"
            style={{
              background: tab === t ? "var(--surface-2)" : "transparent",
              color: tab === t ? "var(--foreground)" : "var(--muted)",
            }}
          >
            {t === "portfolio" ? "Portfolio" : t === "report" ? "Report" : t}
          </button>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {/* Status banners */}
        {!liveData && (
          <div
            className="card p-3 mb-4 text-xs"
            style={{ borderColor: "rgba(245,158,11,0.4)", color: "var(--muted)" }}
          >
            Running on sample data. Add <code>RENTCAST_API_KEY</code> to pull live Las Vegas listings with
            “Run Scan”, and Supabase keys to persist them.{" "}
            {persisted ? "Supabase is connected." : "Supabase not connected — buyers are stored in memory only."}
          </div>
        )}
        {banner && (
          <div
            className="card p-3 mb-4 text-xs flex items-center justify-between"
            style={{ borderColor: "var(--accent)" }}
          >
            <span style={{ color: "var(--foreground)" }}>{banner}</span>
            <button onClick={() => setBanner(null)} style={{ color: "var(--muted)" }}>
              ✕
            </button>
          </div>
        )}

        {tab === "deals" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
              <Stat label="Active Deals" value={String(summary.totalDeals)} />
              <Stat label="Gold / Silver" value={`${summary.goldCount} / ${summary.silverCount}`} />
              <Stat label="Avg Discount" value={`${summary.avgDiscountToMarket}%`} accent />
              <Stat label="Total Proj. Profit" value={currency(summary.totalProjectedProfit, true)} accent />
              <Stat label="New Today" value={String(summary.newToday)} />
            </div>

            {alerts.length > 0 && (
              <div className="card p-4 mb-5" style={{ borderColor: "rgba(16,185,129,0.4)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ color: "var(--accent)" }}>⚡</span>
                  <h2 className="text-sm font-semibold text-white">
                    Priority Alerts ({alerts.length})
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {alerts.map((d) => (
                    <button
                      key={d.property.id}
                      onClick={() => setSelected(d)}
                      className="pill"
                      style={{ background: "var(--surface-2)", color: "var(--foreground)" }}
                    >
                      {d.property.address.split(",")[0]} · {d.score.total} ·{" "}
                      {currency(d.analysis.estimatedNetProfit, true)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {(["grid", "list", "map"] as View[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className="px-3 py-1.5 text-xs font-medium capitalize"
                    style={{
                      background: view === v ? "var(--accent)" : "var(--surface)",
                      color: view === v ? "#fff" : "var(--muted)",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as StrategyFilter)}
                className="rounded-lg px-3 py-1.5 text-xs"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              >
                <option value="all">All strategies</option>
                <option value="flip">Flip</option>
                <option value="wholesale">Wholesale</option>
                <option value="rental_hold">Rental Hold</option>
              </select>

              <label className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                Min score
                <select
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="rounded-lg px-2 py-1.5 text-xs"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                >
                  {[0, 60, 75, 85, 90].map((s) => (
                    <option key={s} value={s}>
                      {s === 0 ? "Any" : `${s}+`}
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={() => setHideKillers((v) => !v)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: hideKillers ? "var(--accent)" : "var(--surface)",
                  color: hideKillers ? "#fff" : "var(--muted)",
                  border: "1px solid var(--border)",
                }}
              >
                {hideKillers ? "✓ " : ""}Hide deal-killers
              </button>

              <span className="ml-auto text-xs" style={{ color: "var(--muted)" }}>
                {filtered.length} shown
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="card p-10 text-center text-sm" style={{ color: "var(--muted)" }}>
                No deals match the current filters.
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((deal) => (
                  <DealCard key={deal.property.id} deal={deal} onOpen={setSelected} />
                ))}
              </div>
            ) : view === "list" ? (
              <DealList deals={filtered} onOpen={setSelected} />
            ) : (
              <DealMap deals={filtered} onOpen={setSelected} />
            )}
          </>
        )}

        {tab === "buyers" && (
          <BuyersPanel
            buyers={buyers}
            deals={dealsWithMatches}
            onOpen={setSelected}
            onAdd={() => {
              setEditingBuyer(null);
              setFormOpen(true);
            }}
            onEdit={(b) => {
              setEditingBuyer(b);
              setFormOpen(true);
            }}
            onDelete={deleteBuyer}
          />
        )}

        {tab === "portfolio" && <PortfolioPanel />}

        {tab === "report" && <DailyReport summary={summary} deals={dealsWithMatches} />}

      </div>

      <DealDetail deal={selected} onClose={() => setSelected(null)} />

      {formOpen && (
        <BuyerForm
          initial={editingBuyer}
          saving={savingBuyer}
          onSave={saveBuyer}
          onClose={() => {
            setFormOpen(false);
            setEditingBuyer(null);
          }}
        />
      )}
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-3">
      <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      <div className="text-lg font-bold mt-0.5" style={{ color: accent ? "var(--accent)" : "var(--foreground)" }}>
        {value}
      </div>
    </div>
  );
}

function DailyReport({
  summary,
  deals,
}: {
  summary: MarketSummary;
  deals: DealWithMatches[];
}) {
  const top = deals.slice(0, 3);
  const [sending, setSending] = useState(false);
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  async function deliverReport() {
    setSending(true);
    setReportStatus(null);
    try {
      const res = await fetch("/api/report", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        const parts = Object.entries(json.results as Record<string, string>)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" · ");
        setReportStatus(`Delivered — ${parts}`);
      } else {
        setReportStatus(json.error ?? "Delivery failed.");
      }
    } catch {
      setReportStatus("Delivery request failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white mb-1">Las Vegas Daily Market Report</h2>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Generated {new Date().toLocaleDateString()} · Morning scan
            </p>
          </div>
          <button
            onClick={deliverReport}
            disabled={sending}
            className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--accent)" }}
          >
            {sending ? "Sending…" : "Send Report"}
          </button>
        </div>
        {reportStatus && (
          <div className="text-xs mb-4 p-2 rounded-lg" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
            {reportStatus}
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Active Deals Tracked" value={String(summary.totalDeals)} />
          <Stat label="Avg Deal Score" value={String(summary.avgScore)} />
          <Stat label="Avg Days on Market" value={String(summary.avgDaysOnMarket)} />
          <Stat label="Price Reductions" value={String(summary.priceReductions)} />
          <Stat label="Gold Deals" value={String(summary.goldCount)} accent />
          <Stat label="Silver Deals" value={String(summary.silverCount)} />
          <Stat label="Bronze Deals" value={String(summary.bronzeCount)} />
          <Stat label="Total Proj. Profit" value={currency(summary.totalProjectedProfit, true)} accent />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Top 3 Opportunities Today</h3>
        <ol className="space-y-2">
          {top.map((d, i) => (
            <li key={d.property.id} className="flex items-center gap-3 text-sm">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "var(--surface-2)", color: "var(--accent)" }}
              >
                {i + 1}
              </span>
              <span className="text-white font-medium">{d.property.address}</span>
              <span style={{ color: "var(--muted)" }}>
                — score {d.score.total}, {currency(d.analysis.estimatedNetProfit, true)} projected profit
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-2">Delivery</h3>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          In production this report is delivered every morning (7:00 AM) and afternoon (4:00 PM) as an
          in-app dashboard, an emailed PDF, and an SMS summary to your phone — per your preferences.
        </p>
      </div>
    </div>
  );
}
