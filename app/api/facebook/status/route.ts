import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  graphApiUrl,
  normalizeAdAccountId,
  REQUIRED_META_PERMISSIONS,
} from "@/app/lib/facebook";

interface GraphUser {
  id: string;
  name?: string;
  email?: string;
}

interface GraphPermission {
  permission: string;
  status: "granted" | "declined";
}

interface GraphBusiness {
  id: string;
  name?: string;
}

interface GraphPage {
  id: string;
  name?: string;
  instagram_business_account?: {
    id: string;
    username?: string;
  };
}

interface GraphAdAccount {
  id: string;
  name?: string;
  account_id?: string;
}

interface GraphDataResponse<T> {
  data?: T[];
}

async function graphGet<T>(path: string, accessToken: string, fields?: string): Promise<T> {
  const url = graphApiUrl(path, {
    ...(fields ? { fields } : {}),
    access_token: accessToken,
  });
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(json.error?.message || `Graph API request failed for ${path}`);
  }
  return json;
}

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("fb_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({
      connected: false,
      user: null,
      permissions: {
        granted: [] as string[],
        missing: [...REQUIRED_META_PERMISSIONS],
      },
      selected: null,
      assets: {
        businesses: [],
        pages: [],
        adAccounts: [],
        instagramAccounts: [],
      },
    });
  }

  try {
    const user = await graphGet<GraphUser>("me", accessToken, "id,name,email");
    const permissionsRes = await graphGet<GraphDataResponse<GraphPermission>>(
      "me/permissions",
      accessToken
    );
    const businessesRes = await graphGet<GraphDataResponse<GraphBusiness>>(
      "me/businesses",
      accessToken,
      "id,name"
    );
    const pagesRes = await graphGet<GraphDataResponse<GraphPage>>(
      "me/accounts",
      accessToken,
      "id,name,instagram_business_account{id,username}"
    );
    const adAccountsRes = await graphGet<GraphDataResponse<GraphAdAccount>>(
      "me/adaccounts",
      accessToken,
      "id,name,account_id"
    );

    const granted = (permissionsRes.data ?? [])
      .filter((p) => p.status === "granted")
      .map((p) => p.permission);
    const missing = REQUIRED_META_PERMISSIONS.filter((perm) => !granted.includes(perm));

    const businesses = (businessesRes.data ?? []).map((b) => ({
      id: b.id,
      name: b.name || `Business ${b.id}`,
    }));
    const pages = (pagesRes.data ?? []).map((p) => ({
      id: p.id,
      name: p.name || `Page ${p.id}`,
    }));
    const adAccounts = (adAccountsRes.data ?? []).map((a) => ({
      id: normalizeAdAccountId(a.account_id || a.id),
      displayId: a.id,
      name: a.name || `Ad Account ${a.id}`,
    }));
    const instagramAccounts = (pagesRes.data ?? [])
      .filter((p) => p.instagram_business_account?.id)
      .map((p) => ({
        id: p.instagram_business_account!.id,
        username:
          p.instagram_business_account!.username ||
          `IG ${p.instagram_business_account!.id}`,
      }));

    const selectedBusinessId =
      cookieStore.get("fb_business_id")?.value || businesses[0]?.id || "";
    const selectedPageId = cookieStore.get("fb_page_id")?.value || pages[0]?.id || "";
    const selectedAdAccountId =
      cookieStore.get("fb_ad_account_id")?.value || adAccounts[0]?.id || "";
    const selectedInstagramId =
      cookieStore.get("fb_instagram_id")?.value || instagramAccounts[0]?.id || "";

    return NextResponse.json({
      connected: true,
      user: {
        id: user.id,
        name: user.name || "Facebook User",
        email: user.email || null,
      },
      permissions: {
        granted,
        missing,
      },
      selected: {
        businessManagerId: selectedBusinessId || null,
        pageId: selectedPageId || null,
        adAccountId: selectedAdAccountId || null,
        instagramAccountId: selectedInstagramId || null,
      },
      assets: {
        businesses,
        pages,
        adAccounts,
        instagramAccounts,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch Facebook account status";
    return NextResponse.json(
      {
        connected: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
