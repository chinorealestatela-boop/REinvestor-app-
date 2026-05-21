import { NextRequest, NextResponse } from "next/server";
import { normalizeAdAccountId } from "@/app/lib/facebook";

interface AssetSelectionBody {
  businessManagerId?: string;
  pageId?: string;
  adAccountId?: string;
  instagramAccountId?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as AssetSelectionBody;
  const response = NextResponse.json({ ok: true });

  if (body.businessManagerId !== undefined) {
    response.cookies.set("fb_business_id", body.businessManagerId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  if (body.pageId !== undefined) {
    response.cookies.set("fb_page_id", body.pageId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  if (body.adAccountId !== undefined) {
    response.cookies.set("fb_ad_account_id", normalizeAdAccountId(body.adAccountId), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  if (body.instagramAccountId !== undefined) {
    response.cookies.set("fb_instagram_id", body.instagramAccountId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}
