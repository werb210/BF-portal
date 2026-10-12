// BF_PORTAL_DASHBOARD_CONTRAST_v1
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import css from "@/styles/globals.css?raw";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn();
  apiFn.post = vi.fn();
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, rawApiFetch: vi.fn() }));
vi.mock("@/context/SiloContext", () => ({ useSilo: () => ({ silo: "BF" }) }));

import DashboardAnalytics from "../DashboardAnalytics";

describe("dashboard contrast v1", () => {
  let style: HTMLStyleElement;
  beforeAll(() => {
    style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  });
  afterAll(() => style.remove());

  it("sets a readable foreground on drawer sections", () => {
    document.body.innerHTML = '<div class="drawer-section">x</div>';
    const s = getComputedStyle(document.querySelector(".drawer-section")!);
    expect(s.background).toBe("var(--ui-surface-muted)");
    expect(s.color).toBe("var(--ui-text)");
    document.body.innerHTML = "";
  });

  it("styles dashboard stat values and hints explicitly", async () => {
    h.apiFn.get.mockResolvedValue({ revenueFunnel: { visits: 12345, applications: 50, submitted: 20, funded: 5 } });
    render(<DashboardAnalytics />);
    const visits = await screen.findByText((12345).toLocaleString());
    expect(visits.tagName).toBe("STRONG");
    expect(visits.style.color).toBe("var(--ui-text)");
    expect(visits.style.fontSize).toBe("24px");
    const hint = screen.getByText(/of visits/);
    expect(hint.tagName).toBe("SMALL");
    expect(hint.style.color).toBe("var(--ui-text-muted)");
    expect(hint.style.fontSize).toBe("12px");
    for (const label of ["Applications", "Submitted", "Funded"]) {
      const section = screen.getByText(label, { selector: ".drawer-section__title" }).parentElement!;
      expect(section.querySelector("strong")!.style.fontSize).toBe("24px");
      expect(section.querySelector("small")!.style.color).toBe("var(--ui-text-muted)");
    }
  });
});
