// POST /api/cma
// Generates a Claude-powered CMA for a specific deal+buyer pair and emails it.
// Body: { dealId: string; buyerId: string }
// Returns: { ok: true; subject: string } or error.

import { NextRequest, NextResponse } from "next/server";
import { loadScoredDeals } from "../../lib/db/deals-repo";
import { listBuyers } from "../../lib/db/buyers-repo";
import { matchDealToBuyer } from "../../lib/matching";
import { generateCma } from "../../lib/cma";
import { sendCmaEmail } from "../../lib/email";
import { isCmaConfigured, isEmailConfigured } from "../../lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!isCmaConfigured()) {
    return NextResponse.json(
      {
        error:
          "CMA generation requires ANTHROPIC_API_KEY and RESEND_API_KEY. See .env.example.",
        configured: false,
      },
      { status: 503 }
    );
  }
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email delivery requires RESEND_API_KEY and INVESTOR_EMAIL." },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    dealId?: string;
    buyerId?: string;
  };

  if (!body.dealId || !body.buyerId) {
    return NextResponse.json(
      { error: "dealId and buyerId are required" },
      { status: 400 }
    );
  }

  const [deals, buyers] = await Promise.all([loadScoredDeals(), listBuyers()]);

  const deal = deals.find((d) => d.property.id === body.dealId);
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const buyer = buyers.find((b) => b.id === body.buyerId);
  if (!buyer) {
    return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
  }

  const match = matchDealToBuyer(deal, buyer);
  if (!match) {
    return NextResponse.json(
      { error: "Deal does not match buyer's buy box" },
      { status: 422 }
    );
  }

  const cma = await generateCma(deal, buyer, match);
  await sendCmaEmail(deal, buyer, match, cma);

  return NextResponse.json({ ok: true, subject: cma.subject, matchScore: match.matchScore });
}
