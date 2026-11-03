// BF_PORTAL_v869_SETTINGS_PACK - the HubSpot-parity settings tabs, the follow-up prompt and the two-step sign-in screen.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), del: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, put: h.put, post: h.post, delete: h.del }, default: { get: h.get, put: h.put, post: h.post, delete: h.del } }));
vi.mock("@/auth/passkey", () => ({ passkeysSupported: () => true, registerPasskey: vi.fn(), loginWithPasskey: vi.fn() }));

import PhoneMenuSettings from "../PhoneMenuSettings";
import SecuritySettings from "../SecuritySettings";
import PrivacySettings from "../PrivacySettings";
import { BlockedNumbersSettings, LeadRotationSettings, NeverLogSettings } from "../ListSettings";
import SurveySettings from "../SurveySettings";
import FollowUpPrompt, { requestFollowUp } from "../FollowUpPrompt";
import StrongSignInGate from "../StrongSignInGate";
import { reportStrongSignInRequired } from "../strongSignIn";

const A = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  for (const f of Object.values(h)) f.mockReset();
  h.put.mockResolvedValue({ ok: true, spoken_greeting: "Thank you for calling Acme Capital. For Jane Smith, press 1." });
  h.post.mockResolvedValue({ ok: true });
  h.del.mockResolvedValue({ ok: true });
});

describe("Phone menu", () => {
  // The live 866 menu as GET /api/phone-menu returns it (Todd and Andrew resolved to their user ids).
  const T = "44444444-4444-4444-8444-444444444444";
  const tts = (text: string) => ({ mode: "tts", text, audioId: null });
  const BOREAL = {
    greeting: tts("This call may be recorded. Thank you for calling the Boreal Group of Companies."), announceOptions: false,
    hours: { enabled: false, weekly: { sun: [], mon: [["09:00", "17:00"]], tue: [["09:00", "17:00"]], wed: [["09:00", "17:00"]], thu: [["09:00", "17:00"]], fri: [["09:00", "17:00"]], sat: [] } },
    afterHoursGreeting: tts("Our office is closed right now."), afterHours: { type: "voicemail", userId: null, message: "" },
    options: [
      { id: "BF", digit: "1", label: "Boreal Financial", keywords: ["financ"], target: { type: "submenu", menu: {
        prompt: tts("For client engagement, press 1. For credit, press 2."), announceOptions: false, retryPrompt: "Sorry, I didn't catch that.",
        options: [
          { id: "caden", digit: null, label: "Caden", keywords: ["caden"], target: { type: "voicemail", userId: null, message: "Let me take a message for the team." } },
          { id: "engagement", digit: "1", label: "client engagement", keywords: ["client"], target: { type: "group", userIds: [T], strategy: "simultaneous", everyoneAvailable: true, exceptUserIds: [A] } },
          { id: "underwriting", digit: "2", label: "credit", keywords: ["credit"], target: { type: "user", userId: A, name: "Andrew" } },
        ],
        whenNoChoice: { retry: true, optionId: "engagement" } } } },
      { id: "sales", digit: "2", label: "Boreal Risk Management", keywords: ["risk"], target: { type: "user", userId: T, name: "Todd" } },
      { id: "meeting", digit: "3", label: "a scheduled meeting", keywords: ["meeting"], target: { type: "meeting" } },
    ],
    whenNoChoice: { retry: false, optionId: "BF" },
    noAnswer: { ringSeconds: 25, target: { type: "voicemail", userId: null, message: "" } }, holidays: [],
  };
  it("shows Boreal's live menu with its second level, and saves an edit", async () => {
    h.get.mockResolvedValue({ menu: BOREAL, is_default: true, users: [{ id: T, name: "Todd Werboweski" }, { id: A, name: "Andrew P" }], audio: [], stale_user_ids: [], time_zone: "Etc/GMT+6", zone_label: "Alberta time", open_now: true, spoken_greeting: "" });
    render(<PhoneMenuSettings />);
    expect(await screen.findAllByTestId("pm-option")).toHaveLength(3);
    expect(screen.getAllByTestId("pm-sub-option")).toHaveLength(3);
    expect(screen.getByText(/This is the menu callers hear today/)).toBeTruthy();
    expect((screen.getAllByLabelText("Name callers hear") as HTMLInputElement[]).map((x) => x.value)).toEqual(["Andrew", "Todd"]);
    expect(screen.getByLabelText("Also ring everyone else who is available")).toBeTruthy();
    fireEvent.click(screen.getAllByText("Add an option")[1]!);
    expect(screen.getAllByTestId("pm-option")).toHaveLength(4);
    fireEvent.click(screen.getByText("Save phone menu"));
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/phone-menu", expect.objectContaining({ menu: expect.objectContaining({ options: expect.any(Array) }) })));
    const saved = (h.put.mock.calls[0]![1] as any).menu;
    expect(saved.options[3].digit).toBe("4");
    expect(saved.options[3].id).not.toMatch(/^(BF|sales|meeting|caden|engagement|underwriting)$/);
    expect(saved.options[0].target.menu.whenNoChoice).toEqual({ retry: true, optionId: "engagement" });
    expect(await screen.findByText(/Callers now hear/)).toBeTruthy();
  });
});

