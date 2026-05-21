"use client";

import { useState, useCallback, useEffect } from "react";
import AdForm, { AdFormData } from "./components/AdForm";
import AdPreview, { GeneratedAd } from "./components/AdPreview";

type Screen = "form" | "preview" | "confirmation";

interface ConfirmationData {
  campaignName: string;
  adsManagerUrl: string;
}

interface FacebookAssetOption {
  id: string;
  name?: string;
  username?: string;
  displayId?: string;
}

interface FacebookStatus {
  connected: boolean;
  user: { id: string; name: string; email: string | null } | null;
  permissions: { granted: string[]; missing: string[] };
  selected: {
    businessManagerId: string | null;
    pageId: string | null;
    adAccountId: string | null;
    instagramAccountId: string | null;
  } | null;
  assets: {
    businesses: FacebookAssetOption[];
    pages: FacebookAssetOption[];
    adAccounts: FacebookAssetOption[];
    instagramAccounts: FacebookAssetOption[];
  };
  error?: string;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("form");
  const [formData, setFormData] = useState<AdFormData | null>(null);
  const [generated, setGenerated] = useState<GeneratedAd | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [facebookStatus, setFacebookStatus] = useState<FacebookStatus | null>(null);
  const [loadingFacebook, setLoadingFacebook] = useState(true);
  const [savingAssetSelection, setSavingAssetSelection] = useState(false);

  const loadFacebookStatus = useCallback(async () => {
    setLoadingFacebook(true);
    try {
      const res = await fetch("/api/facebook/status", { cache: "no-store" });
      const json = (await res.json()) as FacebookStatus;
      setFacebookStatus(json);
    } catch {
      setFacebookStatus(null);
    } finally {
      setLoadingFacebook(false);
    }
  }, []);

