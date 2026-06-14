// POST /api/report
// Generates and delivers the daily market report: email to investor + SMS summary.
// Triggered by the cron job (or manually from the dashboard). Also fires SMS alerts
// for any high-priority deals found since the last scan.

import { NextResponse } from "next/server";
import { loadScoredDeals } from "../../lib/db/deals-repo";
import { buildMarketSummary, isAlertDeal } from "../../lib/deals";
import { sendDailyReportEmail } from "../../lib/email";
import { sendDailySummarySms, sendDealAlert } from "../../lib/sms";
import { isEmailConfigured, isSmsConfigured } from "../../lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST() {
  const deals = await loadScoredDeals();
  const summary = buildMarketSummary(deals);

  const results: Record<string, string> = {};

  // Email report
  if (isEmailConfigured()) {
    try {
      await sendDailyReportEmail(summary, deals);
      results.email = "sent";
    } catch (err) {
      results.email = `failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  } else {
    results.email = "not configured";
  }

  // SMS summary + alerts for priority deals
  if (isSmsConfigured()) {
    try {
      await sendDailySummarySms({
        totalDeals: summary.totalDeals,
        goldCount: summary.goldCount,
        silverCount: summary.silverCount,
        newToday: summary.newToday,
        topDeal: deals[0],
      });
      results.sms = "summary sent";
    } catch (err) {
      results.sms = `failed: ${err instanceof Error ? err.message : String(err)}`;
    }

    // Immediate SMS for elite deals
    const elite = deals.filter(
      (d) => isAlertDeal(d) && d.score.total >= 90
    );
    for (const deal of elite.slice(0, 3)) {
      try {
        await sendDealAlert(deal);
      } catch {
        // best-effort alerts — don't fail the whole report
      }
    }
    if (elite.length > 0) results.smsAlerts = `${elite.length} elite deal(s) alerted`;
  } else {
    results.sms = "not configured";
  }

  return NextResponse.json({ ok: true, results, at: new Date().toISOString() });
}
