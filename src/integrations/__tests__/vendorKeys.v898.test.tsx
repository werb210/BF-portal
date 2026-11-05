// BF_PORTAL_v898_YOUR_SERVICES
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, put: h.put } }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import VendorKeysSettings from "../VendorKeysSettings";

const keys = [
  { key: "IPINFO_TOKEN", label: "ipinfo token", service: "ip", secret: true, set: false, preview: null },
  { key: "ONFIDO_API_TOKEN", label: "Entrust IDV (Onfido) API token", service: "id", secret: true, set: true, preview: "••••1234" },
];
const view = {
  services: [{ id: "id", name: "ID checks", signup: "https://example.test/id", what: "ID" }, { id: "ip", name: "IP location and VPN (ipinfo)", signup: "https://example.test/ip", what: "IP" }],
  keys, onfido_webhook_url: "https://api.example.test/api/kyc/webhooks/onfido", can_save: true,
};

beforeEach(() => { h.get.mockReset().mockResolvedValue(view); h.put.mockReset().mockResolvedValue({ ok: true, keys: keys.map((k) => k.key === "IPINFO_TOKEN" ? { ...k, set: true, preview: "••••abcd" } : k) }); });

describe("Your services", () => {
  it("shows saved keys masked, the webhook address, and saves only what was typed", async () => {
    render(<VendorKeysSettings />);
    await screen.findByText(/saved ••••1234/);
    expect(screen.getByText(view.onfido_webhook_url)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("ipinfo token"), { target: { value: " tok_abcd " } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[1]!);
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/vendor-keys", { values: { IPINFO_TOKEN: "tok_abcd" } }));
    await screen.findByText(/saved ••••abcd/);
  });
});
