// BF_PORTAL_v923_SKIP_TEXTED - "Skip contacts who got a marketing text in the last 7 days" on the Email tab.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => {
  const apiFn = vi.fn(async () => ({})) as any;
  for (const m of ["get", "post", "patch", "put", "delete"]) apiFn[m] = vi.fn(async () => ({}));
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, http: h.apiFn,
  apiGetEnvelope: vi.fn(async () => ({ data: [], meta: { total: 0 } })), rawApiFetch: vi.fn(async () => new Response("{}")) }));
vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });

import BrandedEmailComposer from "../BrandedEmailComposer";

afterEach(cleanup);

describe("skip recently texted contacts", () => {
  it("re-counts with skipTexted=1 and shows the smaller number", async () => {
    h.apiFn.get.mockImplementation(async (url: string) => {
      if (url.includes("segments")) return { configured: true, all: 10, segments: [{ tag: "lender", n: 10 }] };
      if (url.includes("audience-count")) return { n: url.includes("skipTexted=1") ? 6 : 10 };
      return {};
    });
    render(<BrandedEmailComposer />);
    const box = await screen.findByTestId("skip-texted");
    fireEvent.click(box);
    await waitFor(() => expect(h.apiFn.get.mock.calls.some((c: any[]) => String(c[0]).includes("audience-count?skipTexted=1"))).toBe(true));
    expect(await screen.findByText("6")).toBeTruthy();
  });
});
