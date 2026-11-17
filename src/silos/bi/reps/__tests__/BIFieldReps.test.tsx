// BF_PORTAL_BI_FIELD_REPS_v1
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock("@/api", () => ({ api: h.call }));

import BIFieldReps from "../BIFieldReps";

const REP = { id: "r1", code: "ab12cd", full_name: "Sam Rep", company_name: "Itest Brokers", email: "sam@example.com", phone_e164: null, active: true, contacts: 2, opened: 1, last_contact_at: "2026-11-14T12:00:00Z", page_url: "https://www.boreal.insure/rep/ab12cd" };
const answer = (extra: (path: string, init?: any) => unknown = () => undefined) => h.call.mockImplementation(async (path: string, init?: any) => {
  const x = extra(path, init);
  if (x !== undefined) return x;
  if (path === "/api/v1/bi/field-reps" && !init) return { ok: true, reps: [REP] };
  return { ok: true };
});
const calls = (path: string, method?: string) => h.call.mock.calls.filter((c) => c[0] === path && (!method || c[1]?.method === method));
afterEach(() => { cleanup(); h.call.mockReset(); });

describe("Insurance: reps", () => {
  it("lists each rep with their code and counts", async () => {
    answer();
    render(<BIFieldReps />);
    expect(await screen.findByText("Sam Rep")).toBeTruthy();
    expect(screen.getByText("ab12cd")).toBeTruthy();
    expect(screen.getByText("Itest Brokers | sam@example.com")).toBeTruthy();
  });

  it("adding a rep shows the page link and the PIN once", async () => {
    answer((path, init) => (path === "/api/v1/bi/field-reps" && init?.method === "POST" ? { ok: true, rep: { full_name: "New Rep" }, pin: "482913", page_url: "https://www.boreal.insure/rep/zz99yy" } : undefined));
    render(<BIFieldReps />);
    await screen.findByText("Sam Rep");
    fireEvent.click(screen.getByRole("button", { name: "Add rep" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Enter the rep's name.");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New Rep" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Add rep" }));
    const box = await screen.findByTestId("rep-issued");
    expect(box.textContent).toContain("482913");
    expect(box.textContent).toContain("https://www.boreal.insure/rep/zz99yy");
    expect(JSON.parse(calls("/api/v1/bi/field-reps", "POST")[0]![1].body)).toMatchObject({ full_name: "New Rep", email: "new@example.com" });
  });

  it("a new PIN, switching a rep off, and the rep's contacts", async () => {
    answer((path, init) => {
      if (path === "/api/v1/bi/field-reps/r1/pin") return { ok: true, pin: "111222", page_url: REP.page_url };
      if (path === "/api/v1/bi/field-reps/r1/contacts") return { ok: true, contacts: [{ id: "c1", full_name: "Pat Example", company_name: "First Bank", title: "VP", email: "pat@example.com", phone_e164: null, source: "card", status: "Opened the information", created_at: "2026-11-14T12:00:00Z", notes: "Wants a call" }] };
      return undefined;
    });
    render(<BIFieldReps />);
    await screen.findByText("Sam Rep");
    fireEvent.click(screen.getByRole("button", { name: "New PIN" }));
    expect((await screen.findByTestId("rep-issued")).textContent).toContain("111222");
    fireEvent.click(screen.getByRole("button", { name: "Switch off" }));
    await waitFor(() => expect(JSON.parse(calls("/api/v1/bi/field-reps/r1", "PATCH")[0]![1].body)).toEqual({ active: false }));
    fireEvent.click(screen.getByRole("button", { name: "Contacts" }));
    expect(await screen.findByText("Pat Example")).toBeTruthy();
    expect(screen.getByText("Opened the information")).toBeTruthy();
    expect(screen.getByText(/Business card/)).toBeTruthy();
    expect(screen.getByText("Note: Wants a call")).toBeTruthy();
  });

  it("says so when the list cannot be loaded", async () => {
    h.call.mockRejectedValue(new Error("Request failed"));
    render(<BIFieldReps />);
    expect((await screen.findByRole("alert")).textContent).toBe("Request failed");
  });

  // BF_PORTAL_BI_REP_AGREEMENT_v1
  it("adding a rep needs an email, says the agreement was sent, and the table shows where it stands", async () => {
    answer((path, init) => {
      if (path === "/api/v1/bi/field-reps" && init?.method === "POST") return { ok: true, rep: { full_name: "New Rep" }, pin: null, page_url: "https://www.boreal.insure/rep/zz99yy", agreement: { status: "sent", emailed: true } };
      if (path === "/api/v1/bi/field-reps" && !init) return { ok: true, reps: [{ ...REP, agreement: "sent" }] };
      return undefined;
    });
    render(<BIFieldReps />);
    await screen.findByText("Sam Rep");
    expect(screen.getByTestId("rep-agreement-status").textContent).toBe("Sent, not signed yet");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New Rep" } });
    fireEvent.click(screen.getByRole("button", { name: "Add rep" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Enter the rep's email address");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Add rep" }));
    expect((await screen.findByTestId("rep-agreement-sent")).textContent).toContain("Introducer Agreement to sign");
    // v2: the welcome (page link and PIN) goes to the rep only once they sign, so neither is shown here.
    expect(screen.getByTestId("rep-agreement-sent").textContent).toContain("as soon as they sign");
    expect(screen.getByTestId("rep-issued").textContent).not.toContain("PIN:");
    fireEvent.click(screen.getByRole("button", { name: "Resend agreement" }));
    await waitFor(() => expect(calls("/api/v1/bi/field-reps/r1/agreement", "POST")).toHaveLength(1));
  });

  it("the Mobile box shapes the number as it is typed", async () => {
    answer(() => undefined);
    render(<BIFieldReps />);
    const mobile = (await screen.findByLabelText("Mobile")) as HTMLInputElement;
    fireEvent.change(mobile, { target: { value: "15125550142999" } });
    expect(mobile.value).toBe("(512) 555-0142");
  });
});
