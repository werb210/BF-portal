// BF_PORTAL_v853_KS_PHONE_SUPPORT - the Keystone support queue (filters, SLA badges, new ticket), a ticket (thread
// with call summary, CRM links, status / assignee, reply by SMS / email, internal note), the Admin phone line settings,
// the sidebar entry and the "Start sales demo" button. BF-Server is faked at fetch(); every call carries X-Silo: KS.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/lib/authToken", () => ({ getAuthToken: () => "bf-portal-token-123" }));
const authUser = vi.fn();
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: authUser(), authStatus: "authenticated" }) }));
vi.mock("@/auth/AuthContext", () => ({ useAuth: () => ({ user: authUser(), authStatus: "authenticated" }) }));
vi.mock("@/hooks/useSilo", () => ({ useSilo: () => ({ silo: "bf", setSilo: vi.fn() }) }));

import KsSupport from "../support/KsSupport";
import StartDemoButton from "../StartDemoButton";
import { apiErrorText } from "../support/ksSupportApi";
import { clearKsToken } from "../ksApi";
import { ksNavFor } from "../ksAccess";

const fetchMock = vi.fn();
const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, url: "", headers: new Headers(), json: async () => body, clone() { return this; }, text: async () => JSON.stringify(body) }) as unknown as Response;
const siloOf = (call: unknown[]) => ((call[1] as RequestInit).headers as Record<string, string>)["X-Silo"];
const bodyOf = (call: unknown[]) => JSON.parse(String((call[1] as RequestInit).body));
const methodOf = (call: unknown[]) => String((call[1] as RequestInit).method ?? "GET");
const goTo = (path: string) => window.history.pushState({}, "", path);

const TICKET = {
  id: "t-1", number: 1001, subject: "Cannot upload statements", channel: "phone", priority: "high", status: "open", status_label: "Open",
  company_id: "co-1", company_name: "Acme Lending", company_plan: "pro", contact_id: "ct-1", contact_name: "Ada Lovelace",
  contact_email: "ada@acme.example", contact_phone: "+14035550123", from_phone: "+14035550123", from_email: null, from_name: "Ada Lovelace",
  assignee_user_id: null, assignee_name: null, support_level: "premium", support_level_label: "Premium", sla_target: "1 business hour",
  sla_due_at: "2026-10-21T17:00:00Z", responded_at: null, sla_state: "overdue", message_count: 2, last_message_at: "2026-10-21T16:00:00Z",
  created_at: "2026-10-21T16:00:00Z", silo: "KS",
};
const STAFF = [{ id: "u-1", name: "Kim Keystone", email: "kim@example.com", role: "Staff" }];
const MESSAGES = [
  {
    id: "m-1", kind: "call", channel: "phone", body: "Support line call from Ada Lovelace (+14035550123).", author_name: null, call_sid: "CA1",
    recording_url: null, created_at: "2026-10-21T16:00:00Z",
    call: { status: "completed", duration_seconds: 125, answered: true, answered_by: "Kim Keystone", summary: "- Upload button broken\nFollow-ups: send fix", transcript: "Hi, my upload is broken" },
  },
  { id: "m-2", kind: "voicemail", channel: "phone", body: "Voicemail: still broken", author_name: null, call_sid: "CA2", recording_url: "https://blob.example/vm.mp3", created_at: "2026-10-21T16:10:00Z" },
];

function server(over: (url: string, init: RequestInit) => Response | undefined = () => undefined) {
  fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
    const hit = over(String(url), init);
    if (hit) return hit;
    const u = String(url);
    const method = String(init.method ?? "GET");
    if (u.includes("/api/ks/support/staff")) return json(200, { ok: true, staff: STAFF });
    if (u.includes("/api/ks/support/tickets/t-1/reply")) return json(201, { ok: true, to: "+14035550123" });
    if (u.includes("/api/ks/support/tickets/t-1/notes")) return json(201, { ok: true, id: "n-1" });
    if (u.includes("/api/ks/support/tickets/t-1") && method === "PATCH") {
      return json(200, { ok: true, silo: "KS", ticket: { ...TICKET, ...bodyOf([u, init]), status_label: "Waiting on customer" }, messages: MESSAGES });
    }
    if (u.includes("/api/ks/support/tickets/t-1")) return json(200, { ok: true, silo: "KS", ticket: TICKET, messages: MESSAGES });
    if (u.includes("/api/ks/support/tickets") && method === "POST") return json(201, { ok: true, id: "t-2", number: 1002, silo: "KS" });
    if (u.includes("/api/ks/support/tickets")) return json(200, { ok: true, silo: "KS", tickets: [TICKET] });
    if (u.includes("/api/crm/contacts")) return json(200, { data: [{ id: "ct-1", name: "Ada Lovelace", company_id: "co-1", company_name: "Acme Lending", email: "ada@acme.example", silo: "KS" }] });
    return json(200, { ok: true });
  });
}

