// BF_PORTAL_v851_APPLICANT_NAME - the Application tab warns when the applicant has no real name, and Send for
// signing shows the server's applicant_name_missing refusal clearly.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "@/api/http";

const h = vi.hoisted(() => {
  const fn: any = vi.fn(async () => ({}));
  fn.get = vi.fn(async (url: string) => (String(url).includes("signing-readiness") ? { data: { reason: "ready", canSend: true, isSba: false } } : { data: [] }));
  fn.post = vi.fn(async () => ({ data: { ok: true } }));
  return { api: fn };
});
vi.mock("@/api", () => ({ api: h.api, default: h.api }));
vi.mock("@/api/applicationTasks", () => ({ fetchTaskStatus: vi.fn(async () => ({ tasks: [], summary: { total: 0, complete: 0 } })) }));
vi.mock("@/api/formResponses", () => ({ getFormResponse: vi.fn(async () => null) }));
vi.mock("@/pages/applications/tabs/ProductQuestionsPanel", () => ({ default: () => null }));
vi.mock("@/native/dialerLauncher", () => ({ placeCall: vi.fn() }));

import ApplicationTab from "../ApplicationTab";
import { APPLICANT_NAME_MISSING_NOTE, applicantNameMissing, applicantNameMissingMessage, isPlaceholderName } from "../applicantName";

const show = (applicantDetails: Record<string, unknown>, signing?: { status: string }) =>
  render(
    <MemoryRouter>
      <ApplicationTab application={{ id: "app-851", businessDetails: { legalName: "Rivers Co" }, applicantDetails, signing, rawPayload: {} }} />
    </MemoryRouter>,
  );

beforeEach(() => {
  h.api.post.mockReset();
  h.api.post.mockImplementation(async () => ({ data: { ok: true } }));
});

describe("v851 applicant name missing", () => {
  it("knows the placeholder", () => {
    expect(isPlaceholderName("Unknown (application started)")).toBe(true);
    expect(isPlaceholderName("Jordan Rivers")).toBe(false);
    expect(applicantNameMissing({ firstName: "Unknown", lastName: "(application started)" })).toBe(true);
    expect(applicantNameMissing({}, { firstName: "Jordan" })).toBe(false);
    expect(applicantNameMissingMessage(new ApiError({ status: 422, message: "Add the applicant's name first", details: { error: "applicant_name_missing" } }))).toBe("Add the applicant's name first");
    expect(applicantNameMissingMessage(new ApiError({ status: 500, message: "boom" }))).toBeNull();
  });

  it("shows a readable red note for the placeholder name", async () => {
    show({ firstName: "Unknown", lastName: "(application started)", email: "jordan@rivers.co" });
    const note = await screen.findByTestId("applicant-name-missing");
    expect(note.textContent).toContain(APPLICANT_NAME_MISSING_NOTE);
    expect(note.textContent).toContain("Applicant name missing - add it before sending for signing");
    // Dark red text on a light red background: readable in light and dark themes.
    expect(note.style.color).toBe("rgb(153, 27, 27)");
    expect(note.style.background).toContain("rgb(254, 242, 242)");
  });

  it("shows the note when the name is empty, and not when there is a real name", async () => {
    const { unmount } = show({ email: "x@y.co" });
    expect(await screen.findByTestId("applicant-name-missing")).toBeTruthy();
    unmount();
    const real = show({ firstName: "Jordan", lastName: "Rivers" });
    await screen.findByTestId("send-for-signing");
    expect(screen.queryByTestId("applicant-name-missing")).toBeNull();
    real.unmount();
    show({ firstName: "Unknown" }, { status: "signed" });
    await screen.findByTestId("signing-badge");
    expect(screen.queryByTestId("applicant-name-missing")).toBeNull();
  });

  it.each(["422", "ok:false"])("Send for signing shows the server's applicant_name_missing message (%s)", async (response) => {
    h.api.post.mockImplementation(async () => {
      if (response === "422") {
        throw new ApiError({ status: 422, message: "Add the applicant's name first", details: { error: "applicant_name_missing", message: "Add the applicant's name first" } });
      }
      return { data: { ok: false, reason: "applicant_name_missing" } };
    });
    show({ firstName: "Jordan", lastName: "Rivers" });
    fireEvent.click(await screen.findByTestId("send-for-signing"));
    const server = await screen.findByTestId("applicant-name-missing-server");
    expect(server.textContent).toBe("Send for signing was refused: Add the applicant's name first.");
    expect(screen.queryByTestId("reset-signing")).toBeNull();
    await waitFor(() => expect(screen.queryByText("Could not send for signing")).toBeNull());
  });
});
