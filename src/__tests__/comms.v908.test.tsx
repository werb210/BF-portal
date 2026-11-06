// BF_PORTAL_v908_COMMS - the email composer: selecting text no longer asks "Discard this message?", the list buttons
// make visible bullets and numbers; the inbox Select mode ends with Done, Escape or a click elsewhere.
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn(async () => ({})); apiFn.post = vi.fn(async () => ({})); apiFn.put = vi.fn(); apiFn.patch = vi.fn(); apiFn.delete = vi.fn();
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/api/o365Interceptor", () => ({
  withO365Scopes: (_scopes: unknown, call: () => Promise<unknown>) => call(),
  withO365Refresh: (call: () => Promise<unknown>) => call(),
}));
vi.mock("@/lib/urlTicket", () => ({ teamSocketUrl: vi.fn(async () => null), getUrlTicket: vi.fn(async () => null) }));

import O365ComposeModal, { styleLists } from "@/components/communications/O365ComposeModal";

beforeEach(() => {
  h.apiFn.mockReset();
  h.apiFn.mockImplementation(async (url: string) => (String(url).startsWith("/api/templates") ? { items: [] } : {}));
});

describe("composer", () => {
  it("selecting text and releasing the mouse outside the card does not ask to discard", () => {
    const onClose = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { container } = render(<O365ComposeModal open onClose={onClose} />);
    const body = screen.getByTestId("compose-body");
    body.innerHTML = "Hello world";
    fireEvent.input(body);
    const backdrop = container.firstElementChild as HTMLElement;
    // press inside the editor, release over the backdrop: the browser fires the click on the backdrop
    fireEvent.mouseDown(body);
    fireEvent.click(backdrop);
    expect(confirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
  it("a real click on the backdrop still asks before discarding a typed message", () => {
    const onClose = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container } = render(<O365ComposeModal open onClose={onClose} />);
    const body = screen.getByTestId("compose-body");
    body.innerHTML = "Hello";
    fireEvent.input(body);
    const backdrop = container.firstElementChild as HTMLElement;
    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    expect(confirm).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
  it("lists get visible bullets and numbers (also in the sent email)", () => {
    const root = document.createElement("div");
    root.innerHTML = "<ul><li>a</li></ul><ol><li>b</li></ol>";
    styleLists(root);
    expect((root.querySelector("ul") as HTMLElement).style.listStyleType).toBe("disc");
    expect((root.querySelector("ol") as HTMLElement).style.listStyleType).toBe("decimal");
    expect((root.querySelector("ul") as HTMLElement).style.paddingLeft).toBe("1.5em");
  });
  it("the list buttons run the list command with the caret in the editor", () => {
    const exec = vi.fn(() => true);
    (document as any).execCommand = exec;
    render(<O365ComposeModal open onClose={() => undefined} />);
    fireEvent.mouseDown(screen.getByTitle("Bulleted list"));
    expect(exec).toHaveBeenCalledWith("insertUnorderedList", false, undefined);
    expect(screen.getByTestId("compose-body").innerHTML).toContain("<div><br></div>");
    fireEvent.mouseDown(screen.getByTitle("Numbered list"));
    expect(exec).toHaveBeenCalledWith("insertOrderedList", false, undefined);
  });
});

import CommunicationsPage from "@/pages/communications/CommunicationsPage";
import { waitFor } from "@testing-library/react";

describe("inbox Select mode", () => {
  it("ends with Done, with Escape, and with a click outside the toolbar and list", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    h.apiFn.mockImplementation(async (url: string) => {
      const u = String(url);
      if (u === "/api/crm/inbox") return [{ id: "m1", subject: "Hello", from: { emailAddress: { name: "Jo", address: "jo@example.com" } }, receivedDateTime: "2026-11-01T10:00:00Z", isRead: false }];
      if (u.startsWith("/api/templates")) return { items: [] };
      return {};
    });
    render(<CommunicationsPage initialTab="inbox" />);
    const select = await screen.findByRole("button", { name: "Select" });
    fireEvent.click(select);
    expect(await screen.findByTestId("inbox-bulk-actions")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("inbox-select-done"));
    await waitFor(() => expect(screen.queryByTestId("inbox-bulk-actions")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("inbox-bulk-actions")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByTestId("inbox-bulk-actions")).toBeNull());
  });
});
