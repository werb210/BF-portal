import { useMemo, useState } from "react";

type MarketingTab = "campaigns" | "google-ads" | "linkedin-ads" | "analytics" | "bulk-sms" | "assets";

const MARKETING_TABS: { id: MarketingTab; label: string }[] = [
  { id: "campaigns", label: "Email Campaigns" },
  { id: "google-ads", label: "Google Ads" },
  { id: "linkedin-ads", label: "LinkedIn Ads" },
  { id: "analytics", label: "Analytics" },
  { id: "bulk-sms", label: "Bulk SMS" },
  { id: "assets", label: "Brand Assets" }
];

const MarketingDashboard = () => {
  const [tab, setTab] = useState<MarketingTab>("campaigns");

  const copy = useMemo(() => {
    switch (tab) {
      case "campaigns":
        return {
          title: "SendGrid Campaigns",
          details: "Track campaign name, status, sent count, open rate, and click rate.",
          cta: "Create Campaign"
        };
      case "google-ads":
        return {
          title: "Google Ads",
          details: "Spend, impressions, clicks, conversions this month plus campaign status controls.",
          cta: "Sync Google Ads"
        };
      case "linkedin-ads":
        return {
          title: "LinkedIn Ads",
          details: "Monitor campaign delivery and optimize high-intent audiences.",
          cta: "Connect LinkedIn"
        };
      case "analytics":
        return {
          title: "Analytics",
          details: "Application funnel and drop-off performance by step.",
          cta: "View Full Report"
        };
      case "bulk-sms":
        return {
          title: "Bulk SMS",
          details: "Compose and send SMS to targeted contact cohorts.",
          cta: "Compose Broadcast"
        };
      default:
        return {
          title: "Brand Assets",
          details: "Upload and manage logos, templates, and creative assets.",
          cta: "Upload Asset"
        };
    }
  }, [tab]);

  return (
    <div className="marketing-layout">
      <div className="marketing-tabs">
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

      <section className="marketing-metrics">
        <article className="dashboard-card"><span className="dashboard-card__label">Spend (MTD)</span><strong className="dashboard-card__value">$42,500</strong></article>
        <article className="dashboard-card"><span className="dashboard-card__label">Leads</span><strong className="dashboard-card__value">1,284</strong></article>
        <article className="dashboard-card"><span className="dashboard-card__label">CPL</span><strong className="dashboard-card__value">$33.10</strong></article>
        <article className="dashboard-card"><span className="dashboard-card__label">Attributed Deals</span><strong className="dashboard-card__value">57</strong></article>
      </section>

      <section className="drawer-section">
        <div className="drawer-section__title">{copy.title}</div>
        <p>{copy.details}</p>
        <button type="button" className="ui-button">{copy.cta}</button>
      </section>
    </div>
  );
};

export default MarketingDashboard;
