export const META_API_VERSION = "v25.0";

export const REQUIRED_META_PERMISSIONS = [
  "ads_management",
  "ads_read",
  "business_management",
  "pages_read_engagement",
  "pages_manage_ads",
  "pages_show_list",
  "instagram_basic",
  "instagram_manage_insights",
  "public_profile",
  "email",
] as const;

export type MetaPermission = (typeof REQUIRED_META_PERMISSIONS)[number];

export function buildAppBaseUrl(headers: Headers): string {
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
  const proto =
    headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function graphApiUrl(path: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `https://graph.facebook.com/${META_API_VERSION}/${path}?${search.toString()}`;
}

export function normalizeAdAccountId(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/^act_/, "");
}
