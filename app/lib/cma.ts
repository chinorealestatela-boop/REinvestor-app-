// CMA (Comparative Market Analysis) generation using Claude.
// Produces a professional investor-grade narrative for auto-emailing to matched buyers.

import Anthropic from "@anthropic-ai/sdk";
import type { ScoredDeal, Buyer, BuyerMatch } from "./types";
import { env } from "./env";
import { currency, STRATEGY_LABEL, PROPERTY_TYPE_LABEL } from "./format";

function compsText(deal: ScoredDeal): string {
  if (!deal.property.comps.length) return "No comps on file.";
  return deal.property.comps
    .slice(0, 4)
    .map(
      (c) =>
        `• ${c.address} — sold ${currency(c.soldPrice)} (${c.sqft.toLocaleString()} sqft, ${c.distanceMiles} mi away, ${c.soldDate})`
    )
    .join("\n");
}

export interface CmaContent {
  subject: string;
  narrative: string; // AI-generated 3-4 paragraph body
}

export async function generateCma(
  deal: ScoredDeal,
  buyer: Buyer,
  match: BuyerMatch
): Promise<CmaContent> {
  const { property, analysis, score } = deal;

  const prompt = `You are a real estate investment analyst at DealRadar, an AI-powered acquisition platform. Write a concise, professional CMA (Comparative Market Analysis) email to send to an investor buyer named ${buyer.name}${buyer.company ? ` at ${buyer.company}` : ""}.

PROPERTY:
Address: ${property.address}, ${property.city}, ${property.state} ${property.zip}
Type: ${PROPERTY_TYPE_LABEL[property.propertyType]} · ${property.beds}bd/${property.baths}ba · ${property.sqft.toLocaleString()} sqft · Built ${property.yearBuilt}
List Price: ${currency(property.listPrice)} · ${property.daysOnMarket} days on market
Distress: ${property.distressSignals.join(", ") || "none"}

FINANCIAL ANALYSIS:
Estimated Market Value: ${currency(analysis.estimatedMarketValue)}
After Repair Value (ARV): ${currency(analysis.estimatedArv)}
Rehab Level: ${analysis.rehabLevel} — Est. ${currency(analysis.estimatedRehabCost)}
Discount to Market: ${analysis.discountToMarketPct}%
Discount to ARV: ${analysis.discountToArvPct}%
Estimated Net Profit: ${currency(analysis.estimatedNetProfit)}
Estimated ROI: ${analysis.estimatedRoiPct}%
Recommended Strategy: ${STRATEGY_LABEL[analysis.recommendedStrategy]}
Deal Score: ${score.total}/100

COMPARABLE SALES:
${compsText(deal)}

BUYER MATCH:
Match Score: ${match.matchScore}% fit
Matched on: ${match.matchedOn.join(", ")}

Write 3 short paragraphs:
1. Open with the headline opportunity in plain, direct language — what makes this deal stand out for THIS buyer's criteria.
2. Walk through the key numbers (ARV, rehab, profit, discount) clearly so the buyer can evaluate quickly.
3. Close with urgency (days on market, motivated seller) and a simple call to action — "Reply to this email or call me to discuss."

Rules:
- Do not use markdown, headers, or bullet points — plain prose only.
- Address the buyer by first name.
- Keep it under 350 words.
- Sound like a knowledgeable investor partner, not a salesperson.
- Do not invent numbers not in the data above.`;

  const client = new Anthropic({ apiKey: env.anthropicApiKey });
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const narrative =
    response.content[0].type === "text" ? response.content[0].text.trim() : "";

  const subject = `DealRadar: ${property.address} — ${currency(analysis.estimatedNetProfit, true)} projected profit · Score ${score.total}`;

  return { subject, narrative };
}
