import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildAppBaseUrl, REQUIRED_META_PERMISSIONS } from "@/app/lib/facebook";

export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID;

  if (!appId) {
    return NextResponse.json(
      {
        error: "META_APP_ID is not configured. Add it to your environment settings.",
      },
      { status: 500 }
    );
  }

  const baseUrl = buildAppBaseUrl(req.headers);
  const redirectUri = `${baseUrl}/api/facebook/callback`;
  const state = randomUUID();
  const scope = REQUIRED_META_PERMISSIONS.join(",");

  const authUrl = `https://www.facebook.com/v25.0/dialog/oauth?client_id=${encodeURIComponent(
    appId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scope)}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("fb_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
  });

  return response;
}
