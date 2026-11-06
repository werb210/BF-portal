// BF_PORTAL_v909_SETTINGS - Meta ads setup panel, Website kit line, Google Play setup steps, My Profile sub-tabs and an
// Admin-only shared signature, the profile photo saved at once and shown as an avatar, lending stage display on the
// board, a direct number when adding a user, and the Deal tools explanations.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => {
  const fn: any = vi.fn(async () => ({}));
  fn.get = vi.fn(async () => ({})); fn.post = vi.fn(async () => ({})); fn.put = vi.fn(async () => ({})); fn.patch = vi.fn(async () => ({})); fn.delete = vi.fn(async () => ({}));
  return { api: fn };
});
vi.mock("@/api", () => ({ api: h.api, default: h.api }));

import MetaAdsPanel, { META_SETUP_STEPS } from "@/components/marketing/MetaAdsPanel";
import { PLAY_SETUP_STEPS } from "@/pages/marketing/MobileAppsPanel";
import { UserAvatar, initialsOf, publishMyAvatar, resetMyAvatarForTests, useMyAvatar } from "@/components/ui/UserAvatar";
import { orderedStages } from "@/pages/pipeline/PipelinePage";
import DealToolsSettings, { DEAL_TOOLS_HELP } from "@/brokerTools/DealToolsSettings";

vi.mock("@/brokerTools/ConditionTemplatesSettings", () => ({ default: () => null }));
vi.mock("@/brokerTools/SalesTaxSettings", () => ({ default: () => null }));
vi.mock("@/brokerTools/RateCardsSettings", () => ({ default: () => null }));
vi.mock("@/brokerTools/ScorecardSettings", () => ({ default: () => null }));
vi.mock("@/brokerTools/ContractTemplatesSettings", () => ({ default: () => null }));
vi.mock("@/brokerTools/VendorsSettings", () => ({ default: () => null }));
vi.mock("@/brokerTools/CreditLinesPanel", () => ({ CreditLinesReport: () => null, default: () => null }));

beforeEach(() => { h.api.get.mockReset(); h.api.patch.mockReset(); h.api.get.mockResolvedValue({}); resetMyAvatarForTests(); });

describe("marketing", () => {
  it("Meta tab says it is not connected and lists the steps", () => {
    render(<MetaAdsPanel />);
    expect(screen.getByTestId("meta-ads-setup")).toHaveTextContent("Not connected.");
    expect(screen.getAllByRole("listitem")).toHaveLength(META_SETUP_STEPS.length);
  });
  it("Google Play setup names the service account and the reporting access", () => {
    const all = PLAY_SETUP_STEPS.join(" ");
    expect(all).toContain("service account");
    expect(all).toContain("View app information and download bulk reports");
    expect(all).toContain("Users and permissions");
  });
});

describe("avatars", () => {
  it("shows the photo, or initials when there is none or it fails", () => {
    const { rerender } = render(<UserAvatar name="Jane Doe" url="data:image/jpeg;base64,AAA" testId="av" />);
    expect(screen.getByTestId("av").tagName).toBe("IMG");
    fireEvent.error(screen.getByTestId("av"));
    expect(screen.getByTestId("av")).toHaveTextContent("JD");
    rerender(<UserAvatar name="Sam" url={null} testId="av" />);
    expect(screen.getByTestId("av")).toHaveTextContent("S");
    expect(initialsOf("  ")).toBe("?");
  });
  it("the signed-in photo loads once and updates everywhere when My Profile saves a new one", async () => {
    h.api.get.mockResolvedValue({ profile_image_url: "data:image/jpeg;base64,OLD" });
    function Me() { const url = useMyAvatar(); return <span data-testid="me">{url ?? "none"}</span>; }
    render(<><Me /><Me /></>);
    await waitFor(() => expect(screen.getAllByTestId("me")[0]).toHaveTextContent("OLD"));
    expect(h.api.get).toHaveBeenCalledTimes(1);
    publishMyAvatar("data:image/jpeg;base64,NEW");
    await waitFor(() => expect(screen.getAllByTestId("me").every((e) => e.textContent?.includes("NEW"))).toBe(true));
  });
});

describe("lending stage display", () => {
  it("orders the board by the positions set in Settings, keeping the built-in keys", () => {
    const order = orderedStages({ "Off to Lender": { position: 0 }, Received: { position: 1 } });
    expect(order[0]).toBe("Off to Lender");
    expect(order[1]).toBe("Received");
    expect(order).toHaveLength(11);
  });
});

describe("deal tools settings", () => {
  it("explains every section in one line", () => {
    render(<DealToolsSettings isAdmin />);
    for (const help of Object.values(DEAL_TOOLS_HELP)) expect(screen.getByText(help.text)).toBeInTheDocument();
  });
});
