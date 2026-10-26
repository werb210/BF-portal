// BF_PORTAL_v857_SIGNING_NOTIFY - Send for signing shows exactly who was emailed / texted, or why not; the applicant's
// name and email are readable links, not greyed out.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const AT = "2026-10-25T22:02:00.000Z";
const SEAN = {
  index: 1, role: "Owner 1", name: "Sean Dwyer", isApplicant: true, alreadySigned: false, waitingFor: null,
  email: { to: "pokedwyer@gmail.com", status: "sent", at: AT, reason: null },
  sms: { to: "(323) 898-2498", status: "sent", at: AT, reason: null },
};
const LIZ = {
  index: 2, role: "Owner 2", name: "Elizabeth Cullen", isApplicant: false, alreadySigned: false, waitingFor: "Sean Dwyer",
  email: { to: "pokecullen@gmail.com", status: "sent", at: AT, reason: null },
  sms: { to: "(310) 663-1364", status: "skipped", at: null, reason: "this number has not said yes to \"Text me updates\"" },
};

const h = vi.hoisted(() => {
  const fn: any = vi.fn(async () => ({}));
  fn.readiness = { reason: "ready", canSend: true, isSba: false } as Record<string, unknown>;
  fn.get = vi.fn(async (url: string) => (String(url).includes("signing-readiness") ? { data: fn.readiness } : { data: [] }));
  fn.post = vi.fn(async () => ({ data: { ok: true } }));
  return { api: fn };
});
vi.mock("@/api", () => ({ api: h.api, default: h.api }));
vi.mock("@/api/applicationTasks", () => ({ fetchTaskStatus: vi.fn(async () => ({ tasks: [], summary: { total: 0, complete: 0 } })) }));
vi.mock("@/api/formResponses", () => ({ getFormResponse: vi.fn(async () => null) }));
vi.mock("@/pages/applications/tabs/ProductQuestionsPanel", () => ({ default: () => null }));
vi.mock("@/native/dialerLauncher", () => ({ placeCall: vi.fn() }));

import ApplicationTab from "../ApplicationTab";
import { channelLine, clockTime, notifySummary, signerRows } from "../signingNotify";

const show = () =>
  render(
    <MemoryRouter>
      <ApplicationTab application={{
        id: "app-857", contactId: "c-857", businessDetails: { legalName: "Poke Prod LLC" },
        applicantDetails: { firstName: "Sean", lastName: "Dwyer", email: "pokedwyer@gmail.com", phone: "+13238982498" },
        rawPayload: {},
      }} />
    </MemoryRouter>,
  );

beforeEach(() => {
  h.api.readiness = { reason: "ready", canSend: true, isSba: false };
  h.api.post.mockReset();
});

describe("v857 signing notices", () => {
  it("formats each channel with where and when, or why not", () => {
    const now = new Date(AT);
    expect(channelLine("Email", SEAN.email as any, now)).toBe("Email sent to pokedwyer@gmail.com " + clockTime(AT, now));
    expect(clockTime(AT, now)).toMatch(/^\d{1,2}:\d{2} (am|pm)$/);
    expect(channelLine("Text", LIZ.sms as any, now)).toBe("Text not sent to (310) 663-1364 - this number has not said yes to \"Text me updates\"");
    expect(channelLine("Email", { to: "x@y.co", status: "failed", at: null, reason: "email could not be sent: status 401" })).toBe("Email FAILED to x@y.co - email could not be sent: status 401");
    const rows = signerRows({ signers: [SEAN, LIZ] as any }, now);
    expect(rows[0]).toMatchObject({ who: "Sean Dwyer (applicant)", tone: "ok" });
    expect(rows[1]).toMatchObject({ who: "Elizabeth Cullen (owner 2)", tone: "warn" });
    expect(rows[1]!.parts).toContain("their link opens once Sean Dwyer has signed");
  });

  it("only says sent when every signer was reached", () => {
    expect(notifySummary({ signers: [SEAN, LIZ] as any })).toEqual({ ok: true, heading: "Signing request sent to every signer" });
    const nobody = { ...LIZ, email: { ...LIZ.email, status: "failed" } };
    expect(notifySummary({ signers: [SEAN, nobody] as any }).ok).toBe(false);
    expect(notifySummary({ signers: [{ ...nobody, index: 1 }] as any }).heading).toBe("Signing request NOT sent - nobody was reached");
  });

  it("Send for signing lists every signer, not a bare 'Signing sent'", async () => {
    h.api.post.mockImplementation(async () => ({ data: { ok: true, sessionStatus: "ready", replaced: true, notify: { at: AT }, signers: [SEAN, LIZ] } }));
    show();
    fireEvent.click(await screen.findByTestId("send-for-signing"));
    const card = await screen.findByTestId("signing-notify");
    expect(card.textContent).toContain("Signing request sent to every signer");
    expect(screen.getByTestId("signing-notify-1").textContent).toContain("Email sent to pokedwyer@gmail.com");
    expect(screen.getByTestId("signing-notify-1").textContent).toContain("Text sent to (323) 898-2498");
    expect(screen.getByTestId("signing-notify-2").textContent).toContain("Elizabeth Cullen (owner 2):");
    expect(screen.getByTestId("signing-notify-2").textContent).toContain("Text not sent to (310) 663-1364");
    expect(screen.getByTestId("signing-notify-replaced")).toBeTruthy();
    expect(screen.queryByText(/Signing sent/)).toBeNull();
  });

  it("shows the last notice after a reload", async () => {
    h.api.readiness = { reason: "ready", canSend: true, isSba: false, signing: { notify: { at: AT, signers: [SEAN, LIZ] } } };
    show();
    expect((await screen.findByTestId("signing-notify-2")).textContent).toContain("Email sent to pokecullen@gmail.com");
  });

  it("the applicant's name and email are readable links, not the grey accent", async () => {
    show();
    const name = await screen.findByTitle("Open the CRM contact");
    expect(name.textContent).toBe("Sean Dwyer");
    expect(name.style.color).toBe("var(--ui-text)");
    expect(name.style.textDecoration).toContain("underline");
    const email = screen.getByTitle("Email pokedwyer@gmail.com");
    expect(email.style.color).toBe("var(--ui-text)");
  });
});
