// BF_PORTAL_v937_SOCIAL_POSTING
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), del: vi.fn(), raw: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: (...a: unknown[]) => h.get(...a), post: (...a: unknown[]) => h.post(...a), delete: (...a: unknown[]) => h.del(...a) }, rawApiFetch: (...a: unknown[]) => h.raw(...a) }));
import SocialPanel from "../SocialPanel";

const NETWORKS = [
  { key: "facebook", label: "Facebook", provider: "meta", configured: true, settings: [] },
  { key: "instagram", label: "Instagram", provider: "meta", configured: true, settings: [] },
  { key: "x", label: "X", provider: "x", configured: false, settings: ["X_CLIENT_ID", "X_CLIENT_SECRET"] },
  { key: "bluesky", label: "Bluesky", provider: "bluesky", configured: true, settings: [] },
];
const ACCOUNTS = [{ id: "a1", network: "facebook", name: "Boreal Financial", status: "connected", last_error: null }, { id: "a2", network: "instagram", name: "@boreal", status: "connected", last_error: null }];

beforeEach(() => {
  h.get.mockReset(); h.post.mockReset();
  h.get.mockImplementation(async (url: string) => (url.includes("/accounts") ? { networks: NETWORKS, accounts: ACCOUNTS, ready: true } : { posts: [] }));
});

describe("Marketing > Social", () => {
  it("offers to connect each network and says which are not set up yet", async () => {
    render(<SocialPanel />);
    expect(await screen.findByText("Connect Facebook and Instagram")).toBeTruthy();
    expect((screen.getByTestId("connect-x") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("connect-x").textContent).toContain("not set up yet");
  });

  it("posts one message to the ticked accounts", async () => {
    h.post.mockResolvedValue({ post: { id: "p1", status: "published", account_ids: ["a1"], results: {} } });
    render(<SocialPanel />);
    await screen.findByText("Boreal Financial");
    fireEvent.change(screen.getByTestId("social-body"), { target: { value: "New equipment rates" } });
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByTestId("social-send").textContent).toBe("Post to 1 account");
    fireEvent.click(screen.getByTestId("social-send"));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/social/posts", { body: "New equipment rates", link_url: null, image_url: null, account_ids: ["a1"], scheduled_at: null }));
    expect(await screen.findByText("Posted to every account.")).toBeTruthy();
  });

  it("won't send to Instagram without a picture", async () => {
    render(<SocialPanel />);
    await screen.findByText("@boreal");
    fireEvent.change(screen.getByTestId("social-body"), { target: { value: "Hi" } });
    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    expect(screen.getByText("Instagram needs a picture.")).toBeTruthy();
    expect((screen.getByTestId("social-send") as HTMLButtonElement).disabled).toBe(true);
  });
});
