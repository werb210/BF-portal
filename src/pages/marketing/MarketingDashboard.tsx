import { useState } from "react";

type MarketingTab = "google-ads" | "linkedin-ads" | "analytics" | "bulk-sms" | "assets";

const MARKETING_TABS: { id: MarketingTab; label: string }[] = [
  { id: "google-ads", label: "Google Ads" },
  { id: "linkedin-ads", label: "LinkedIn Ads" },
  { id: "analytics", label: "Analytics" },
  { id: "bulk-sms", label: "Bulk SMS" },
  { id: "assets", label: "Brand Assets" },
];

const MarketingDashboard = () => {
  const [tab, setTab] = useState<MarketingTab>("bulk-sms");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {MARKETING_TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`ui-button ${tab === entry.id ? "ui-button--primary" : "ui-button--secondary"}`}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "google-ads" && (
        <section className="drawer-section">
          <div className="drawer-section__title">Google Ads</div>
          <p>Spend, impressions, clicks, conversions this month plus campaign status toggles.</p>
        </section>
      )}

      {tab === "linkedin-ads" && (
        <section className="drawer-section">
          <div className="drawer-section__title">LinkedIn Ads</div>
          <p>Mirror Google Ads data and controls for LinkedIn campaigns.</p>
        </section>
      )}

      {tab === "analytics" && (
        <section className="drawer-section">
          <div className="drawer-section__title">Analytics</div>
          <p>Application funnel: visits → readiness check → OTP → step 1 → step 6 → submitted.</p>
          <p>Drop-off rates by step are summarized here.</p>
        </section>
      )}

      {tab === "bulk-sms" && (
        <section className="drawer-section">
          <div className="drawer-section__title">Bulk SMS</div>
          <p>Compose message and send to all contacts or audience filtered by tag/stage.</p>
        </section>
      )}

      {tab === "assets" && (
        <section className="drawer-section">
          <div className="drawer-section__title">Brand Assets</div>
          <p>Upload and manage logos, images, templates, and reusable creative assets.</p>
        </section>
      )}
    </div>
  );
};

export default MarketingDashboard;
