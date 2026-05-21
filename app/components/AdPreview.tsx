"use client";

import { AdFormData } from "./AdForm";

export interface GeneratedAd {
  primaryText: string;
  headline: string;
  callToAction: string;
  interests: string[];
  campaignName: string;
  adSetName: string;
  adName: string;
}

interface AdPreviewProps {
  formData: AdFormData;
  generated: GeneratedAd;
  imagePreviewUrl: string;
  onCreateAd: () => void;
  onRegenerate: () => void;
  onBack: () => void;
  loading: boolean;
}

const CTA_LABELS: Record<string, string> = {
  LEARN_MORE: "Learn More",
  SIGN_UP: "Sign Up",
  GET_QUOTE: "Get Quote",
  CONTACT_US: "Contact Us",
  SUBSCRIBE: "Subscribe",
  APPLY_NOW: "Apply Now",
  DOWNLOAD: "Download",
  GET_OFFER: "Get Offer",
  SHOP_NOW: "Shop Now",
  BOOK_TRAVEL: "Book Now",
};

export default function AdPreview({
  formData,
  generated,
  imagePreviewUrl,
  onCreateAd,
  onRegenerate,
  onBack,
  loading,
}: AdPreviewProps) {
  return (
    <div className="screen-enter space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white mb-1">Preview</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Review the generated ad before sending to Meta.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Ad card mock */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="p-4 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "var(--accent)" }}
            >
              AD
            </div>
            <div>
              <p className="text-sm font-medium text-white">Your Page</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Sponsored · <span style={{ color: "var(--muted)" }}>🌐</span>
              </p>
            </div>
          </div>

          <p className="px-4 pb-3 text-sm text-gray-300 leading-relaxed">
            {generated.primaryText}
          </p>

          <img
            src={imagePreviewUrl}
            alt="Ad creative"
            className="w-full object-cover"
            style={{ maxHeight: "280px" }}
          />

          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <div>
              <p className="text-sm font-semibold text-white">{generated.headline}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                facebook.com
              </p>
            </div>
            <button
              className="text-xs font-semibold px-3 py-1.5 rounded"
              style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
            >
              {CTA_LABELS[generated.callToAction] ?? generated.callToAction}
            </button>
          </div>
        </div>

        {/* Right: Details */}
        <div className="space-y-4">
          <Section label="Ad Copy">
            <p className="text-sm text-gray-300 leading-relaxed">{generated.primaryText}</p>
          </Section>

          <Section label="Headline">
            <p className="text-sm text-white font-medium">{generated.headline}</p>
          </Section>

          <Section label="Call to Action">
            <span
              className="text-xs font-medium px-2.5 py-1 rounded"
              style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent)" }}
            >
              {CTA_LABELS[generated.callToAction] ?? generated.callToAction}
            </span>
          </Section>

          <Section label="Interest Targeting">
            <div className="flex flex-wrap gap-2">
              {generated.interests.map((interest) => (
                <span
                  key={interest}
                  className="text-xs px-2.5 py-1 rounded"
                  style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                >
                  {interest}
                </span>
              ))}
            </div>
          </Section>

          <Section label="Campaign Details">
            <div className="space-y-1.5">
              <Detail label="Campaign" value={generated.campaignName} />
              <Detail label="Ad Set" value={generated.adSetName} />
              <Detail label="Ad" value={generated.adName} />
              <Detail label="Budget" value={`€${formData.dailyBudget}/day`} />
              <Detail label="Location" value={formData.location} />
              <Detail label="Age" value={`${formData.ageMin}–${formData.ageMax}`} />
            </div>
          </Section>

          <Section label="Status">
            {formData.publishImmediately ? (
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded"
                  style={{ background: "rgba(239,68,68,0.15)", color: "var(--danger)" }}
                >
                  ACTIVE — Will spend real money
                </span>
              </div>
            ) : (
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded"
                style={{ background: "rgba(107,114,128,0.15)", color: "var(--muted)" }}
              >
                PAUSED — Saved as draft
              </span>
            )}
          </Section>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          disabled={loading}
          className="px-5 py-3 text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        >
          ← Back
        </button>

        <button
          onClick={onRegenerate}
          disabled={loading}
          className="px-5 py-3 text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        >
          Regenerate
        </button>

        <button
          onClick={onCreateAd}
          disabled={loading}
          className="flex-1 py-3 text-sm rounded-lg font-semibold text-white transition-colors disabled:opacity-50"
          style={{ background: loading ? "var(--border)" : "var(--accent)" }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating Campaign...
            </span>
          ) : (
            "Create Ad →"
          )}
        </button>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-4 space-y-2"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="text-xs shrink-0" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-xs text-gray-300 text-right">{value}</span>
    </div>
  );
}
