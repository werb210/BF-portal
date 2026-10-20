// BF_PORTAL_v835_LENDER_TABS - the lender portal is four tabs: Company info, Products, Product sheets & marketing,
// Applications you cannot place (was "Send us files you declined"). The open tab survives a reload.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/api", () => ({ api: h.api, rawApiFetch: vi.fn(), apiFetch: vi.fn() }));

import LenderPortalPage, { initialLenderTab, LENDER_TABS } from "../LenderPortalPage";

const page = () => render(<MemoryRouter><LenderPortalPage /></MemoryRouter>);

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem("lender_token", "t");
  h.api.mockReset();
  h.api.mockImplementation(async (path: string) => {
    if (path.includes("/api/lender/me")) return { name: "Todd's lending company", contact_name: "Todd Werboweski" };
    if (path.includes("referral")) return { files: [] };
    return { products: [], uploads: [], files: [] };
  });
});

describe("lender portal tabs", () => {
  it("has the four tabs, in order", () => {
    expect(LENDER_TABS.map((t) => t.label)).toEqual([
      "Company info", "Products", "Product sheets & marketing", "Applications you cannot place",
    ]);
  });

  it("opens on Company info and shows one tab at a time", async () => {
    page();
    expect(await screen.findByRole("heading", { name: "Company information" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Your products" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Company info" }).getAttribute("aria-selected")).toBe("true");

    fireEvent.click(screen.getByRole("tab", { name: "Products" }));
    expect(screen.getByRole("heading", { name: "Your products" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Company information" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Product sheets & marketing" }));
    expect(screen.getByRole("heading", { name: "Product sheets & marketing" })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Applications you cannot place" }));
    expect(await screen.findByRole("heading", { name: "Applications you cannot place" })).toBeTruthy();
    expect(screen.queryByText("Send us files you declined")).toBeNull();
  });

  it("remembers the open tab for the session", () => {
    expect(initialLenderTab()).toBe("company");
    sessionStorage.setItem("lender_portal_tab", "marketing");
    expect(initialLenderTab()).toBe("marketing");
    sessionStorage.setItem("lender_portal_tab", "nonsense");
    expect(initialLenderTab()).toBe("company");
  });
});
