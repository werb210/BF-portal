// BF_PORTAL_REPLY_QUOTE_HTML_v1
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn(); apiFn.post = vi.fn(); apiFn.put = vi.fn(); apiFn.patch = vi.fn(); apiFn.delete = vi.fn();
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/api/o365Interceptor", () => ({
  withO365Scopes: (_scopes: unknown, call: () => Promise<unknown>) => call(),
  withO365Refresh: (call: () => Promise<unknown>) => call(),
}));
vi.mock("@/lib/urlTicket", () => ({ teamSocketUrl: vi.fn(async () => null), getUrlTicket: vi.fn(async () => null) }));

import CommunicationsPage from "../CommunicationsPage";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

const RECEIVED = "2026-06-09T14:05:00Z";
let openedBody: { content: string; contentType: "html" | "text" } = { content: "", contentType: "html" };

beforeEach(() => {
  h.apiFn.mockReset();
  h.apiFn.post.mockReset();
  h.apiFn.post.mockResolvedValue({});
  Element.prototype.scrollIntoView = vi.fn();
  window.history.replaceState(null, "", "/communications");
  h.apiFn.mockImplementation((url: string) => {
    const u = String(url);
    if (u === "/api/crm/shared-mailboxes") return Promise.resolve({ mine: null, shared: [] });
    if (u === "/api/crm/inbox") {
      return Promise.resolve([{ id: "m1", subject: "Hello", bodyPreview: "Hi there", from: { emailAddress: { address: "info@boreal.financial", name: "Boreal Info" } }, receivedDateTime: RECEIVED, isRead: true }]);
    }
    if (u === "/api/crm/inbox/m1") {
      return Promise.resolve({ subject: "Hello", from: { emailAddress: { address: "info@boreal.financial", name: "Boreal Info" } }, toRecipients: [], ccRecipients: [], body: openedBody, receivedDateTime: RECEIVED });
    }
    if (u.startsWith("/api/crm/inbox")) return Promise.resolve([]);
    if (u.startsWith("/api/templates")) return Promise.resolve({ items: [] });
    if (u === "/api/collateral") return Promise.resolve([]);
    if (u === "/api/communications/sms" || u === "/api/communications/messages-list") return Promise.resolve({ conversations: [] });
    if (u === "/api/team/channels") return Promise.resolve({ channels: [] });
    if (u === "/api/portal/issues") return Promise.resolve({ issues: [] });
    return Promise.resolve({});
  });
});

// The inbox reloads (and clears the selection) once the mailbox list arrives, so wait for
// that before opening an email; a click that lands earlier is undone by the reload.
async function mailboxesLoaded() {
  await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/crm/shared-mailboxes"));
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}

async function replyTo(body: { content: string; contentType: "html" | "text" }): Promise<HTMLElement> {
  openedBody = body;
  render(<CommunicationsPage initialTab="inbox" />);
  await mailboxesLoaded();
  fireEvent.click(await screen.findByText("Hello"));
  fireEvent.click(await screen.findByRole("button", { name: "Reply" }));
  await waitFor(() => expect(screen.getByDisplayValue("Re: Hello")).toBeInTheDocument());
  const editor = document.querySelector("[contenteditable]") as HTMLElement | null;
  expect(editor).toBeTruthy();
  await waitFor(() => expect(editor?.querySelector("blockquote")).toBeTruthy());
  return editor as HTMLElement;
}

describe("reply quotes preserve the original as HTML", () => {
  it("quotes an html body verbatim, keeping its structure and decoding entities", async () => {
    const editor = await replyTo({
      contentType: "html",
      content: "<p>Hi&nbsp;there,</p><p>Reach us at &lt;info@boreal.financial&gt; - &quot;good luck&quot;</p>",
    });
    const quote = editor.querySelector("blockquote") as HTMLElement;
    // Not flattened into one wall of text: both paragraphs survive as paragraphs.
    const paras = quote.querySelectorAll("p");
    expect(paras).toHaveLength(2);
    expect(paras[0]?.textContent).toBe("Hi\u00A0there,");
    expect(paras[1]?.textContent).toBe("Reach us at <info@boreal.financial> - \"good luck\"");
    // Entities are rendered, not shown literally.
    expect(editor.textContent).not.toContain("&nbsp;");
    expect(editor.textContent).not.toContain("&quot;");
    expect(editor.textContent).not.toContain("&lt;");
    // The quote keeps its styling.
    expect(quote.getAttribute("style")).toContain("border-left");
  });

  it("escapes a plaintext body and keeps its line breaks", async () => {
    const editor = await replyTo({ contentType: "text", content: "Line one\nLine <two> & more" });
    const quote = editor.querySelector("blockquote") as HTMLElement;
    expect(quote.querySelector("br")).toBeTruthy();
    // "<two>" is text, not an element.
    expect(quote.querySelector("two")).toBeNull();
    expect(quote.textContent).toBe("Line oneLine <two> & more");
  });

  it("keeps a real attribution line instead of a bare separator", async () => {
    const editor = await replyTo({ contentType: "html", content: "<p>Original</p>" });
    const when = new Date(RECEIVED).toLocaleString();
    expect(editor.textContent).toContain(`On ${when} Boreal Info <info@boreal.financial> wrote:`);
    expect(editor.textContent).not.toContain("----- Original message -----");
    // The attribution sits above the quote.
    const quote = editor.querySelector("blockquote") as HTMLElement;
    const attribution = Array.from(editor.querySelectorAll("div")).find((d) => /wrote:$/.test(d.textContent ?? ""));
    expect(attribution).toBeTruthy();
    expect(attribution!.compareDocumentPosition(quote) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("the sanitiser lets the quote survive", () => {
  it("permits blockquote and its style attribute", () => {
    const out = sanitizeHtml('<blockquote style="border-left:2px solid #ccc;">quoted</blockquote>');
    const host = document.createElement("div");
    host.innerHTML = out;
    const quote = host.querySelector("blockquote");
    expect(quote?.textContent).toBe("quoted");
    expect(quote?.getAttribute("style")).toContain("border-left");
  });

  it("still forbids dangerous tags", () => {
    const out = sanitizeHtml('<blockquote>ok<script>alert(1)</script><style>p{}</style><iframe src="https://x"></iframe><img src="x" onerror="alert(1)"></blockquote>');
    expect(out).toContain("<blockquote>ok");
    expect(out).not.toMatch(/<script|<style|<iframe|onerror/i);
  });
});
