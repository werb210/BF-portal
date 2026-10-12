// BF_PORTAL_REFERRER_CONTRAST_v1
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
// Referrer Management must be legible in both themes: text uses the theme token classes
// (text-ui-text / text-ui-muted / text-ui-success) rather than fixed greys, and no element
// renders white text on a white or near-white background.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn();
  apiFn.post = vi.fn();
  apiFn.put = vi.fn();
  apiFn.patch = vi.fn();
  apiFn.delete = vi.fn();
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));

import BFReferrerManagement from "../BFReferrerManagement";

const WHITE_RGB = /^rgba?\(\s*(2[4-5]\d)\s*,\s*(2[4-5]\d)\s*,\s*(2[4-5]\d)/;

function classesOf(el: Element): string[] {
  return (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
}

function hasWhiteText(el: HTMLElement): boolean {
  if (classesOf(el).some((c) => c === "text-white" || c.startsWith("text-white/"))) return true;
  return WHITE_RGB.test(el.style.color) || /^(#fff|#ffffff|white)$/i.test(el.style.color);
}

// The nearest background this element paints on: its own or an ancestor's bg class / inline background.
function effectiveBackground(el: HTMLElement): string | null {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const bg = classesOf(node).find((c) => /^bg-/.test(c) && !/^bg-(opacity|clip|cover|center|no-repeat)/.test(c));
    if (bg) return bg;
    const inline = node.style.backgroundColor || node.style.background;
    if (inline) return inline;
  }
  return null;
}

function isNearWhiteBackground(bg: string): boolean {
  return (
    /^bg-white(\/|$)/.test(bg) ||
    /^bg-(gray|slate|zinc|neutral|stone)-(50|100)(\/|$)/.test(bg) ||
    WHITE_RGB.test(bg) ||
    /^(#fff|#ffffff|white)$/i.test(bg)
  );
}

function expectNoWhiteOnWhite(root: HTMLElement) {
  const offenders: string[] = [];
  for (const el of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
    if (classesOf(el).some((c) => /^bg-white\/5$/.test(c))) offenders.push(`${el.tagName} uses bg-white/5`);
    if (!hasWhiteText(el)) continue;
    const bg = effectiveBackground(el);
    if (!bg || isNearWhiteBackground(bg)) offenders.push(`${el.tagName} "${el.textContent}" white text on ${bg ?? "page background"}`);
  }
  expect(offenders).toEqual([]);
}

beforeEach(() => {
  h.apiFn.mockReset();
  h.apiFn.mockImplementation(async (path: string) => {
    if (path === "/api/admin/referrers") {
      return {
        referrers: [{ id: "r1", full_name: "Jane Referrer", email: "jane@example.com", total_accrued: 500, referrals_count: 1 }],
      };
    }
    if (path === "/api/admin/referrers/r1/detail") {
      return {
        referrer: { id: "r1", full_name: "Jane Referrer", email: "jane@example.com" },
        referrals: [
          { id: "f1", full_name: "Matched Client", application_created: true, matched_at: "2026-01-01" },
          { id: "f2", full_name: "Invited Client", sms_sent_at: "2026-01-01", ref_code: "abc" },
        ],
        applications: [{ id: "a1", business_name: "Client Co", stage: "Offer" }],
        commissions: [{ id: "c1", amount: 500, status: "accrued", business_name: "Client Co" }],
      };
    }
    return {};
  });
});

describe("referrer management contrast", () => {
  it("uses no white-on-white text", async () => {
    const { container } = render(<BFReferrerManagement />);
    fireEvent.click(await screen.findByText("Jane Referrer"));
    await screen.findByText("Matched Client");
    expectNoWhiteOnWhite(container);
    // The approve/pay-out button is white on a dark emerald fill.
    const pay = screen.getByRole("button", { name: /^Pay out/ });
    expect(pay).toHaveClass("bg-emerald-700", "text-white");
  });

  it("heading and texts use theme token colours that are legible in both themes", async () => {
    const { container } = render(<BFReferrerManagement />);
    const heading = screen.getByRole("heading", { name: "Referrer Management" });
    // The heading inherits the page text token.
    expect(heading.closest(".text-ui-text")).not.toBeNull();
    expect(screen.getByText(/^Loading/)).toHaveClass("text-ui-muted");

    fireEvent.click(await screen.findByText("Jane Referrer"));
    await screen.findByText("Matched Client");
    expect(screen.getByText("jane@example.com", { selector: "tr div" })).toHaveClass("text-ui-muted");
    expect(screen.getByText("Name").closest("thead")).toHaveClass("bg-ui-surface-muted", "text-ui-muted");
    expect(screen.getByText(/^Matched /, { selector: "span" })).toHaveClass("text-ui-success");
    expect(screen.getByText("Invited")).toHaveClass("bg-ui-surface-muted", "text-ui-muted");
    expect(screen.getByText(/^Referrals \(/)).toHaveClass("text-ui-text");

    // No fixed grey text classes that only work on one theme's background.
    const fixedGrey = Array.from(container.querySelectorAll<HTMLElement>("*")).filter((el) =>
      classesOf(el).some((c) => /^text-(gray|slate)-\d+/.test(c)),
    );
    expect(fixedGrey.map((el) => el.getAttribute("class"))).toEqual([]);
  });
});
