// BF_PORTAL_v789_BI_ACTIVITY - with target="bi" the ActionBar's Note, Call, Meeting and Email popups
// write to BI-Server's activity endpoint and never to a BF-Server CRM endpoint.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn();
  apiFn.post = vi.fn();
  apiFn.patch = vi.fn();
  apiFn.delete = vi.fn();
  return { apiFn, postOrQueue: vi.fn() };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/offline/outbox", () => ({ postOrQueue: h.postOrQueue }));
vi.mock("@/dialer/actions", () => ({ startOutboundPstn: vi.fn() }));

import { ActionBar } from "@/components/crm/ActionBar";

const CONTACT_PATH = "/api/v1/bi/crm/outreach/contacts/c1/activity";
const COMPANY_PATH = "/api/v1/bi/crm/companies/co1/activity";

function everyCalledPath(): string[] {
  return [h.apiFn, h.apiFn.get, h.apiFn.post, h.apiFn.patch, h.apiFn.delete, h.postOrQueue]
    .flatMap((m: any) => m.mock.calls.map((c: unknown[]) => String(c[0])));
}

function expectNoBfCrmCall() {
  for (const p of everyCalledPath()) {
    expect(p.startsWith("/api/v1/bi/")).toBe(true);
  }
  expect(h.postOrQueue).not.toHaveBeenCalled();
}

function lastPost() {
  const calls = h.apiFn.mock.calls.filter((c: any[]) => c[1]?.method === "POST");
  return calls[calls.length - 1] as [string, { method: string; body: Record<string, unknown> }];
}

beforeEach(() => {
  for (const m of [h.apiFn, h.apiFn.get, h.apiFn.post, h.apiFn.patch, h.apiFn.delete, h.postOrQueue]) m.mockReset();
  h.apiFn.mockResolvedValue({ ok: true });
});

