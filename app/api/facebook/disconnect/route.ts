import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("fb_access_token");
  response.cookies.delete("fb_user_id");
  response.cookies.delete("fb_business_id");
  response.cookies.delete("fb_page_id");
  response.cookies.delete("fb_ad_account_id");
  response.cookies.delete("fb_instagram_id");
  response.cookies.delete("fb_oauth_state");
  return response;
}
