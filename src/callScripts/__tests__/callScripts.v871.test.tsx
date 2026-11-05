// BF_PORTAL_v871_CALL_SCRIPTS - the script runner (dialler and records), the dialler fold-out (v891) and the editor.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post, put: h.put } }));

import CallScriptRunner from "../CallScriptRunner";
import CallScriptsPanel from "../CallScriptDock";
import { DialerCallScript } from "@/dialer/components/DialerPanel";
import CallScriptsSettings from "../CallScriptsSettings";
import { useDialer } from "@/dialer/store";

const script = {
  id: "s1", name: "Intake - term loan", description: "First call", use_for: "any", position: 1, archived_at: null,
  sections: [{ id: "o", title: "Opening", body: "Introduce yourself.", questions: [
    { id: "rev", label: "Average monthly revenue", type: "money", options: [], required: true, help: "Last 3 months", maps_to: { object: "application", field: "monthly_revenue" } },
    { id: "use", label: "Use of funds", type: "single_select", options: ["Payroll", "Inventory"], required: false, help: "", maps_to: null },
    { id: "ok", label: "Good time to talk?", type: "yes_no", options: [], required: false, help: "", maps_to: null },
  ] }],
};
const list = { scripts: [script], question_types: [{ value: "text", label: "Short answer" }, { value: "money", label: "Money" }, { value: "single_select", label: "Pick one" }], custom_fields: { contact: [], application: [{ name: "monthly_revenue", label: "Monthly revenue", field_type: "money" }] } };
const run = (over: Record<string, unknown> = {}) => ({ id: "r1", script_id: "s1", script_name: script.name, sections: script.sections, contact_id: "c1", application_id: "a1", answers: {}, status: "in_progress", field_updates: [], field_errors: [], user_name: "Sam", created_at: "2026-10-26T10:00:00Z", completed_at: null, ...over });

beforeEach(() => {
  h.get.mockReset(); h.post.mockReset(); h.put.mockReset();
  useDialer.getState().reset();
  h.get.mockImplementation(async (url: string) => (url.includes("/runs") ? { runs: [] } : list));
});

