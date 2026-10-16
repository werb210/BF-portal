// BF_PORTAL_v814_JOURNEY_LABELS - the visitor journey path reads in plain words.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const get = vi.fn();
vi.mock("@/api", () => ({ api: { get: (...a: unknown[]) => get(...(a as [])) } }));
import ContactJourney, { humanName, journeyLabel } from "../ContactJourney";

const ev = (event_type: string, detail: Record<string, string | number> | null = null, step: string | null = null) =>
  ({ event_type, detail, step });

describe("journey labels", () => {
  it("names fields, buttons and forms", () => {
    expect(journeyLabel(ev("field_complete", { field: "Annual revenue" }))).toBe("Filled in: Annual revenue");
    expect(journeyLabel(ev("field_abandon", { field: "businessName" }))).toBe("Stopped at: Business name");
    expect(journeyLabel(ev("click", { label: "Start Your Application" }))).toBe("Clicked: Start Your Application");
    expect(journeyLabel(ev("form_start", { form: "Contact us" }))).toBe("Started form: Contact us");
    expect(journeyLabel(ev("form_submit", { form: "Contact us" }))).toBe("Sent form: Contact us");
    expect(journeyLabel(ev("form_abandon", { form: "Contact us", field: "phone" }))).toBe("Left form: Contact us (at Phone)");
    expect(journeyLabel(ev("session_start"))).toBe("Arrived on site");
    expect(journeyLabel(ev("scroll", { depth: 75 }))).toBe("Scrolled 75%");
    expect(journeyLabel(ev("wizard_step", null, "2"))).toBe("Wizard step 2");
  });
  it("never shows a raw code word", () => {
    expect(journeyLabel(ev("field_complete"))).toBe("Filled in a field");
    expect(journeyLabel(ev("field_complete", { field: ":r3:" }))).toBe("Filled in a field");
    expect(humanName("annual_revenue")).toBe("Annual revenue");
    expect(humanName("monthly-revenue")).toBe("Monthly revenue");
  });
  it("shows them in the Path list", async () => {
    get.mockResolvedValue({
      sessions: [{ session_id: "s1", first_seen_at: "2026-10-16T08:00:00Z", last_seen_at: "2026-10-16T08:05:00Z", landing_page: "/", referrer: null, gclid: null, utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null }],
      events: [
        { session_id: "s1", event_type: "session_start", path: "/", title: null, step: null, dwell_ms: null, occurred_at: "2026-10-16T08:00:00Z", detail: null },
        { session_id: "s1", event_type: "field_complete", path: "/apply/step-1", title: null, step: "1", dwell_ms: null, occurred_at: "2026-10-16T08:01:00Z", detail: { field: "Annual revenue" } },
      ],
    });
    render(<ContactJourney contactId="c1" />);
    expect(await screen.findByText("Filled in: Annual revenue")).toBeInTheDocument();
    expect(screen.getByText("Arrived on site")).toBeInTheDocument();
    expect(screen.queryByText("field_complete")).not.toBeInTheDocument();
  });
});