function renderAt(path: string) {
  goTo(path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/silo/ks/crm/support/*" element={<KsSupport />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  authUser.mockReturnValue({ role: "Admin" });
  server();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  goTo("/");
});

describe("Start sales demo", () => {
  const OPS = "https://ks-ops-dev.azurewebsites.net";
  const LINK = "https://thankful-wave-04964490f.2.azurestaticapps.net/demo/present#p=presenter-token";
  beforeEach(() => clearKsToken());

  it("exchanges the BF token, asks KS-Ops for a presenter link and opens it in a new tab", async () => {
    server((url) => {
      if (url === `${OPS}/api/ops/auth/exchange`) return json(200, { token: "ops-staff-token", expires_in: 3600, user: { id: "u", email: "todd@example.com", name: "Todd", role: "Admin" } });
      if (url === `${OPS}/api/ops/demo/presenter-link`) return json(200, { url: LINK, token: "presenter-token", expires_at: "2026-10-25T06:00:00Z" });
      return undefined;
    });
    const tab = { closed: false, opener: {}, location: { href: "" }, close: vi.fn() };
    const open = vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    render(<StartDemoButton />);
    fireEvent.click(screen.getByRole("button", { name: "Start sales demo" }));
    await waitFor(() => expect(tab.location.href).toBe(LINK));
    expect(open).toHaveBeenCalledWith("", "_blank");
    expect(tab.opener).toBeNull();
    const exchange = fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/api/ops/auth/exchange"))!;
    expect(bodyOf(exchange)).toEqual({ bfToken: "bf-portal-token-123" });
    const link = fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/api/ops/demo/presenter-link"))!;
    expect(methodOf(link)).toBe("POST");
    expect(((link[1] as RequestInit).headers as Record<string, string>).Authorization).toBe("Bearer ops-staff-token");
    expect(((link[1] as RequestInit).headers as Record<string, string>)["X-Silo"]).toBeUndefined();
    open.mockRestore();
  });

  it("shows a clear error (and closes the empty tab) when KS-Ops refuses the exchange", async () => {
    server((url) => (url.endsWith("/api/ops/auth/exchange") ? json(403, { error: "not_allowed", message: "Not on the list" }) : undefined));
    const tab = { closed: false, opener: {}, location: { href: "" }, close: vi.fn() };
    const open = vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    render(<StartDemoButton />);
    fireEvent.click(screen.getByRole("button", { name: "Start sales demo" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("may not start the Keystone demo");
    expect(tab.close).toHaveBeenCalled();
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("presenter-link"))).toBe(false);
    open.mockRestore();
  });

  it("says when KS-Ops cannot be reached", async () => {
    fetchMock.mockImplementation(async () => { throw new TypeError("Failed to fetch"); });
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<StartDemoButton />);
    fireEvent.click(screen.getByRole("button", { name: "Start sales demo" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach Keystone operations (https://ks-ops-dev.azurewebsites.net)");
    open.mockRestore();
  });

  it("is only for Admins", () => {
    authUser.mockReturnValue({ role: "Staff", silos: ["KS"] });
    render(<StartDemoButton />);
    expect(screen.queryByTestId("ks-start-demo")).not.toBeInTheDocument();
  });
});

describe("Keystone support queue", () => {
  it("is in the Keystone sidebar for everyone who uses the Keystone CRM", () => {
    expect(ksNavFor({ role: "Staff", silos: ["KS"] }).map((n) => n.path)).toContain("/silo/ks/crm/support");
    expect(ksNavFor({ role: "Admin" }).map((n) => n.label)).toContain("Support queue");
    expect(ksNavFor({ role: "Staff", silos: ["BF"] })).toEqual([]);
  });

  it("lists the active tickets with an SLA badge, filters on the server, and every call is X-Silo KS", async () => {
    renderAt("/silo/ks/crm/support");
    const row = await screen.findByTestId("ks-ticket-row");
    expect(within(row).getByText("Cannot upload statements").closest("a")?.getAttribute("href")).toBe("/silo/ks/crm/support/t-1");
    expect(within(row).getByText("Acme Lending")).toBeInTheDocument();
    expect(within(row).getByText("Overdue")).toBeInTheDocument();
    expect(within(row).getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Queue - 1 overdue")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start sales demo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Phone line settings" }).getAttribute("href")).toBe("/silo/ks/crm/support/phone");
    const first = fetchMock.mock.calls.find((c) => String(c[0]).includes("/api/ks/support/tickets"))!;
    expect(String(first[0])).toContain("status=active");

    fireEvent.change(screen.getByLabelText("Assignee"), { target: { value: "unassigned" } });
    fireEvent.change(screen.getByLabelText("Priority filter"), { target: { value: "urgent" } });
    await waitFor(() => expect(fetchMock.mock.calls.some((c) => /assignee=unassigned/.test(String(c[0])) && /priority=urgent/.test(String(c[0])))).toBe(true));
    expect(fetchMock.mock.calls.every((c) => siloOf(c) === "KS")).toBe(true);
  });

  it("hides the phone settings link from non-Admins", async () => {
    authUser.mockReturnValue({ role: "Staff", silos: ["KS"] });
    renderAt("/silo/ks/crm/support");
    await screen.findByTestId("ks-ticket-row");
    expect(screen.queryByRole("link", { name: "Phone line settings" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("ks-start-demo")).not.toBeInTheDocument();
  });

  it("opens a ticket by hand for a Keystone contact", async () => {
    renderAt("/silo/ks/crm/support");
    await screen.findByTestId("ks-ticket-row");
    fireEvent.click(screen.getByTestId("ks-new-ticket-button"));
    const form = screen.getByTestId("ks-new-ticket");
    fireEvent.change(within(form).getByLabelText("Subject"), { target: { value: "Training request" } });
    fireEvent.change(within(form).getByLabelText("Priority"), { target: { value: "high" } });
    fireEvent.change(within(form).getByLabelText("Assign to"), { target: { value: "u-1" } });
    fireEvent.change(within(form).getByLabelText("Find contact"), { target: { value: "Ada" } });
    fireEvent.click(await within(form).findByText(/Ada Lovelace - Acme Lending/));
    fireEvent.change(within(form).getByLabelText("Details"), { target: { value: "Wants a call about new staff" } });
    fireEvent.click(within(form).getByRole("button", { name: "Open ticket" }));
    await waitFor(() => expect(fetchMock.mock.calls.some((c) => methodOf(c) === "POST" && String(c[0]).endsWith("/api/ks/support/tickets"))).toBe(true));
    const post = fetchMock.mock.calls.find((c) => methodOf(c) === "POST" && String(c[0]).endsWith("/api/ks/support/tickets"))!;
    expect(bodyOf(post)).toEqual({
      subject: "Training request", body: "Wants a call about new staff", priority: "high", channel: "manual",
      assignee_user_id: "u-1", contact_id: "ct-1", company_id: "co-1",
    });
  });
});

describe("a Keystone support ticket", () => {
  it("shows the thread with the call outcome and AI summary, the voicemail, and links to the CRM records", async () => {
    renderAt("/silo/ks/crm/support/t-1");
    expect(await screen.findByText("#1001 Cannot upload statements")).toBeInTheDocument();
    expect(screen.getByText(/Answered by Kim Keystone - 2 min 5 s/)).toBeInTheDocument();
    expect(screen.getByText(/Upload button broken/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show transcript" }));
    expect(screen.getByText("Hi, my upload is broken")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Play the voicemail" }).getAttribute("href")).toBe("https://blob.example/vm.mp3");
    expect(screen.getByRole("link", { name: "Acme Lending" }).getAttribute("href")).toBe("/silo/ks/crm/companies/co-1");
    expect(screen.getByRole("link", { name: "Ada Lovelace" }).getAttribute("href")).toBe("/silo/ks/crm/contacts/ct-1");
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getAllByText("Overdue").length).toBeGreaterThan(0);
  });

  it("assigns, changes status, replies by SMS and adds an internal note", async () => {
    renderAt("/silo/ks/crm/support/t-1");
    await screen.findByText("#1001 Cannot upload statements");
    await waitFor(() => expect(screen.getByLabelText("Ticket assignee")).toHaveTextContent("Kim Keystone"));
    fireEvent.change(screen.getByLabelText("Ticket assignee"), { target: { value: "u-1" } });
    await screen.findByText("Assignee saved.");
    const patch = fetchMock.mock.calls.find((c) => methodOf(c) === "PATCH")!;
    expect(bodyOf(patch)).toEqual({ assignee_user_id: "u-1" });

    fireEvent.change(screen.getByLabelText("Send by"), { target: { value: "sms" } });
    fireEvent.change(screen.getByLabelText("Reply"), { target: { value: "Fixed - please try again" } });
    fireEvent.click(screen.getByTestId("ks-send-reply"));
    expect(await screen.findByText("Sent to +14035550123.")).toBeInTheDocument();
    const reply = fetchMock.mock.calls.find((c) => String(c[0]).includes("/reply"))!;
    expect(bodyOf(reply)).toEqual({ channel: "sms", body: "Fixed - please try again", status: "waiting" });

    fireEvent.change(screen.getByLabelText("Internal note"), { target: { value: "Checked the logs" } });
    fireEvent.click(screen.getByTestId("ks-add-note"));
    expect(await screen.findByText("Note added.")).toBeInTheDocument();
    expect(bodyOf(fetchMock.mock.calls.find((c) => String(c[0]).includes("/notes"))!)).toEqual({ body: "Checked the logs" });
    expect(fetchMock.mock.calls.every((c) => siloOf(c) === "KS")).toBe(true);
  });

  it("shows why a reply could not be sent", async () => {
    server((url) => (url.includes("/reply") ? json(502, { error: "send_failed", message: "Set KS_SUPPORT_EMAIL (or MS_GRAPH_SEND_AS) on the server to send support email." }) : undefined));
    renderAt("/silo/ks/crm/support/t-1");
    await screen.findByText("#1001 Cannot upload statements");
    fireEvent.change(screen.getByLabelText("Reply"), { target: { value: "Hello" } });
    fireEvent.click(screen.getByTestId("ks-send-reply"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Set KS_SUPPORT_EMAIL");
  });
});

describe("Keystone phone line settings (Admin)", () => {
  const QUEUE = (queue: "sales" | "support") => ({
    queue, label: queue === "sales" ? "Sales" : "Support", ringUserIds: [], ringTimeoutSeconds: 25, hoursEnabled: true, timezone: "America/Regina",
    weekly: { sun: [], mon: [["08:00", "17:00"]], tue: [["08:00", "17:00"]], wed: [["08:00", "17:00"]], thu: [["08:00", "17:00"]], fri: [["08:00", "17:00"]], sat: [] },
    updatedAt: null,
  });

  it("shows the line and the Twilio URL, and saves a queue's ring group, ring time and hours", async () => {
    server((url, init) => {
      if (url.includes("/api/ks/support/phone/queues/support")) return json(200, { ok: true, queue: { ...QUEUE("support"), ...bodyOf([url, init]) } });
      if (url.includes("/api/ks/support/phone")) {
        return json(200, { ok: true, configured: true, number: "+15878750815", voice_url: "https://server.boreal.financial/api/webhooks/twilio/ks/voice", status_callback_url: "https://server.boreal.financial/api/webhooks/twilio/voice", support_email: null, queues: [QUEUE("sales"), QUEUE("support")] });
      }
      return undefined;
    });
    renderAt("/silo/ks/crm/support/phone");
    expect(await screen.findByText("https://server.boreal.financial/api/webhooks/twilio/ks/voice")).toBeInTheDocument();
    expect(screen.getByText("+15878750815")).toBeInTheDocument();
    const support = screen.getByTestId("ks-queue-support");
    fireEvent.click(await within(support).findByLabelText("Support: Kim Keystone"));
    fireEvent.change(within(support).getByLabelText("Support ring seconds"), { target: { value: "30" } });
    fireEvent.click(within(support).getByLabelText("Support open Saturday"));
    fireEvent.click(within(support).getByTestId("ks-save-support"));
    expect(await within(support).findByText("Support saved.")).toBeInTheDocument();
    const put = fetchMock.mock.calls.find((c) => methodOf(c) === "PUT")!;
    const body = bodyOf(put);
    expect(body).toMatchObject({ ringUserIds: ["u-1"], ringTimeoutSeconds: 30, hoursEnabled: true, timezone: "America/Regina" });
    expect(body.weekly.sat).toEqual([["08:00", "17:00"]]);
    expect(siloOf(put)).toBe("KS");
  });

  it("sends non-Admins back to the queue", async () => {
    authUser.mockReturnValue({ role: "Staff", silos: ["KS"] });
    renderAt("/silo/ks/crm/support/phone");
    expect(await screen.findByTestId("ks-support-queue")).toBeInTheDocument();
  });

  it("puts field errors in the message", () => {
    expect(apiErrorText({ message: "validation_error", details: { errors: { ringUserIds: "everyone in the ring group needs Keystone access" } } }))
      .toBe("validation_error: ringUserIds everyone in the ring group needs Keystone access");
  });
});
