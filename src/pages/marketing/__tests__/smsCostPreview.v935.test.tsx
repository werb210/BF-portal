// BF_PORTAL_v935_SMS_COST_PREVIEW - the SMS screen shows segments and an estimated cost before sending.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/api";
import MarketingDashboard from "../MarketingDashboard";

describe("SMS cost preview", () => {
  it("asks the server for the segments and shows the estimate", async () => {
    vi.spyOn(api, "get").mockImplementation(async (url: string) => {
      if (String(url).includes("/sms/segments")) return { data: { configured: true, all: 216, segments: [], audiences: [], mobiles: 216, ineligible: 0 } } as never;
      if (String(url).includes("/sms/audience-count")) return { data: { n: 216 } } as never;
      return {} as never;
    });
    const post = vi.spyOn(api, "post").mockImplementation(async (url: string) => {
      if (String(url).includes("/sms/preview")) return { data: { segments: 2, encoding: "GSM-7", characters: 290, replaced: ["’"], nonGsm: [], perTextUsd: 0.024, estimatedUsd: 5.18, recipients: 216 } } as never;
      return {} as never;
    });
    render(<MemoryRouter><MarketingDashboard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: /^SMS$/ }));
    const box = await screen.findByRole("textbox", { name: /Message/ }, { timeout: 4000 });
    fireEvent.change(box, { target: { value: "Hi {{first_name}}, it’s Boreal Financial." } });
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/marketing/sms/preview", expect.objectContaining({ body: "Hi {{first_name}}, it’s Boreal Financial." })), { timeout: 3000 });
    expect(await screen.findByTestId("sms-cost-preview")).toHaveTextContent(/2 segments/);
    expect(screen.getByTestId("sms-cost-preview")).toHaveTextContent(/\$5\.18/);
  });
});
