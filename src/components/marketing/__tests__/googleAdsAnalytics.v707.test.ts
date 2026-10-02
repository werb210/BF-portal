// BF_PORTAL_GOOGLE_ADS_ANALYTICS_v707
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { money, roasText, duration, visitorOutcome } from "../GoogleAdsAnalytics";
import { dedupeByPerson } from "../AbandonedPanel";
const dash = readFileSync("src/pages/marketing/MarketingDashboard.tsx", "utf8");
describe("Google Ads & Analytics section", () => {
  it("is one Ads section: Google, Microsoft and LinkedIn, with every Google report under Google", () => {
    // BF_PORTAL_ADS_SERVICES_v709
    expect(dash).toContain('{ id: "ads", label: "Ads" }');
    expect(dash).toContain('[["google", "Google"], ["microsoft", "Microsoft"], ["linkedin", "LinkedIn"]]');
    for (const t of ['["story", "Story"]', '["campaigns", "Campaigns & Keywords"]', '["negatives", "Search Terms & Negatives"]', '["visitors", "Visitors"]', '["dropoff", "Drop-off"]', '["audiences", "Audiences"]', '["website", "Website (GA4)"]', '["health", "Health"]']) expect(dash).toContain(t);
    expect(dash).toContain('adsService === "linkedin"');
    expect(dash).toContain('adsService === "microsoft"');
  });
  it("removes the duplicates", () => {
    expect(dash).not.toContain("function SourcesPanel");
    expect(dash).not.toContain('"adwaste"');
    expect(dash).not.toMatch(/tab === "analytics"[\s\S]{0,400}<Ga4Panel \/>/);
  });
  it("shows Maya's caveat when pause advice is held back", () => expect(dash).toContain('data-testid="maya-caveat"'));
  it("labels the submit funnel honestly", () => expect(readFileSync("src/pages/diagnostics/DiagnosticsPage.tsx", "utf8")).toContain("Submit taps (all apps, repeats included)"));
  it("calls the v707 server endpoints", () => {
    const src = readFileSync("src/components/marketing/GoogleAdsAnalytics.tsx", "utf8");
    for (const u of ["/api/marketing/ads-story", "/api/marketing/ads-visitors", "/api/marketing/ads-dropoff"]) expect(src).toContain(u);
  });
});
describe("formatting", () => {
  it("formats money, ROAS and time", () => { expect(money(null)).toBe("-"); expect(roasText(2.5)).toBe("2.50x"); expect(duration(65000)).toBe("1m 5s"); expect(duration(0)).toBe("-"); });
  it("describes how far a visitor got", () => {
    expect(visitorOutcome({ application_id: null, submitted_at: null, step: null, pipeline_state: null, funded_amount: null })).toBe("No application");
    expect(visitorOutcome({ application_id: "a", submitted_at: null, step: 3, pipeline_state: null, funded_amount: null })).toBe("Stopped at step 3");
    expect(visitorOutcome({ application_id: "a", submitted_at: "x", step: 6, pipeline_state: "Funded", funded_amount: 50000 })).toBe("Funded $50,000");
  });
});
describe("started, not submitted", () => {
  it("shows each person once, keeping their furthest application", () => {
    const rows = [
      { applicationId: "1", phone: "+16042170868", contactId: "c1", step: 1, lastActivityAt: "2026-10-01T08:00:00Z" },
      { applicationId: "2", phone: "+16042170868", contactId: "c2", step: 2, lastActivityAt: "2026-10-01T07:00:00Z" },
      { applicationId: "3", phone: "+19013431884", contactId: "c3", step: 1, lastActivityAt: "2026-09-27T07:00:00Z" },
    ];
    expect(dedupeByPerson(rows).map((r) => r.applicationId)).toEqual(["2", "3"]);
  });
});
