import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { description, location, ageMin, ageMax } = body;

    if (!description || !location) {
      return NextResponse.json(
        { error: "Missing required fields: description and location" },
        { status: 400 }
      );
    }

    const prompt = `You are an expert Facebook ads copywriter. Generate ad content for the following brief.

Product/Service: ${description}
Target Location: ${location}
Target Age Range: ${ageMin}-${ageMax}

Return ONLY a valid JSON object (no markdown, no code blocks, no explanation) with exactly these fields:
{
  "primaryText": "The main ad copy (punchy, benefit-led, max 3 sentences)",
  "headline": "Short headline (max 8 words)",
  "callToAction": "One of: LEARN_MORE, SIGN_UP, GET_QUOTE, CONTACT_US, SUBSCRIBE, APPLY_NOW, DOWNLOAD, GET_OFFER, SHOP_NOW, BOOK_TRAVEL",
  "interests": ["3-5 relevant interest keywords as strings"],
  "campaignName": "Descriptive campaign name including product and date",
  "adSetName": "Ad set name describing the audience",
  "adName": "Specific ad name"
}

Pick the callToAction that best fits the product/service. Write compelling, direct copy that speaks to the target audience's pain points or desires.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON even if Claude wraps it in anything
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON" },
        { status: 500 }
      );
    }

    const generated = JSON.parse(jsonMatch[0]);

    // Validate required fields
    const required = [
      "primaryText",
      "headline",
      "callToAction",
      "interests",
      "campaignName",
      "adSetName",
      "adName",
    ];
    for (const field of required) {
      if (!generated[field]) {
        return NextResponse.json(
          { error: `AI response missing field: ${field}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(generated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