describe("filling in a script", () => {
  it("shows the talking points and questions, saves, then finishes onto the timeline", async () => {
    h.post.mockResolvedValue({ run: run({ answers: { rev: 12000 } }) });
    h.put.mockResolvedValue({ run: run({ status: "completed", field_updates: [{ object: "application", field: "monthly_revenue" }] }) });
    render(<CallScriptRunner contact_id="c1" application_id="a1" />);
    fireEvent.change(await screen.findByLabelText("Call script"), { target: { value: "s1" } });
    expect(screen.getByText("Introduce yourself.")).toBeInTheDocument();
    expect(screen.getByText(/Saved to the application's "monthly_revenue" field/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Average monthly revenue (required)"), { target: { value: "12000" } });
    fireEvent.change(screen.getByLabelText("Use of funds"), { target: { value: "Payroll" } });
    fireEvent.change(screen.getByLabelText("Good time to talk?"), { target: { value: "yes" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/call-scripts/runs", {
      script_id: "s1", contact_id: "c1", application_id: "a1", call_sid: undefined, answers: { rev: "12000", use: "Payroll", ok: true }, finish: false,
    }));
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/call-scripts/runs/r1", { answers: { rev: "12000", use: "Payroll", ok: true }, finish: true }));
    expect(await screen.findByText("Finished. The answers are on the timeline. 1 custom field updated.")).toBeInTheDocument();
  });

  it("shows past scripts with their answers", async () => {
    h.get.mockImplementation(async (url: string) => (url.includes("/runs") ? { runs: [run({ status: "completed", completed_at: "2026-10-26T11:00:00Z", answers: { rev: 9000, ok: false } })] } : list));
    render(<CallScriptRunner contact_id="c1" />);
    fireEvent.click(await screen.findByRole("button", { name: /Intake - term loan/ }));
    const r = screen.getByTestId("run-r1");
    expect(within(r).getByText(/\$9,000.00/)).toBeInTheDocument();
    expect(within(r).getByText("No")).toBeInTheDocument();
  });
});

describe("where scripts show", () => {
  it("on a contact or application, opened on demand", async () => {
    render(<CallScriptsPanel applicationId="a1" />);
    fireEvent.click(screen.getByRole("button", { name: "Open a call script" }));
    expect(await screen.findByLabelText("Call script")).toBeInTheDocument();
    await waitFor(() => expect(h.get).toHaveBeenCalledWith("/api/call-scripts/runs", { params: { application_id: "a1" } }));
  });

  it("no script in the dialler for a staff-to-staff call (v891)", () => {
    act(() => { useDialer.getState().open({ isStaff: true }); useDialer.getState().setStatus("connected"); });
    render(<DialerCallScript />);
    expect(screen.queryByTestId("dialer-call-script")).toBeNull();
  });

  it("in the dialler's own fold-out, opening the silo's dialler script for the call's contact (v891)", async () => {
    const dialerScript = { ...script, id: "s2", name: "Boreal intake call", use_for: "calls", dialer_default: true,
      sections: [{ id: "consent", title: "Recording consent (read first)", body: "This call is recorded.", questions: [] }] };
    h.get.mockImplementation(async (url: string) => (url.includes("/runs") ? { runs: [] } : { ...list, scripts: [script, dialerScript] }));
    act(() => { useDialer.getState().open({ contactId: "c9", applicationId: null }); useDialer.getState().setStatus("connected"); });
    render(<DialerCallScript />);
    expect(screen.queryByLabelText("Call script", { selector: "select" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Call script/ }));
    await waitFor(() => expect((screen.getByLabelText("Call script", { selector: "select" }) as HTMLSelectElement).value).toBe("s2"));
    expect(screen.getByText("This call is recorded.")).toBeInTheDocument();
    await waitFor(() => expect(h.get).toHaveBeenCalledWith("/api/call-scripts/runs", { params: { contact_id: "c9" } }));
    // Staff can still switch to another script.
    fireEvent.change(screen.getByLabelText("Call script", { selector: "select" }), { target: { value: "s1" } });
    expect(screen.getByText("Introduce yourself.")).toBeInTheDocument();
  });

  it("the old floating box beside the dialler is gone (v891)", async () => {
    const mod = await import("../CallScriptDock");
    expect(Object.keys(mod)).toEqual(["default"]);
  });
});

describe("Settings > Call scripts", () => {
  it("adds starter scripts and builds a script with a mapped question", async () => {
    h.get.mockResolvedValue({ ...list, silo: "BF", scripts: [] });
    h.post.mockImplementation(async (url: string) => (url.endsWith("/starters") ? { added: ["Intake - term loan"] } : { script }));
    render(<CallScriptsSettings />);
    fireEvent.click(await screen.findByRole("button", { name: "Add starter intake scripts" }));
    expect(await screen.findByText("Added: Intake - term loan.")).toBeInTheDocument();
    expect(screen.getByText(/These are the BF scripts/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New script" }));
    fireEvent.change(screen.getByLabelText("Script name"), { target: { value: "Renewals" } });
    fireEvent.change(screen.getByLabelText("Section title"), { target: { value: "Check-in" } });
    fireEvent.change(screen.getByLabelText("Question 1"), { target: { value: "Revenue now" } });
    fireEvent.change(screen.getByLabelText("Answer type"), { target: { value: "money" } });
    fireEvent.change(screen.getByLabelText("Save answer to field"), { target: { value: "application:monthly_revenue" } });
    fireEvent.click(screen.getByLabelText(/Open this script in the dialler during calls/));
    fireEvent.click(screen.getByRole("button", { name: "Save script" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/call-scripts", expect.objectContaining({
      name: "Renewals", dialer_default: true,
      sections: [expect.objectContaining({ title: "Check-in", questions: [expect.objectContaining({ label: "Revenue now", type: "money", maps_to: { object: "application", field: "monthly_revenue" } })] })],
    })));
  });
});
