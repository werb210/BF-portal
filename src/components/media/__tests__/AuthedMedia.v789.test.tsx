// BF_PORTAL_v789_AUTHED_MEDIA - recordings and MMS images load through the api client (Authorization
// header) into blob: URLs; no token ever appears in a media URL.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn();
  apiFn.post = vi.fn();
  return { apiFn, rawApiFetch: vi.fn() };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, rawApiFetch: h.rawApiFetch }));
vi.mock("@/api/crm", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/api/crm")>();
  return { ...real, crmApi: { ...real.crmApi, timeline: vi.fn(async () => []) } };
});

import { AuthedAudio } from "@/components/media/AuthedMedia";
import { UnifiedTimeline } from "@/components/crm/UnifiedTimeline";
import CommunicationsThread from "@/pages/communications/components/CommunicationsThread";

const createObjectURL = vi.fn(() => "blob:media-1");
const revokeObjectURL = vi.fn();

beforeEach(() => {
  h.rawApiFetch.mockReset();
  h.rawApiFetch.mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(["x"], { type: "audio/mpeg" }) });
  h.apiFn.get.mockReset();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  Object.assign(URL, { createObjectURL, revokeObjectURL });
  // jsdom has no media playback.
  Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: vi.fn(async () => undefined) });
});

describe("AuthedAudio", () => {
  it("fetches only when played, through the api client, and plays a blob: URL", async () => {
    const { unmount } = render(<AuthedAudio path="/api/communications/recordings/by-conference/c1/media" />);
    expect(h.rawApiFetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Play recording" }));
    const audio = await screen.findByTestId("authed-audio");
    expect(h.rawApiFetch).toHaveBeenCalledWith("/api/communications/recordings/by-conference/c1/media", expect.objectContaining({ method: "GET" }));
    expect(audio.getAttribute("src")).toBe("blob:media-1");
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:media-1");
  });

  it("shows the error when the file cannot be fetched", async () => {
    h.rawApiFetch.mockResolvedValue({ ok: false, status: 403, blob: async () => new Blob() });
    render(<AuthedAudio path="/api/x" />);
    fireEvent.click(screen.getByRole("button", { name: "Play recording" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("403");
  });
});

describe("no token in media URLs", () => {
  it("UnifiedTimeline call recordings carry no token", async () => {
    h.apiFn.get.mockImplementation(async (path: string) => path.endsWith("/calls")
      ? { items: [{ conference_id: "conf1", direction: "outbound", recording_url: "https://api.twilio.com/rec", created_at: "2026-05-01T10:00:00Z" }] }
      : { items: [] });
    const { container } = render(<UnifiedTimeline contactId="c1" scope={{ kind: "contact", id: "c1" }} />);
    const play = await screen.findByRole("button", { name: "Play recording" });
    expect(container.innerHTML).not.toMatch(/token=/);
    fireEvent.click(play);
    await waitFor(() => expect(h.rawApiFetch).toHaveBeenCalledWith("/api/communications/recordings/by-conference/conf1/media", expect.anything()));
  });

  it("an MMS image in a thread loads on demand from its API path", async () => {
    h.rawApiFetch.mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(["x"], { type: "image/png" }) });
    const { container } = render(
      <CommunicationsThread messages={[{ id: "m1", body: "photo", direction: "inbound", created_at: "2026-05-01T10:00:00Z", mediaPath: "/api/communications/messages/m1/media" }]} />,
    );
    expect(container.innerHTML).not.toMatch(/token=/);
    fireEvent.click(screen.getByRole("button", { name: "Show image" }));
    const img = await screen.findByTestId("authed-image");
    expect(img.getAttribute("src")).toBe("blob:media-1");
    expect(h.rawApiFetch).toHaveBeenCalledWith("/api/communications/messages/m1/media", expect.anything());
  });
});