  useEffect(() => {
    void loadFacebookStatus();
  }, [loadFacebookStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("fb_connected");
    const fbError = params.get("fb_error");

    if (connected) {
      setError(null);
      void loadFacebookStatus();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (fbError) {
      setError(`Facebook connection failed: ${fbError}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [loadFacebookStatus]);

  const generateAd = useCallback(async (data: AdFormData) => {
    setLoadingGenerate(true);
    setError(null);
    setFormData(data);

    // Build image preview URL
    const reader = new FileReader();
    reader.onload = (e) => setImagePreviewUrl(e.target?.result as string);
    reader.readAsDataURL(data.imageFile!);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: data.description,
          location: data.location,
          ageMin: data.ageMin,
          ageMax: data.ageMax,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to generate ad");
      }

      setGenerated(json as GeneratedAd);
      setScreen("preview");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingGenerate(false);
    }
  }, []);

  const regenerateAd = useCallback(async () => {
    if (!formData) return;
    await generateAd(formData);
  }, [formData, generateAd]);

  const createCampaign = useCallback(async () => {
    if (!formData || !generated || !formData.imageFile) return;

    if (!facebookStatus?.connected) {
      setError("Please connect your Facebook account before creating a campaign.");
      return;
    }

    setLoadingCreate(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("image", formData.imageFile);
      fd.append("campaignName", generated.campaignName);
      fd.append("adSetName", generated.adSetName);
      fd.append("adName", generated.adName);
      fd.append("primaryText", generated.primaryText);
      fd.append("headline", generated.headline);
      fd.append("callToAction", generated.callToAction);
      fd.append("interests", JSON.stringify(generated.interests));
      fd.append("location", formData.location);
      fd.append("ageMin", String(formData.ageMin));
      fd.append("ageMax", String(formData.ageMax));
      fd.append("dailyBudget", String(formData.dailyBudget));
      fd.append("publishImmediately", String(formData.publishImmediately));

      const res = await fetch("/api/create-campaign", {
        method: "POST",
        body: fd,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to create campaign");
      }

      setConfirmation({
        campaignName: generated.campaignName,
        adsManagerUrl: json.adsManagerUrl,
      });
      setScreen("confirmation");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingCreate(false);
    }
  }, [formData, generated, facebookStatus?.connected]);

  const saveAssetSelection = useCallback(
    async (payload: {
      businessManagerId?: string;
      pageId?: string;
      adAccountId?: string;
      instagramAccountId?: string;
    }) => {
      setSavingAssetSelection(true);
      setError(null);
      try {
        const res = await fetch("/api/facebook/select-assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error("Could not save selected Facebook assets");
        }
        await loadFacebookStatus();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save selected assets");
      } finally {
        setSavingAssetSelection(false);
      }
    },
    [loadFacebookStatus]
  );

  const disconnectFacebook = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/facebook/disconnect", { method: "POST" });
      if (!res.ok) {
        throw new Error("Could not disconnect Facebook");
      }
      await loadFacebookStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect Facebook");
    }
  }, [loadFacebookStatus]);

  const resetAll = () => {
    setScreen("form");
    setFormData(null);
    setGenerated(null);
    setImagePreviewUrl("");
    setConfirmation(null);
    setError(null);
  };

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent)" }}
          >
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">Ad Creator</span>
          <a
            href="/api/facebook/connect"
            className="ml-3 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            {facebookStatus?.connected ? "Reconnect Facebook" : "Connect Facebook"}
          </a>
          {/* Step indicator */}
          <div className="ml-auto flex items-center gap-2">
            {(["form", "preview", "confirmation"] as Screen[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full transition-colors"
                  style={{
                    background:
                      screen === s
                        ? "var(--accent)"
                        : i < ["form", "preview", "confirmation"].indexOf(screen)
                        ? "var(--muted)"
                        : "var(--border)",
                  }}
                />
                {i < 2 && (
                  <div
                    className="w-8 h-px"
                    style={{ background: "var(--border)" }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          className="mb-6 rounded-xl p-5 space-y-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-semibold text-white">Facebook Connection</h2>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                Connect, verify, and select the account assets used for publishing.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void loadFacebookStatus()}
                className="px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                disabled={loadingFacebook || savingAssetSelection}
              >
                Refresh
              </button>
              {facebookStatus?.connected ? (
                <button
                  onClick={() => void disconnectFacebook()}
                  className="px-3 py-2 rounded-lg text-xs font-medium"
                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
                >
                  Disconnect
                </button>
              ) : (
                <a
                  href="/api/facebook/connect"
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ background: "var(--accent)" }}
                >
                  Connect Facebook
                </a>
              )}
            </div>
          </div>

          {loadingFacebook ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Loading Facebook connection status...
            </p>
          ) : facebookStatus?.connected ? (
            <div className="space-y-4">
              <div
                className="rounded-lg px-3 py-2 text-xs"
                style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#6ee7b7" }}
              >
                Connected as {facebookStatus.user?.name || "Facebook User"}
                {facebookStatus.user?.email ? ` (${facebookStatus.user.email})` : ""}
              </div>

              {facebookStatus.permissions.missing.length > 0 && (
                <div
                  className="rounded-lg px-3 py-2 text-xs"
                  style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#fcd34d" }}
                >
                  Missing permissions: {facebookStatus.permissions.missing.join(", ")}. Reconnect Facebook to grant these permissions.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">Business Manager</label>
                  <select
                    className="w-full rounded-lg px-3 py-2 text-sm text-white"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                    value={facebookStatus.selected?.businessManagerId ?? ""}
                    onChange={(e) =>
                      void saveAssetSelection({ businessManagerId: e.target.value })
                    }
                    disabled={savingAssetSelection}
                  >
                    {facebookStatus.assets.businesses.length === 0 ? (
                      <option value="">No businesses found</option>
                    ) : (
                      facebookStatus.assets.businesses.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name || asset.id}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">Ad Account</label>
                  <select
                    className="w-full rounded-lg px-3 py-2 text-sm text-white"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                    value={facebookStatus.selected?.adAccountId ?? ""}
                    onChange={(e) => void saveAssetSelection({ adAccountId: e.target.value })}
                    disabled={savingAssetSelection}
                  >
                    {facebookStatus.assets.adAccounts.length === 0 ? (
                      <option value="">No ad accounts found</option>
                    ) : (
                      facebookStatus.assets.adAccounts.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name || asset.id}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">Facebook Page</label>
                  <select
                    className="w-full rounded-lg px-3 py-2 text-sm text-white"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                    value={facebookStatus.selected?.pageId ?? ""}
                    onChange={(e) => void saveAssetSelection({ pageId: e.target.value })}
                    disabled={savingAssetSelection}
                  >
                    {facebookStatus.assets.pages.length === 0 ? (
                      <option value="">No pages found</option>
                    ) : (
                      facebookStatus.assets.pages.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name || asset.id}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">Instagram Account</label>
                  <select
                    className="w-full rounded-lg px-3 py-2 text-sm text-white"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                    value={facebookStatus.selected?.instagramAccountId ?? ""}
                    onChange={(e) =>
                      void saveAssetSelection({ instagramAccountId: e.target.value })
                    }
                    disabled={savingAssetSelection}
                  >
                    <option value="">None</option>
                    {facebookStatus.assets.instagramAccounts.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.username || asset.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="rounded-lg px-3 py-2 text-xs"
              style={{ background: "rgba(107,114,128,0.15)", border: "1px solid var(--border)", color: "var(--muted)" }}
            >
              No Facebook account connected yet. Click <strong>Connect Facebook</strong> to link your Ads Manager account.
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="mb-6 rounded-lg px-4 py-3 text-sm"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#fca5a5",
            }}
          >
            <strong>Error:</strong> {error}
            <button
              className="ml-3 underline"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Screens */}
        {screen === "form" && (
          <AdForm
            onSubmit={generateAd}
            loading={loadingGenerate}
            initialData={formData ?? undefined}
          />
        )}

        {screen === "preview" && formData && generated && (
          <AdPreview
            formData={formData}
            generated={generated}
            imagePreviewUrl={imagePreviewUrl}
            onCreateAd={createCampaign}
            onRegenerate={regenerateAd}
            onBack={() => setScreen("form")}
            loading={loadingCreate || loadingGenerate}
          />
        )}

        {screen === "confirmation" && confirmation && (
          <div className="screen-enter space-y-6">
            <div
              className="rounded-xl p-8 text-center"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: "rgba(59,130,246,0.15)" }}
              >
                <svg className="w-7 h-7" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-xl font-semibold text-white mb-2">Campaign Created</h2>
              <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>
                {formData?.publishImmediately
                  ? "Your ad is now live and spending."
                  : "Your campaign is saved as a draft (PAUSED)."}
              </p>
              <p
                className="text-sm font-medium text-white mt-3 mb-6 px-4 py-2 rounded-lg inline-block"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              >
                {confirmation.campaignName}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href={confirmation.adsManagerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white transition-colors"
                  style={{ background: "var(--accent)" }}
                >
                  View in Ads Manager
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <button
                  onClick={resetAll}
                  className="px-5 py-3 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  Create Another Ad
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
