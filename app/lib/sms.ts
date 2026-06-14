// SMS delivery via Twilio. Sends alerts to the investor for high-priority deals
// and a short daily summary. No markdown in SMS — plain text only.

import type { ScoredDeal } from "./types";
import { env } from "./env";
import { currency, STRATEGY_LABEL } from "./format";

async function sendTwilio(to: string, body: string): Promise<void> {
  const auth = Buffer.from(
    `${env.twilioAccountSid}:${env.twilioAuthToken}`
  ).toString("base64");

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: env.twilioFromNumber,
        To: to,
        Body: body,
      }).toString(),
    }
  );

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Twilio error ${res.status}: ${txt}`);
  }
}

// 160-char deal alert sent immediately when a high-priority deal is found.
export function buildDealAlertSms(deal: ScoredDeal): string {
  const { property, analysis, score } = deal;
  const addr = property.address.replace(/,.*/, ""); // just street
  const profit = currency(analysis.estimatedNetProfit, true);
  const strat = STRATEGY_LABEL[analysis.recommendedStrategy];
  return `DealRadar ALERT 🏠 ${addr}, ${property.city} | Score ${score.total} | ${profit} profit | ${analysis.discountToMarketPct}% below market | ${strat} | ${property.daysOnMarket}d DOM`;
}

export async function sendDealAlert(deal: ScoredDeal): Promise<void> {
  const body = buildDealAlertSms(deal);
  await sendTwilio(env.investorPhone, body);
}

// Short daily summary SMS (≤320 chars).
export async function sendDailySummarySms(stats: {
  totalDeals: number;
  goldCount: number;
  silverCount: number;
  newToday: number;
  topDeal?: ScoredDeal;
}): Promise<void> {
  const { totalDeals, goldCount, silverCount, newToday, topDeal } = stats;
  let body = `DealRadar Daily — ${totalDeals} deals tracked, ${goldCount} Gold / ${silverCount} Silver, ${newToday} new today.`;
  if (topDeal) {
    const addr = topDeal.property.address.replace(/,.*/, "");
    body += ` Top deal: ${addr} (score ${topDeal.score.total}, ${currency(topDeal.analysis.estimatedNetProfit, true)}).`;
  }
  body += " Full report in your email.";
  await sendTwilio(env.investorPhone, body);
}
