// BF_PORTAL_CONTACT_RECORD_TABS_v272
import { describe, expect, it, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import ContactRecordTabs, { CONTACT_TAB_KEY, initialContactTab } from "../ContactRecordTabs";
describe("contact record tabs", () => {
  beforeEach(() => sessionStorage.clear());
  it("opens on Timeline, switches to Analytics, and keeps both mounted", () => {
    render(<ContactRecordTabs analytics={<div>Stage history panel</div>} timeline={<div>All activity panel</div>} />);
    expect(screen.getByRole("tab", { name: "Timeline" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("contact-panel-analytics").hidden).toBe(true);
    fireEvent.click(screen.getByRole("tab", { name: "Analytics" }));
    expect(screen.getByTestId("contact-panel-analytics").hidden).toBe(false);
    expect(screen.getByTestId("contact-panel-timeline").hidden).toBe(true);
    expect(screen.getByText("All activity panel")).toBeTruthy();
    expect(sessionStorage.getItem(CONTACT_TAB_KEY)).toBe("analytics");
  });
  it("remembers the last tab for the session", () => {
    expect(initialContactTab(() => "analytics")).toBe("analytics");
    expect(initialContactTab(() => null)).toBe("timeline");
    expect(initialContactTab(() => { throw new Error("blocked"); })).toBe("timeline");
  });
});
describe("wiring in both silos", () => {
  const root = path.resolve(__dirname, "../../../..");
  const bf = fs.readFileSync(path.join(root, "src/pages/crm/contacts/ContactDetailPage.tsx"), "utf8");
  const bi = fs.readFileSync(path.join(root, "src/silos/bi/crm/contacts/BIContactDetailPage.tsx"), "utf8");
  it("BF: analytics has stage history, AI summary and journey; timeline has all activity", () => {
    const analytics = bf.slice(bf.indexOf("analytics={"), bf.indexOf("timeline={"));
    expect(analytics).toContain("<ContactStageHistory contactId={id} showEmpty />");
    expect(analytics).toContain("<ContactAiSummary contactId={id} />");
    expect(analytics).toContain("<ContactJourney contactId={id} />");
    expect(bf.slice(bf.indexOf("timeline={"))).toContain("<UnifiedTimeline");
  });
  it("BI: analytics reads BI-Server, timeline keeps the activity feed, emails, calls and notes", () => {
    const analytics = bi.slice(bi.indexOf("analytics={"), bi.indexOf("timeline={"));
    expect(analytics).toContain("/api/v1/bi/crm/contacts/${id}/stage-events");
    expect(analytics).toContain("/api/v1/bi/crm/contacts/${id}/ai-summary");
    expect(analytics).toContain("<NoVisitorJourneyNotice />");
    const timeline = bi.slice(bi.indexOf("timeline={"));
    for (const part of ["<ActivityTimeline items={timelineItems} />", "<ContactEmailFeed contactId={id} />", "<ContactCallFeed contactId={id} />", "{contact.notes && ("]) expect(timeline).toContain(part);
  });
});
