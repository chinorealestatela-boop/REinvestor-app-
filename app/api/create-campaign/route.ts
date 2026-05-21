import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createFullCampaign } from "@/app/lib/meta";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const formData = await req.formData();

    const imageFile = formData.get("image") as File | null;
    if (!imageFile) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Convert image to base64
    const imageBuffer = await imageFile.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");

    const campaignName = formData.get("campaignName") as string;
    const adSetName = formData.get("adSetName") as string;
    const adName = formData.get("adName") as string;
    const primaryText = formData.get("primaryText") as string;
    const headline = formData.get("headline") as string;
    const callToAction = formData.get("callToAction") as string;
    const interestsRaw = formData.get("interests") as string;
    const location = formData.get("location") as string;
    const ageMin = parseInt(formData.get("ageMin") as string, 10);
    const ageMax = parseInt(formData.get("ageMax") as string, 10);
    const dailyBudget = parseFloat(formData.get("dailyBudget") as string);
    const publishImmediately = formData.get("publishImmediately") === "true";

    const interests = JSON.parse(interestsRaw || "[]") as string[];

    const result = await createFullCampaign({
      imageBase64,
      campaignName,
      adSetName,
      adName,
      primaryText,
      headline,
      callToAction,
      interests,
      location,
      ageMin,
      ageMax,
      dailyBudget,
      status: publishImmediately ? "ACTIVE" : "PAUSED",
      overrides: {
        accessToken: cookieStore.get("fb_access_token")?.value,
        adAccountId: cookieStore.get("fb_ad_account_id")?.value,
        pageId: cookieStore.get("fb_page_id")?.value,
      },
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
