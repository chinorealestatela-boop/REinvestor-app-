// Small formatting helpers shared across the UI.

export function currency(n: number, compact = false): string {
  if (compact && Math.abs(n) >= 1000) {
    return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  }
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function pct(n: number): string {
  return `${n > 0 ? "" : ""}${n.toFixed(1)}%`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const PROPERTY_TYPE_LABEL: Record<string, string> = {
  single_family: "Single Family",
  condo: "Condo",
  townhome: "Townhome",
  duplex: "Duplex",
  multi_family: "Multi-Family",
};

export const STRATEGY_LABEL: Record<string, string> = {
  flip: "Flip",
  brrrr: "BRRRR",
  rental_hold: "Rental Hold",
  wholesale: "Wholesale",
  avoid: "Avoid",
};

export const CLASSIFICATION_LABEL: Record<string, string> = {
  gold: "Gold Deal",
  silver: "Silver Deal",
  bronze: "Bronze Deal",
  reject: "Pass",
};

export const CLASSIFICATION_COLOR: Record<string, string> = {
  gold: "#fbbf24",
  silver: "#cbd5e1",
  bronze: "#d97706",
  reject: "#6b7280",
};

export const TIER_COLOR: Record<string, string> = {
  elite: "#22c55e",
  high_priority: "#10b981",
  strong: "#3b82f6",
  average: "#f59e0b",
  low: "#6b7280",
};
