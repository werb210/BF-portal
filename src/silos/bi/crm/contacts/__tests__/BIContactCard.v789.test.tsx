// BF_PORTAL_v789_BI_CONTACT_CARD - the BI contact card reads its feeds from BI-Server, logs ActionBar
// activity there once, and offers duplicates with a confirmed merge.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn().mockResolvedValue({});
  apiFn.post = vi.fn().mockResolvedValue({});
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/dialer/actions", () => ({ startOutboundPstn: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import BIContactDetailPage from "@/silos/bi/crm/contacts/BIContactDetailPage";

const contact = {
  id: "c1", full_name: "Jane Doe", email: "jane@example.com", phone_e164: "+14165551234", title: "CFO", tags: [],
  notes: null, outreach_status: "engaged", outreach_owner_id: null, outreach_updated_at: null, company_id: null,
  company_name: null, company_operating_name: null, created_at: "2026-05-01T12:00:00Z", updated_at: "2026-05-01T12:00:00Z", activity_count: 0,
};

let duplicates: unknown[] = [];

function routes(path: string, init?: { method?: string }) {
  const method = init?.method ?? "GET";
  if (method === "POST") return { ok: true };
  if (path === "/api/v1/bi/crm/contacts/c1/activity") {
    return {
      events: [
        { id: "e1", event_type: "email", body: "Quote attached", meta: { subject: "Your quote", direction: "outbound" }, created_at: "2026-05-02T10:00:00Z" },
        { id: "e2", event_type: "call", body: "Talked about limits", outcome: "connected", meta: { duration_sec: 125 }, created_at: "2026-05-03T10:00:00Z" },
        { id: "e3", event_type: "note", body: "should not be in the comms feed", created_at: "2026-05-04T10:00:00Z" },
      ],
    };
  }
  if (path === "/api/v1/bi/crm/contacts/c1/timeline") {
    return { items: [{ id: "t1", kind: "stage_change", title: "Moved to quoted", created_at: "2026-05-05T10:00:00Z" }] };
  }
  if (path === "/api/v1/bi/crm/contacts/c1/documents") {
    return { documents: [{ id: "d1", filename: "policy.pdf", size_bytes: 20480, created_at: "2026-05-06T10:00:00Z" }] };
  }
  if (path === "/api/v1/bi/crm/contacts/c1/duplicates") return { duplicates };
  if (path.endsWith("/activity")) return { events: [] };
  if (path === "/api/v1/bi/crm/contacts/c1") return contact;
  return {};
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/silo/bi/crm/contacts/c1"]}>
      <Routes>
        <Route path="/silo/bi/crm/contacts/:id" element={<BIContactDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const calledPaths = () => [
  ...h.apiFn.mock.calls.map((c: unknown[]) => String(c[0])),
  ...h.apiFn.get.mock.calls.map((c: unknown[]) => String(c[0])),
  ...h.apiFn.post.mock.calls.map((c: unknown[]) => String(c[0])),
];

beforeEach(() => {
  h.apiFn.mockReset();
  h.apiFn.get.mockClear();
  h.apiFn.post.mockClear();
  h.apiFn.mockImplementation(async (path: string, init?: { method?: string }) => routes(path, init));
  duplicates = [];
  try { sessionStorage.clear(); } catch { /* ignore */ }
});

describe("BI contact card feeds (items 79, 90)", () => {
  it("shows email and call items from BI-Server's activity feed, not BF-Server's CRM", async () => {
    renderPage();
    const feed = await screen.findByTestId("bi-contact-comms-feed");
    await waitFor(() => expect(within(feed).getByText("Your quote")).toBeInTheDocument());
    expect(within(feed).getByText(/connected - 2:05/)).toBeInTheDocument();
    expect(within(feed).queryByText(/should not be in the comms feed/)).toBeNull();
    // The BF feeds this replaces read BF-Server's CRM by a BI id.
    expect(calledPaths().filter((p) => /^\/api\/crm\/contacts\/c1\/(emails|calls)/.test(p))).toEqual([]);
  });

  it("renders the timeline and documents from BI-Server", async () => {
    renderPage();
    const timeline = await screen.findByTestId("bi-contact-timeline");
    await waitFor(() => expect(within(timeline).getByText("Moved to quoted")).toBeInTheDocument());
    const docs = screen.getByTestId("bi-contact-documents");
    await waitFor(() => expect(within(docs).getByText("policy.pdf")).toBeInTheDocument());
    expect(within(docs).getByText(/20 KB/)).toBeInTheDocument();
  });

  it("merges a duplicate only after the user confirms", async () => {
    // BF_PORTAL_v856_CRM_UNIFY - the shared duplicates banner and side-by-side merge.
    h.apiFn.get.mockImplementation(async (path: string) => {
      if (path === "/api/v1/bi/crm/unified/duplicates/contact/c1") {
        return { count: 1, candidates: [{ id: "c9", name: "Jane D.", email: "jane@example.com", phone: null, company_name: null, created_at: null, reasons: ["Same email"] }] };
      }
      if (path.startsWith("/api/v1/bi/crm/unified/merge/contact/preview")) {
        return {
          records: [{ id: "c1", title: "Jane Doe", tags: [], created_at: null, application_count: 0 }, { id: "c9", title: "Jane D.", tags: [], created_at: null, application_count: 0 }],
          fields: [{ key: "full_name", label: "Name", values: [{ id: "c1", value: "Jane Doe", display: "Jane Doe" }, { id: "c9", value: "Jane D.", display: "Jane D." }] }],
        };
      }
      return {};
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderPage();
    const banner = await screen.findByTestId("crm-duplicates-banner");
    expect(banner).toHaveTextContent("There is 1 possible duplicate. Would you like to merge them?");
    fireEvent.click(within(banner).getByRole("button", { name: "Review and merge" }));
    const dialog = await screen.findByRole("dialog", { name: "Merge duplicates" });
    const merge = within(dialog).getByRole("button", { name: "Merge" });
    await waitFor(() => expect(merge).not.toBeDisabled());

    fireEvent.click(merge);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(h.apiFn.post.mock.calls.some((c: any[]) => String(c[0]).includes("/merge/"))).toBe(false);

    fireEvent.click(merge);
    await waitFor(() => {
      const call = h.apiFn.post.mock.calls.find((c: any[]) => c[0] === "/api/v1/bi/crm/unified/merge/contact");
      expect(call?.[1]).toEqual({ survivorId: "c1", loserIds: ["c9"], fields: { full_name: "Jane Doe" } });
    });
    confirm.mockRestore();
  });
});

describe("BI contact card ActionBar (item 78)", () => {
  it("a note is written once, to BI-Server, with the typed text", async () => {
    renderPage();
    await screen.findByText("Jane Doe");
    fireEvent.click(screen.getByRole("button", { name: "Note" }));
    fireEvent.change(screen.getByPlaceholderText(/leave a note/i), { target: { value: "Prefers email" } });
    fireEvent.click(screen.getByRole("button", { name: "Create note" }));
    await waitFor(() => {
      const posts = h.apiFn.mock.calls.filter((c: any[]) => c[1]?.method === "POST");
      expect(posts).toHaveLength(1);
      expect(posts[0][0]).toBe("/api/v1/bi/crm/outreach/contacts/c1/activity");
      expect(posts[0][1].body).toMatchObject({ event_type: "note", body: "Prefers email" });
    });
    expect(calledPaths().filter((p) => /^\/api\/crm\/contacts\/c1\/notes/.test(p))).toEqual([]);
  });
});
