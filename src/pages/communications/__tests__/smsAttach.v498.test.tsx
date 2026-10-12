// BF_PORTAL_BLOCK_v498_SMS_ATTACH_PICTURE
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn(); apiFn.post = vi.fn(); apiFn.put = vi.fn(); apiFn.patch = vi.fn(); apiFn.delete = vi.fn();
  const toastError = vi.fn();
  return { apiFn, toastError };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/api/o365Interceptor", () => ({
  withO365Scopes: (_scopes: unknown, call: () => Promise<unknown>) => call(),
  withO365Refresh: (call: () => Promise<unknown>) => call(),
}));
vi.mock("@/lib/urlTicket", () => ({ teamSocketUrl: vi.fn(async () => null), getUrlTicket: vi.fn(async () => null) }));
vi.mock("react-hot-toast", () => {
  const toast = Object.assign(vi.fn(), { error: h.toastError, success: vi.fn() });
  return { default: toast, toast };
});

import CommunicationsPage from "../CommunicationsPage";

const SEND = "\u2191";

beforeEach(() => {
  h.apiFn.mockReset();
  h.apiFn.post.mockReset();
  h.toastError.mockReset();
  h.apiFn.post.mockResolvedValue({});
  Element.prototype.scrollIntoView = vi.fn();
  window.history.replaceState(null, "", "/communications");
  h.apiFn.mockImplementation((url: string) => {
    const u = String(url);
    if (u === "/api/communications/sms") {
      return Promise.resolve({ conversations: [{ contact_id: "c-1", display_name: "Jordan Lee", phone: "+15551234567", last_at: new Date().toISOString(), last_body: "hi" }] });
    }
    if (u === "/api/communications/sms/thread") return Promise.resolve({ messages: [] });
    if (u.startsWith("/api/templates")) return Promise.resolve({ items: [] });
    if (u === "/api/communications/messages-list") return Promise.resolve({ conversations: [] });
    if (u === "/api/team/channels") return Promise.resolve({ channels: [] });
    if (u === "/api/portal/issues") return Promise.resolve({ issues: [] });
    if (u.startsWith("/api/crm/inbox")) return Promise.resolve([]);
    return Promise.resolve({});
  });
});

async function openThread() {
  render(<CommunicationsPage initialTab="sms" />);
  // The first conversation is selected automatically and its composer appears.
  return (await screen.findByPlaceholderText("Text message")) as HTMLTextAreaElement;
}

function fileOfSize(name: string, type: string, size: number): File {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

describe("v498 SMS attach", () => {
  it("has an attach button limited to picture and PDF types", async () => {
    await openThread();
    const button = screen.getByTestId("sms-attach-button");
    expect(button).toHaveAttribute("title", "Attach a picture or PDF");
    const input = screen.getByTestId("sms-attach-input") as HTMLInputElement;
    expect(input.type).toBe("file");
    expect(input.accept).toBe("image/jpeg,image/png,image/gif,application/pdf");
    const click = vi.spyOn(input, "click");
    fireEvent.click(button);
    expect(click).toHaveBeenCalled();
  });

  it("rejects files over 5 MB and types a text cannot carry", async () => {
    await openThread();
    const input = screen.getByTestId("sms-attach-input");
    fireEvent.change(input, { target: { files: [fileOfSize("big.png", "image/png", 5 * 1024 * 1024 + 1)] } });
    expect(h.toastError).toHaveBeenCalledWith("Files sent by text must be 5 MB or smaller.");
    fireEvent.change(input, { target: { files: [fileOfSize("notes.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 10)] } });
    expect(h.toastError).toHaveBeenCalledWith("Only JPG, PNG, GIF or PDF can be sent by text.");
    // Neither file was attached.
    expect(screen.getByPlaceholderText("Text message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: SEND })).toBeDisabled();
  });

  it("accepts a file of exactly 5 MB", async () => {
    await openThread();
    fireEvent.change(screen.getByTestId("sms-attach-input"), { target: { files: [fileOfSize("edge.pdf", "application/pdf", 5 * 1024 * 1024)] } });
    expect(await screen.findByPlaceholderText("Attached: edge.pdf - add a message (optional)")).toBeInTheDocument();
    expect(h.toastError).not.toHaveBeenCalled();
  });

  it("allows a picture with no words and sends the media with the text", async () => {
    await openThread();
    const send = screen.getByRole("button", { name: SEND });
    expect(send).toBeDisabled();

    fireEvent.change(screen.getByTestId("sms-attach-input"), { target: { files: [new File(["png-bytes"], "photo.png", { type: "image/png" })] } });
    await screen.findByPlaceholderText("Attached: photo.png - add a message (optional)");
    await waitFor(() => expect(screen.getByRole("button", { name: SEND })).not.toBeDisabled());

    fireEvent.click(screen.getByRole("button", { name: SEND }));
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledWith("/api/communications/sms", expect.objectContaining({
      to: "+15551234567",
      body: "",
      contactId: "c-1",
      media: { name: "photo.png", contentType: "image/png", dataUrl: expect.stringMatching(/^data:image\/png;base64,/) },
    })));
    // After sending, the attachment is cleared.
    expect(await screen.findByPlaceholderText("Text message")).toBeInTheDocument();
  });

  it("sends a text without a media field when nothing is attached", async () => {
    const box = await openThread();
    fireEvent.change(box, { target: { value: "Hello there" } });
    fireEvent.click(screen.getByRole("button", { name: SEND }));
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledWith("/api/communications/sms", expect.anything()));
    const call = h.apiFn.post.mock.calls.find((c: unknown[]) => c[0] === "/api/communications/sms");
    expect(call?.[1]).toEqual({ to: "+15551234567", body: "Hello there", contactId: "c-1" });
    expect(call?.[1]).not.toHaveProperty("media");
  });
});