describe("Security", () => {
  it("the two-step switch stays off until this session is strong", async () => {
    h.get.mockResolvedValue({ require_strong_sign_in: false, session_strong: false, readiness: { with_passkey: 1, staff: 3, admins_without_passkey: [{ id: A, name: "Jane" }] }, users: [] });
    render(<SecuritySettings />);
    const box = await screen.findByLabelText("Require a passkey or two-step sign-in for all staff") as HTMLInputElement;
    expect(box.disabled).toBe(true);
    expect(screen.getByText(/1 of 3 staff have a passkey. Admins without one: Jane/)).toBeTruthy();
  });
});

describe("Privacy requests", () => {
  it("explains what a deletion keeps and why", async () => {
    h.get.mockImplementation(async (path: string) => path === "/api/privacy/requests"
      ? { requests: [{ id: "r1", contact_id: "c1", contact_label: "Jane Client", kind: "deletion", status: "open", requested_at: "2026-10-26T00:00:00Z", due_at: "2026-11-25T00:00:00Z" }] }
      : { deletion_plan: { can_delete: false, will_delete: [], will_keep: [{ what: "The contact, its applications", why: "An application is still open; records are kept for 7 years after it closes.", until: null }] } });
    render(<PrivacySettings />);
    fireEvent.click(await screen.findByText("Open"));
    expect(await screen.findByText(/kept for 7 years after it closes/)).toBeTruthy();
    expect(screen.getByText("Opt out and close the request")).toBeTruthy();
  });
});

describe("Lists", () => {
  it("never log, blocked numbers and lead rotation", async () => {
    h.get.mockImplementation(async (path: string) => {
      if (path === "/api/never-log") return { entries: [{ id: "e1", value: "family.test", kind: "domain", note: null }] };
      if (path === "/api/blocked-numbers") return { numbers: [], settings: { call_action: "reject" }, events: [] };
      return { settings: { enabled: false, user_ids: [], sources: { website: true, booking: true, form: true }, away_user_ids: [] }, users: [{ id: A, name: "Jane Smith" }], recent: [] };
    });
    render(<><NeverLogSettings /><BlockedNumbersSettings /><LeadRotationSettings /></>);
    expect(await screen.findByText("Anyone at family.test")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "403-555-0199" } });
    fireEvent.click(screen.getByText("Block"));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/blocked-numbers", { number: "403-555-0199", reason: "" }));
    fireEvent.click(await screen.findByLabelText("Jane Smith in the rotation"));
    fireEvent.click(screen.getByLabelText("Give new leads an owner in turn"));
    fireEvent.click(screen.getByText("Save lead rotation"));
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/lead-rotation", { settings: expect.objectContaining({ enabled: true, user_ids: [A] }) }));
  });
});

describe("Client survey", () => {
  it("shows the NPS report", async () => {
    h.get.mockImplementation(async (path: string) => path === "/api/surveys/settings"
      ? { settings: { enabled: true, delay_days: 7, question: "How likely?", comment_prompt: "Why?", email_subject: "Hi", email_intro: "Hi", sms_text: "Hi", review_url: "" } }
      : { nps: 40, responses: 5, sent: 8, promoters: 3, passives: 1, detractors: 1, response_rate: 63, by_month: [], recent: [] });
    render(<SurveySettings />);
    expect((await screen.findByTestId("nps-score")).textContent).toBe("NPS 40");
  });
});

describe("follow-up prompt", () => {
  it("after a logged call, offers the task pre-filled from my defaults and creates it", async () => {
    h.get.mockResolvedValue({ prompt: true, title: "Call Pat Lee - follow-up after the call", type: "CALL", due_at: "2026-12-11T15:00:00.000Z", reminder_at: "2026-12-11T14:45:00.000Z", contact_id: "c1" });
    render(<FollowUpPrompt />);
    act(() => requestFollowUp("call", "c1"));
    expect(await screen.findByDisplayValue("Call Pat Lee - follow-up after the call")).toBeTruthy();
    expect(h.get).toHaveBeenCalledWith("/api/task-defaults/suggestion?after=call&contact_id=c1");
    fireEvent.click(screen.getByText("Create task"));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/tasks", expect.objectContaining({ title: "Call Pat Lee - follow-up after the call", type: "CALL", contact_id: "c1", due_at: "2026-12-11T15:00:00.000Z", reminder_at: "2026-12-11T14:45:00.000Z" })));
  });

  it("stays quiet when I switched the prompt off", async () => {
    h.get.mockResolvedValue({ prompt: false });
    render(<FollowUpPrompt />);
    act(() => requestFollowUp("email", "c1"));
    await waitFor(() => expect(h.get).toHaveBeenCalled());
    expect(screen.queryByTestId("follow-up-prompt")).toBeNull();
  });
});

describe("two-step sign-in", () => {
  it("a 403 STRONG_SIGN_IN_REQUIRED opens the one-more-step screen", async () => {
    h.get.mockResolvedValue({ has_passkey: false });
    render(<StrongSignInGate />);
    expect(screen.queryByTestId("strong-sign-in")).toBeNull();
    act(() => reportStrongSignInRequired(403, { error: "OTHER" }));
    expect(screen.queryByTestId("strong-sign-in")).toBeNull();
    act(() => reportStrongSignInRequired(403, { error: "STRONG_SIGN_IN_REQUIRED" }));
    expect(await screen.findByText("One more step to sign in")).toBeTruthy();
    expect(await screen.findByText("Set up a passkey on this device")).toBeTruthy();
  });
});
