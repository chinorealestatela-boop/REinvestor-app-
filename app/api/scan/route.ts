import { NextRequest, NextResponse } from "next/server";
import { scanRentcast } from "../../lib/sources/rentcast";
import { buildScoredDeals, isAlertDeal } from "../../lib/deals";
import { saveScoredDeals } from "../../lib/db/deals-repo";
import { isRentcastConfigured, isSupabaseConfigured, isSmsConfigured } from "../../lib/env";
import { sendDealAlert } from "../../lib/sms";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Triggers a live scan: pulls active listings from RentCast, runs the analysis
// + scoring engines, persists snapshots (if Supabase configured), and returns
// the scored deals. Powers both the manual "Run Scan" button and the future
// twice-daily cron jobs.
export async function POST(req: NextRequest) {
  if (!isRentcastConfigured()) {
    return NextResponse.json(
      {
        error:
          "RentCast not configured. Add RENTCAST_API_KEY to run a live scan. The dashboard continues to run on sample data until then.",
        configured: false,
      },
      { status: 503 }
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      city?: string;
      state?: string;
      zipCode?: string;
      maxPrice?: number;
      limit?: number;
    };

    const properties = await scanRentcast({
      city: body.city ?? "Las Vegas",
      state: body.state ?? "NV",
      zipCode: body.zipCode,
      maxPrice: body.maxPrice ?? 500_000,
      limit: body.limit ?? 20,
    });

    const deals = buildScoredDeals(properties);
    await saveScoredDeals(deals);

    // Fire SMS alerts for elite deals (best-effort, non-blocking on error).
    if (isSmsConfigured()) {
      const alertDeals = deals.filter((d) => isAlertDeal(d) && d.score.total >= 90);
      for (const deal of alertDeals.slice(0, 3)) {
        sendDealAlert(deal).catch(() => null);
      }
    }

    return NextResponse.json({
      scanned: properties.length,
      deals,
      persisted: isSupabaseConfigured(),
      at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan failed" },
      { status: 500 }
    );
  }
}
