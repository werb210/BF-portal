// BF_PORTAL_EMAIL_PREVIEW_WIDTH_v1 / BF_PORTAL_SEQ_AUDIENCE_LAYOUT_v1
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import rootConfig from "../../../../staticwebapp.config.json";
import publicConfig from "../../../../public/staticwebapp.config.json";

const h = vi.hoisted(() => {
  const apiFn = vi.fn(async () => ({})) as any;
  for (const m of ["get", "post", "patch", "put", "delete"]) apiFn[m] = vi.fn(async () => ({}));
  return { apiFn, resize: [] as Array<() => void> };
});
vi.mock("@/api", () => ({
  api: h.apiFn,
  default: h.apiFn,
  http: h.apiFn,
  apiGetEnvelope: vi.fn(async () => ({ data: [], meta: { total: 0 } })),
  rawApiFetch: vi.fn(async () => new Response("{}")),
}));

import BrandedEmailComposer from "../BrandedEmailComposer";
import MarketingDashboard from "@/pages/marketing/MarketingDashboard";

let paneWidth = 300;
beforeEach(() => {
  h.resize.length = 0;
  h.apiFn.get.mockImplementation(async (url: string) =>
    url.includes("segments") ? { configured: true, all: 3, segments: [{ tag: "lenders", n: 2 }, { tag: "brokers", n: 1 }] } : {});
  h.apiFn.post.mockImplementation(async (url: string) => (url.endsWith("/email/template/preview") ? { html: "<p>Hi</p>" } : {}));
  vi.stubGlobal("ResizeObserver", class {
    constructor(cb: () => void) { h.resize.push(cb); }
    observe() {}
    disconnect() {}
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => paneWidth });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
});

describe("email preview, assets, and audience layout", () => {
  it("keeps both static web app configs identical and permits BI email assets", () => {
    expect(publicConfig).toEqual(rootConfig);
    const csp = rootConfig.globalHeaders["Content-Security-Policy"];
    const imageSources = (csp.split(";").map((d) => d.trim()).find((d) => d.startsWith("img-src ")) ?? "").split(/\s+/);
    expect(imageSources).toContain("https://bi-server-cse0apamgkheb9d5.canadacentral-01.azurewebsites.net");
  });

  it("renders the preview at 600px and scales it into its pane", async () => {
    paneWidth = 300;
    render(<BrandedEmailComposer />);
    const frame = screen.getByTitle("Email preview") as HTMLIFrameElement;
    expect(frame.style.width).toBe("600px");
    expect(frame.style.transformOrigin).toBe("top left");
    expect(frame.style.transform).toBe("scale(0.5)");
    expect((frame.parentElement as HTMLElement).style.width).toBe("300px");

    // The pane widens: the preview grows with it, but never past 2x.
    paneWidth = 900;
    act(() => h.resize.forEach((cb) => cb()));
    expect(frame.style.transform).toBe("scale(1.5)");
    expect(frame.style.width).toBe("600px");
    paneWidth = 3000;
    act(() => h.resize.forEach((cb) => cb()));
    expect(frame.style.transform).toBe("scale(2)");
  });

  it("places independently scrolling include and exclude lists side by side", async () => {
    render(<MemoryRouter><MarketingDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Sequences" }));
    const include = (await screen.findByText("Include tags")).closest("fieldset") as HTMLElement;
    const exclude = screen.getByText("Exclude tags").closest("fieldset") as HTMLElement;
    // Side by side: siblings in one grid that has two columns from the sm breakpoint.
    expect(include.parentElement).toBe(exclude.parentElement);
    expect(include.parentElement!.className.split(/\s+/)).toEqual(expect.arrayContaining(["grid", "sm:grid-cols-2"]));
    // Each list scrolls on its own.
    for (const fieldset of [include, exclude]) {
      await within(fieldset).findByText("lenders (2)");
      const list = within(fieldset).getByText("lenders (2)").closest("label")!.parentElement as HTMLElement;
      expect(list.className.split(/\s+/)).toEqual(expect.arrayContaining(["max-h-48", "overflow-y-auto"]));
    }
  });
});
