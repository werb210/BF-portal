// BF_PORTAL_LINK_CLICKS_PANEL_v9
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import LinkClicksPanel from "../LinkClicksPanel";

const get = vi.fn();
vi.mock("@/api", () => ({ api: { get: (...a: unknown[]) => get(...a) } }));

beforeEach(() => { get.mockReset(); });

describe("LinkClicksPanel", () => {
  it("lists links ranked with clicks and unique people", async () => {
    get.mockResolvedValue({ items: [
      { url: "https://client.boreal.financial/apply", clicks: 12, contacts: 9, last_clicked: "2026-08-04T10:00:00Z" },
      { url: "https://www.boreal.financial/contact", clicks: 3, contacts: 3, last_clicked: "2026-08-03T10:00:00Z" },
    ] });
    render(<LinkClicksPanel />);
    await waitFor(() => expect(screen.getByText("https://client.boreal.financial/apply")).toBeTruthy());
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("https://www.boreal.financial/contact")).toBeTruthy();
  });

  it("queries the silo it was mounted against", async () => {
    get.mockResolvedValue({ items: [] });
    render(<LinkClicksPanel apiBase="/api/v1/bi/marketing" />);
    await waitFor(() => expect(get).toHaveBeenCalledWith("/api/v1/bi/marketing/link-clicks?days=90"));
  });

  it("says plainly that earlier sends are not backfilled", async () => {
    get.mockResolvedValue({ items: [] });
    render(<LinkClicksPanel />);
    await waitFor(() => expect(screen.getByText(/not backfilled/i)).toBeTruthy());
  });

  it("resolves a clicker by name on BF and by email on BI", async () => {
    get.mockImplementation((url: string) => Promise.resolve(
      String(url).includes("/contacts")
        ? { items: [{ email: "someone@example.com", clicks: 2, last_clicked: "2026-08-04T10:00:00Z" }] }
        : { items: [{ url: "https://x/apply", clicks: 2, contacts: 1, last_clicked: "2026-08-04T10:00:00Z" }] },
    ));
    render(<LinkClicksPanel />);
    await waitFor(() => expect(screen.getByText("https://x/apply")).toBeTruthy());
    fireEvent.click(screen.getByText("https://x/apply"));
    await waitFor(() => expect(screen.getByText(/someone@example.com/)).toBeTruthy());
  });
});