describe("ActionBar target=bi on a contact", () => {
  const renderBar = (onAction = vi.fn()) =>
    render(
      <ActionBar target="bi" scope={{ kind: "contact", id: "c1" }} contactEmail="jane@example.com" contactPhone="+14165551234" contactName="Jane" onChanged={vi.fn()} onAction={onAction} />,
    );

  it("Note posts event_type note with the typed text", async () => {
    const onAction = vi.fn();
    renderBar(onAction);
    fireEvent.click(screen.getByRole("button", { name: "Note" }));
    fireEvent.change(screen.getByPlaceholderText(/leave a note/i), { target: { value: "Called back about renewal" } });
    fireEvent.click(screen.getByRole("button", { name: "Create note" }));
    await waitFor(() => expect(lastPost()).toBeDefined());
    const [path, init] = lastPost();
    expect(path).toBe(CONTACT_PATH);
    expect(init.body).toEqual({ event_type: "note", body: "Called back about renewal", outcome: null, meta: {} });
    await waitFor(() => expect(onAction).toHaveBeenCalledWith("note"));
    expectNoBfCrmCall();
  });

  it("Log call posts event_type call with the outcome and the other fields in meta", async () => {
    renderBar();
    fireEvent.click(screen.getByTestId("crm-log-call"));
    fireEvent.change(screen.getByLabelText("Call outcome"), { target: { value: "left_voicemail" } });
    fireEvent.change(screen.getByLabelText("Call notes"), { target: { value: "No answer, left a message" } });
    fireEvent.change(screen.getByPlaceholderText(/duration/i), { target: { value: "45" } });
    const submit = screen.getAllByRole("button", { name: "Log call" }).find((b) => b.getAttribute("data-testid") !== "crm-log-call")!;
    fireEvent.click(submit);
    await waitFor(() => expect(lastPost()).toBeDefined());
    const [path, init] = lastPost();
    expect(path).toBe(CONTACT_PATH);
    expect(init.body).toMatchObject({
      event_type: "call",
      body: "No answer, left a message",
      outcome: "left_voicemail",
      meta: { direction: "outbound", phone: "+14165551234", duration_sec: 45 },
    });
    expectNoBfCrmCall();
  });

  it("Meeting posts event_type meeting and hides the BF-only conference option", async () => {
    renderBar();
    fireEvent.click(screen.getByRole("button", { name: "Meeting" }));
    expect(screen.queryByRole("option", { name: /conference call/i })).toBeNull();
    fireEvent.change(screen.getByLabelText("Meeting title"), { target: { value: "Renewal review" } });
    fireEvent.change(screen.getByLabelText("Meeting description"), { target: { value: "Walk through the quote" } });
    fireEvent.click(screen.getByRole("button", { name: /starts/i }));
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    fireEvent.click(screen.getByRole("button", { name: "Log meeting" }));
    await waitFor(() => expect(lastPost()).toBeDefined());
    const [path, init] = lastPost();
    expect(path).toBe(CONTACT_PATH);
    expect(init.body.event_type).toBe("meeting");
    expect(init.body.body).toBe("Walk through the quote");
    expect(init.body.meta).toMatchObject({ title: "Renewal review", meeting_type: "teams", attendees: ["jane@example.com"] });
    expectNoBfCrmCall();
  });

  it("Email opens the log form and posts event_type email", async () => {
    renderBar();
    fireEvent.click(screen.getByRole("button", { name: "Email" }));
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Quote attached" } });
    fireEvent.change(screen.getByLabelText("Email text"), { target: { value: "Here is the quote." } });
    fireEvent.click(screen.getByRole("button", { name: "Log email" }));
    await waitFor(() => expect(lastPost()).toBeDefined());
    const [path, init] = lastPost();
    expect(path).toBe(CONTACT_PATH);
    expect(init.body).toEqual({
      event_type: "email",
      body: "Here is the quote.",
      outcome: null,
      meta: { direction: "outbound", address: "jane@example.com", subject: "Quote attached" },
    });
    expectNoBfCrmCall();
  });

  it("shows the server's error and keeps the popup open", async () => {
    h.apiFn.mockRejectedValue(new Error("bi_server_down"));
    renderBar();
    fireEvent.click(screen.getByRole("button", { name: "Note" }));
    fireEvent.change(screen.getByPlaceholderText(/leave a note/i), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Create note" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("bi_server_down");
    expect(screen.getByRole("button", { name: "Create note" })).toBeInTheDocument();
  });
});

describe("ActionBar target=bi on a company", () => {
  it("Note and Call post to the company activity path", async () => {
    render(<ActionBar target="bi" scope={{ kind: "company", id: "co1" }} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Note" }));
    fireEvent.change(screen.getByPlaceholderText(/leave a note/i), { target: { value: "Board approved" } });
    fireEvent.click(screen.getByRole("button", { name: "Create note" }));
    await waitFor(() => expect(lastPost()?.[0]).toBe(COMPANY_PATH));
    expect(lastPost()[1].body.event_type).toBe("note");

    fireEvent.click(screen.getByRole("button", { name: "Call" }));
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "+14035550000" } });
    const submit = screen.getAllByRole("button", { name: "Log call" }).pop()!;
    fireEvent.click(submit);
    await waitFor(() => expect(lastPost()[1].body.event_type).toBe("call"));
    expect(lastPost()[0]).toBe(COMPANY_PATH);
    expectNoBfCrmCall();
  });
});

describe("ActionBar default target (bf) is unchanged", () => {
  it("Note still goes to BF-Server's CRM notes", async () => {
    h.postOrQueue.mockResolvedValue({ ok: true });
    render(<ActionBar scope={{ kind: "contact", id: "c1" }} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Note" }));
    fireEvent.change(screen.getByPlaceholderText(/leave a note/i), { target: { value: "hi" } });
    fireEvent.click(screen.getByRole("button", { name: "Create note" }));
    await waitFor(() => expect(h.postOrQueue).toHaveBeenCalledWith("/api/crm/contacts/c1/notes", { body: "hi" }, "Note"));
    expect(screen.queryByTestId("crm-log-call")).toBeNull();
  });
});
