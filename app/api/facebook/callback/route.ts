import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildAppBaseUrl, graphApiUrl } from "@/app/lib/facebook";

interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  error?: {
    message?: string;
  };
}

interface UserResponse {
  id: string;
  error?: {
    message?: string;
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorReason = url.searchParams.get("error_description") || url.searchParams.get("error");

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (errorReason) {
    return NextResponse.redirect(`${url.origin}/?fb_error=${encodeURIComponent(errorReason)}`);
  }

  if (!code || !state || !appId || !appSecret) {
    return NextResponse.redirect(`${url.origin}/?fb_error=missing_oauth_parameters`);
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("fb_oauth_state")?.value;
  if (!expectedState || expectedState !== state) {
    return NextResponse.redirect(`${url.origin}/?fb_error=invalid_oauth_state`);
  }

  const baseUrl = buildAppBaseUrl(req.headers);
  const redirectUri = `${baseUrl}/api/facebook/callback`;

  const tokenUrl = graphApiUrl("oauth/access_token", {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const tokenRes = await fetch(tokenUrl, { cache: "no-store" });
  const tokenJson = (await tokenRes.json()) as AccessTokenResponse;

  if (!tokenRes.ok || !tokenJson.access_token) {
    const message = tokenJson.error?.message || "Could not exchange Facebook auth code";
    return NextResponse.redirect(`${url.origin}/?fb_error=${encodeURIComponent(message)}`);
  }

  const userRes = await fetch(
    graphApiUrl("me", {
      fields: "id",
      access_token: tokenJson.access_token,
    }),
    { cache: "no-store" }
  );
  const userJson = (await userRes.json()) as UserResponse;

  const response = NextResponse.redirect(`${url.origin}/?fb_connected=1`);
  response.cookies.delete("fb_oauth_state");
  response.cookies.set("fb_access_token", tokenJson.access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: tokenJson.expires_in || 60 * 60 * 24 * 30,
  });

  if (userRes.ok && userJson.id) {
    response.cookies.set("fb_user_id", userJson.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: tokenJson.expires_in || 60 * 60 * 24 * 30,
    });
  }

  return response;
}
