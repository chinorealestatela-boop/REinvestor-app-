// Central place to read configuration and decide which features are "live"
// vs. running on sample/in-memory fallbacks. The app is fully usable with none
// of these set — each key simply turns on a capability.

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  rentcastApiKey: process.env.RENTCAST_API_KEY ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  // Email delivery (Resend — resend.com, free tier available)
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  fromEmail: process.env.FROM_EMAIL ?? "DealRadar <deals@dealradar.app>",
  // SMS alerts (Twilio)
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER ?? "",
  // Neighborhood enrichment (optional — ZIP-code defaults are used without these)
  greatSchoolsApiKey: process.env.GREATSCHOOLS_API_KEY ?? "",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
  // Investor contact (who gets alerts + daily reports)
  investorEmail: process.env.INVESTOR_EMAIL ?? "",
  investorPhone: process.env.INVESTOR_PHONE ?? "",
};

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && (env.supabaseServiceKey || env.supabaseAnonKey));
}

export function isRentcastConfigured(): boolean {
  return Boolean(env.rentcastApiKey);
}

export function isEmailConfigured(): boolean {
  return Boolean(env.resendApiKey && env.investorEmail);
}

export function isSmsConfigured(): boolean {
  return Boolean(
    env.twilioAccountSid && env.twilioAuthToken && env.twilioFromNumber && env.investorPhone
  );
}

export function isCmaConfigured(): boolean {
  return Boolean(env.anthropicApiKey && env.resendApiKey);
}
