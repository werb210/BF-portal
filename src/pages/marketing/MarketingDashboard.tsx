import { useMemo, useState } from "react";

type MarketingTab = "analytics" | "bulk-sms" | "assets";

const MARKETING_TABS: { id: MarketingTab; label: string }[] = [
  { id: "analytics", label: "Analytics" },
  { id: "bulk-sms", label: "Bulk SMS" },
  { id: "assets", label: "Brand Assets" }
];

const MarketingDashboard = () => {
  const [tab, setTab] = useState<MarketingTab>("analytics");
  const [audienceType, setAudienceType] = useState<"all" | "filtered">("all");
  const [filterTags, setFilterTags] = useState("");
  const [filterStage, setFilterStage] = useState("Application Started");
  const [smsBody, setSmsBody] = useState("");

  const metricCards = useMemo(() => {
    switch (tab) {
      case "analytics":
        return {
          cards: [
            { label: "Total Visits", value: "19,842" },
            { label: "Conversion %", value: "11.2%" },
            { label: "Step Completion %", value: "64.8%" }
          ]
        };
      case "bulk-sms":
        return {
          cards: [
            { label: "Audience", value: audienceType === "all" ? "All contacts" : "Filtered segment" },
            { label: "Targetable Contacts", value: audienceType === "all" ? "3,248" : "842" },
            { label: "Estimated Credits", value: audienceType === "all" ? "3,248 SMS" : "842 SMS" }
          ]
        };
      default:
        return {
          cards: [
            { label: "Uploaded Assets", value: "8" },
            { label: "Brand Templates", value: "4" },
            { label: "Last Upload", value: "Today" }
          ]
        };
    }
  }, [audienceType, tab]);

  const stepFunnel = [
    { step: "Visit", completion: 100, dropOff: "0%" },
    { step: "Start Application", completion: 62, dropOff: "38%" },
    { step: "Submit Docs", completion: 38, dropOff: "24%" },
    { step: "Qualified", completion: 23, dropOff: "15%" },
    { step: "Funded", completion: 11.2, dropOff: "11.8%" }
  ];

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
        {metricCards.cards.map((card) => (
          <article className="dashboard-card" key={card.label}>
            <span className="dashboard-card__label">{card.label}</span>
            <strong className="dashboard-card__value">{card.value}</strong>
          </article>
        ))}
      </section>

      {tab === "analytics" && (
        <section className="drawer-section marketing-panel">
          <div className="drawer-section__title">Conversion funnel</div>
          <div className="marketing-funnel">
            {stepFunnel.map((step) => (
              <article key={step.step} className="marketing-funnel__step">
                <div className="marketing-funnel__row">
                  <strong>{step.step}</strong>
                  <span>{step.completion}% completion</span>
                </div>
                <div className="marketing-funnel__bar">
                  <div className="marketing-funnel__fill" style={{ width: `${step.completion}%` }} />
                </div>
                <p className="dashboard-card__label">Drop-off: {step.dropOff}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "bulk-sms" && (
        <section className="drawer-section marketing-panel marketing-panel--form">
          <div className="drawer-section__title">Bulk SMS broadcast</div>
          <div className="marketing-form-grid">
            <label className="ui-field">
              <span className="ui-field__label">Audience selector</span>
              <select className="ui-select" value={audienceType} onChange={(e) => setAudienceType(e.target.value as "all" | "filtered")}>
                <option value="all">All contacts</option>
                <option value="filtered">Filtered contacts</option>
              </select>
            </label>
            <label className="ui-field">
              <span className="ui-field__label">Filter tags</span>
              <input className="ui-input" value={filterTags} onChange={(event) => setFilterTags(event.target.value)} placeholder="VIP, Repeat borrower, High intent" />
            </label>
            <label className="ui-field">
              <span className="ui-field__label">Pipeline stage</span>
              <select className="ui-select" value={filterStage} onChange={(event) => setFilterStage(event.target.value)}>
                <option>Application Started</option>
                <option>Documents Requested</option>
                <option>Qualified</option>
                <option>Funded</option>
              </select>
            </label>
          </div>
          <label className="ui-field">
            <span className="ui-field__label">Message composer</span>
            <textarea
              className="ui-input ui-textarea marketing-panel__textarea"
              value={smsBody}
              onChange={(event) => setSmsBody(event.target.value)}
              placeholder="Write your SMS broadcast message..."
            />
          </label>
          <div className="marketing-panel__footer">
            <p>Sending to <strong>{audienceType === "all" ? "3,248" : "842"}</strong> contacts</p>
            <button type="button" className="ui-button">Review and send</button>
          </div>
        </section>
      )}

      {tab === "assets" && (
        <section className="drawer-section marketing-panel">
          <div className="marketing-panel__header">
            <div className="drawer-section__title">Brand asset library</div>
            <button type="button" className="ui-button">Upload asset</button>
          </div>
          <div className="brand-assets-grid">
            {[
              "Primary Logo",
              "Dark Logo",
              "Email Header",
              "Social Kit",
              "Landing Hero",
              "PDF Letterhead"
            ].map((asset) => (
              <article key={asset} className="brand-assets-card">
                <div className="brand-assets-card__thumb">{asset.slice(0, 2)}</div>
                <div>
                  <strong>{asset}</strong>
                  <p className="dashboard-card__label">PNG • Updated 2 days ago</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default MarketingDashboard;
