// Email delivery via Resend (resend.com).
// Handles CMA emails to buyers and daily report emails to the investor.

import type { ScoredDeal, Buyer, BuyerMatch } from "./types";
import type { CmaContent } from "./cma";
import type { MarketSummary } from "./deals";
import { currency, PROPERTY_TYPE_LABEL, STRATEGY_LABEL } from "./format";
import { env } from "./env";

async function send(payload: {
  from: string;
  to: string[];
  subject: string;
  html: string;
}): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend error ${res.status}: ${txt}`);
  }
}

// ---- CMA email to a buyer ---------------------------------------------------

export async function sendCmaEmail(
  deal: ScoredDeal,
  buyer: Buyer,
  match: BuyerMatch,
  cma: CmaContent
): Promise<void> {
  const { property, analysis, score } = deal;

  const compsHtml =
    property.comps.length > 0
      ? property.comps
          .slice(0, 4)
          .map(
            (c) => `
          <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #1b2330">${c.address}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #1b2330;text-align:right">${currency(c.soldPrice)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #1b2330;text-align:right">${c.sqft.toLocaleString()} sf</td>
            <td style="padding:6px 8px;border-bottom:1px solid #1b2330;text-align:right">${c.distanceMiles} mi</td>
            <td style="padding:6px 8px;border-bottom:1px solid #1b2330;text-align:right">${c.soldDate}</td>
          </tr>`
          )
          .join("")
      : '<tr><td colspan="5" style="padding:8px;color:#7c8aa0">No comps on file</td></tr>';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0b0f14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e8edf4">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:24px 16px">
    <tr><td>
      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#131922;border:1px solid #283142;border-radius:12px;margin-bottom:16px">
        <tr>
          <td style="padding:20px 24px">
            <span style="display:inline-block;background:#10b981;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;color:#fff;letter-spacing:.5px">DEALRADAR · DEAL ALERT</span>
            <h1 style="margin:12px 0 4px;font-size:20px;color:#fff">${property.address}</h1>
            <p style="margin:0;font-size:13px;color:#7c8aa0">${property.city}, ${property.state} ${property.zip} · ${PROPERTY_TYPE_LABEL[property.propertyType]} · ${property.beds}bd/${property.baths}ba · ${property.sqft.toLocaleString()} sqft</p>
          </td>
          <td style="padding:20px 24px;text-align:right;vertical-align:top">
            <div style="font-size:36px;font-weight:800;color:#10b981">${score.total}</div>
            <div style="font-size:11px;color:#7c8aa0">Deal Score</div>
          </td>
        </tr>
      </table>

      <!-- Key numbers -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;border-spacing:8px;border-collapse:separate">
        <tr>
          <td style="background:#131922;border:1px solid #283142;border-radius:10px;padding:14px 16px;width:25%">
            <div style="font-size:10px;color:#7c8aa0;text-transform:uppercase;letter-spacing:.5px">List Price</div>
            <div style="font-size:18px;font-weight:700;color:#e8edf4;margin-top:2px">${currency(property.listPrice, true)}</div>
          </td>
          <td style="background:#131922;border:1px solid #283142;border-radius:10px;padding:14px 16px;width:25%">
            <div style="font-size:10px;color:#7c8aa0;text-transform:uppercase;letter-spacing:.5px">ARV</div>
            <div style="font-size:18px;font-weight:700;color:#e8edf4;margin-top:2px">${currency(analysis.estimatedArv, true)}</div>
          </td>
          <td style="background:#131922;border:1px solid #283142;border-radius:10px;padding:14px 16px;width:25%">
            <div style="font-size:10px;color:#7c8aa0;text-transform:uppercase;letter-spacing:.5px">Est. Profit</div>
            <div style="font-size:18px;font-weight:700;color:#10b981;margin-top:2px">${currency(analysis.estimatedNetProfit, true)}</div>
          </td>
          <td style="background:#131922;border:1px solid #283142;border-radius:10px;padding:14px 16px;width:25%">
            <div style="font-size:10px;color:#7c8aa0;text-transform:uppercase;letter-spacing:.5px">Below Market</div>
            <div style="font-size:18px;font-weight:700;color:#10b981;margin-top:2px">${analysis.discountToMarketPct}%</div>
          </td>
        </tr>
      </table>

      <!-- AI CMA narrative -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#131922;border:1px solid #283142;border-radius:12px;margin-bottom:16px">
        <tr><td style="padding:20px 24px">
          <p style="margin:0;font-size:14px;line-height:1.7;color:#e8edf4;white-space:pre-line">${cma.narrative}</p>
        </td></tr>
      </table>

      <!-- Deal detail -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#131922;border:1px solid #283142;border-radius:12px;margin-bottom:16px">
        <tr><td style="padding:16px 24px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#7c8aa0;margin-bottom:10px">Deal Analysis</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px">
            <tr><td style="padding:5px 0;color:#7c8aa0">Estimated Market Value</td><td style="text-align:right;color:#e8edf4">${currency(analysis.estimatedMarketValue)}</td></tr>
            <tr><td style="padding:5px 0;color:#7c8aa0">After Repair Value (ARV)</td><td style="text-align:right;color:#e8edf4">${currency(analysis.estimatedArv)}</td></tr>
            <tr><td style="padding:5px 0;color:#7c8aa0">Rehab (${analysis.rehabLevel})</td><td style="text-align:right;color:#e8edf4">${currency(analysis.estimatedRehabCost)}</td></tr>
            <tr><td style="padding:5px 0;color:#7c8aa0">Holding Costs</td><td style="text-align:right;color:#e8edf4">${currency(analysis.holdingCostTotal)}</td></tr>
            <tr><td style="padding:5px 0;color:#7c8aa0">Closing + Financing</td><td style="text-align:right;color:#e8edf4">${currency(analysis.closingCostBuy + analysis.closingCostSell + analysis.financingCost)}</td></tr>
            <tr style="border-top:1px solid #283142"><td style="padding:8px 0 5px;color:#e8edf4;font-weight:600">Projected Net Profit</td><td style="text-align:right;color:#10b981;font-weight:700">${currency(analysis.estimatedNetProfit)}</td></tr>
            <tr><td style="padding:5px 0;color:#7c8aa0">ROI</td><td style="text-align:right;color:#e8edf4">${analysis.estimatedRoiPct}%</td></tr>
            <tr><td style="padding:5px 0;color:#7c8aa0">Recommended Strategy</td><td style="text-align:right;color:#e8edf4">${STRATEGY_LABEL[analysis.recommendedStrategy]}</td></tr>
            <tr><td style="padding:5px 0;color:#7c8aa0">Max Offer (MAO)</td><td style="text-align:right;color:#e8edf4">${currency(analysis.recommendedMaxOffer)}</td></tr>
            <tr><td style="padding:5px 0;color:#7c8aa0">Days on Market</td><td style="text-align:right;color:#e8edf4">${property.daysOnMarket}</td></tr>
            <tr><td style="padding:5px 0;color:#7c8aa0">Buyer Match Score</td><td style="text-align:right;color:#3b82f6;font-weight:700">${match.matchScore}%</td></tr>
          </table>
        </td></tr>
      </table>

      <!-- Comps -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#131922;border:1px solid #283142;border-radius:12px;margin-bottom:16px">
        <tr><td style="padding:16px 24px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#7c8aa0;margin-bottom:10px">Comparable Sales</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px">
            <tr style="color:#7c8aa0">
              <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #283142">Address</th>
              <th style="text-align:right;padding:6px 8px;border-bottom:1px solid #283142">Price</th>
              <th style="text-align:right;padding:6px 8px;border-bottom:1px solid #283142">Sqft</th>
              <th style="text-align:right;padding:6px 8px;border-bottom:1px solid #283142">Dist.</th>
              <th style="text-align:right;padding:6px 8px;border-bottom:1px solid #283142">Date</th>
            </tr>
            ${compsHtml}
          </table>
        </td></tr>
      </table>

      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:16px 0;text-align:center;font-size:11px;color:#7c8aa0">
          Sent by DealRadar · AI Real Estate Investment Platform<br>
          This is not financial advice. Verify all figures independently before making an offer.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await send({
    from: env.fromEmail,
    to: [buyer.email],
    subject: cma.subject,
    html,
  });
}

// ---- Daily report email to investor ----------------------------------------

export async function sendDailyReportEmail(
  summary: MarketSummary,
  topDeals: ScoredDeal[]
): Promise<void> {
  const dealsHtml = topDeals
    .slice(0, 5)
    .map(
      (d, i) => `
      <tr>
        <td style="padding:8px;color:#10b981;font-weight:700;font-size:18px">${i + 1}</td>
        <td style="padding:8px">
          <div style="color:#e8edf4;font-weight:600">${d.property.address}</div>
          <div style="color:#7c8aa0;font-size:12px">${d.property.city} · ${d.property.beds}bd/${d.property.baths}ba · ${d.property.daysOnMarket}d DOM</div>
        </td>
        <td style="padding:8px;text-align:right;color:#e8edf4">${d.score.total}</td>
        <td style="padding:8px;text-align:right;color:#10b981;font-weight:600">${currency(d.analysis.estimatedNetProfit, true)}</td>
        <td style="padding:8px;text-align:right;color:#7c8aa0">${d.analysis.discountToMarketPct}%↓</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0b0f14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e8edf4">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:24px 16px">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#131922;border:1px solid #283142;border-radius:12px;margin-bottom:16px">
        <tr><td style="padding:20px 24px">
          <span style="background:#10b981;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;color:#fff">DEALRADAR · DAILY REPORT</span>
          <h1 style="margin:12px 0 4px;font-size:22px;color:#fff">Las Vegas Market Summary</h1>
          <p style="margin:0;color:#7c8aa0;font-size:13px">${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;border-spacing:8px;border-collapse:separate">
        <tr>
          <td style="background:#131922;border:1px solid #283142;border-radius:10px;padding:14px 16px">
            <div style="font-size:10px;color:#7c8aa0;text-transform:uppercase">Active Deals</div>
            <div style="font-size:22px;font-weight:700;color:#e8edf4">${summary.totalDeals}</div>
          </td>
          <td style="background:#131922;border:1px solid #283142;border-radius:10px;padding:14px 16px">
            <div style="font-size:10px;color:#7c8aa0;text-transform:uppercase">Gold / Silver</div>
            <div style="font-size:22px;font-weight:700;color:#fbbf24">${summary.goldCount} / ${summary.silverCount}</div>
          </td>
          <td style="background:#131922;border:1px solid #283142;border-radius:10px;padding:14px 16px">
            <div style="font-size:10px;color:#7c8aa0;text-transform:uppercase">Avg Discount</div>
            <div style="font-size:22px;font-weight:700;color:#10b981">${summary.avgDiscountToMarket}%</div>
          </td>
          <td style="background:#131922;border:1px solid #283142;border-radius:10px;padding:14px 16px">
            <div style="font-size:10px;color:#7c8aa0;text-transform:uppercase">New Today</div>
            <div style="font-size:22px;font-weight:700;color:#e8edf4">${summary.newToday}</div>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#131922;border:1px solid #283142;border-radius:12px;margin-bottom:16px">
        <tr><td style="padding:16px 24px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#7c8aa0;margin-bottom:10px">Top Opportunities Today</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px">
            <tr style="color:#7c8aa0;font-size:11px">
              <th style="padding:6px 8px;text-align:left">#</th>
              <th style="padding:6px 8px;text-align:left">Property</th>
              <th style="padding:6px 8px;text-align:right">Score</th>
              <th style="padding:6px 8px;text-align:right">Profit</th>
              <th style="padding:6px 8px;text-align:right">Discount</th>
            </tr>
            ${dealsHtml}
          </table>
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#131922;border:1px solid #283142;border-radius:12px;margin-bottom:16px">
        <tr><td style="padding:16px 24px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#7c8aa0;margin-bottom:8px">More Stats</div>
          <table width="100%" style="font-size:13px">
            <tr><td style="padding:5px 0;color:#7c8aa0">Avg Deal Score</td><td style="text-align:right;color:#e8edf4">${summary.avgScore}/100</td></tr>
            <tr><td style="padding:5px 0;color:#7c8aa0">Avg Days on Market</td><td style="text-align:right;color:#e8edf4">${summary.avgDaysOnMarket}d</td></tr>
            <tr><td style="padding:5px 0;color:#7c8aa0">Price Reductions</td><td style="text-align:right;color:#e8edf4">${summary.priceReductions}</td></tr>
            <tr><td style="padding:5px 0;color:#7c8aa0">Total Projected Profit</td><td style="text-align:right;color:#10b981;font-weight:700">${currency(summary.totalProjectedProfit, true)}</td></tr>
          </table>
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:16px 0;text-align:center;font-size:11px;color:#7c8aa0">
          DealRadar · AI Real Estate Investment Platform · Las Vegas, NV
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await send({
    from: env.fromEmail,
    to: [env.investorEmail],
    subject: `DealRadar Daily Report — ${summary.goldCount} gold deals · ${currency(summary.totalProjectedProfit, true)} total profit · ${new Date().toLocaleDateString()}`,
    html,
  });
}
