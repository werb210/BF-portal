// BF_PORTAL_v855_RETENTION - the retention lock on delete buttons and Settings -> Retention & legal holds.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post } }));

import RetentionLock from "../RetentionLock";
import { formatDay, lockLabel, parseStatus, refusedDeleteMessage } from "../retention";
import RetentionSettings from "@/pages/settings/tabs/RetentionSettings";

const locked = (over: Record<string, unknown> = {}) =>
  parseStatus({ locked: true, reason: "retention", deletable_on: "2033-10-24", file_open: false, holds: [], message: "This document is kept for 7 years and cannot be deleted before 2033-10-24.", ...over });

beforeEach(() => {
  h.get.mockReset();
  h.post.mockReset();
});

describe("retention status", () => {
  it("labels the lock with the date, a hold, or an open file", () => {
    expect(lockLabel(locked())).toBe(`Locked until ${formatDay("2033-10-24")}`);
    expect(lockLabel(locked({ reason: "hold", deletable_on: null }))).toBe("Legal hold");
    expect(lockLabel(locked({ deletable_on: null, file_open: true }))).toBe("Locked: file still open");
    expect(lockLabel(parseStatus({ locked: false }))).toBe("");
  });

  it("treats an unknown answer as not locked, so nothing is blocked by mistake", () => {
    expect(parseStatus(null).locked).toBe(false);
    expect(parseStatus("nonsense").locked).toBe(false);
  });

  it("turns a refused delete (423) into the server's message", () => {
    const e = { status: 423, message: "x", details: { message: "This application is under a legal hold (litigation) and cannot be deleted until an admin releases the hold.", deletable_on: null } };
    expect(refusedDeleteMessage(e)).toMatch(/legal hold \(litigation\)/);
    expect(refusedDeleteMessage({ status: 500, message: "boom" })).toBeNull();
    const dated = refusedDeleteMessage({ status: 423, details: { message: "Kept on file.", deletable_on: "2031-01-02" } });
    expect(dated).toContain(formatDay("2031-01-02"));
  });

  it("shows a readable lock with the date and the full reason as its label", () => {
    render(<RetentionLock status={locked()} />);
    const el = screen.getByTestId("retention-lock");
    expect(el).toHaveTextContent(`Locked until ${formatDay("2033-10-24")}`);
    expect(el).toHaveAttribute("aria-label", expect.stringContaining("cannot be deleted before 2033-10-24"));
  });

  it("renders nothing when the record can be deleted", () => {
    const { container } = render(<RetentionLock status={parseStatus({ locked: false })} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Settings -> Retention & legal holds", () => {
  const report = {
    generated_at: "2026-10-24T00:00:00Z",
    retention_years: 7,
    eligible_applications: [{ application_id: "app-1", label: "Old Co", silo: "BF", closed_at: "2018-01-01T00:00:00Z", eligible_since: "2025-01-01" }],
    eligible_documents: [],
    eligible_audit_events: { count: 4, oldest: "2018-01-01T00:00:00Z" },
    totals: { records: 10, open_files: 3, locked_until_date: 5, held: 1, eligible: 1 },
  };
  const hold = { id: "h1", target_type: "application", target_id: "app-2", target_label: "Acme", reason: "litigation", placed_at: "2026-10-01T00:00:00Z", placed_by_name: "Todd", released_at: null, released_by_name: null, release_reason: null };

  function answer() {
    h.get.mockImplementation(async (url: string) => {
      if (url.startsWith("/api/retention/holds")) return { ok: true, holds: [hold] };
      if (url === "/api/retention/report") return { ok: true, ...report };
      throw new Error(`unexpected ${url}`);
    });
  }

  it("lists active holds and the eligible-for-deletion report", async () => {
    answer();
    render(<RetentionSettings />);
    await waitFor(() => expect(screen.getAllByTestId("hold-row")).toHaveLength(1));
    expect(screen.getByTestId("hold-row")).toHaveTextContent("Application: Acme");
    expect(screen.getByTestId("hold-row")).toHaveTextContent("litigation");
    await waitFor(() => expect(screen.getByTestId("eligible-application")).toHaveTextContent("Old Co"));
    expect(screen.getByTestId("retention-totals")).toHaveTextContent("1 under a legal hold");
    expect(screen.getByText(/Audit events older than 7 years: 4/)).toBeInTheDocument();
  });

  it("places a hold with a reason", async () => {
    answer();
    h.post.mockResolvedValueOnce({ ok: true, hold: { ...hold, id: "h2", target_label: "Beta Inc" } });
    render(<RetentionSettings />);
    fireEvent.change(screen.getByLabelText("Hold on"), { target: { value: "company" } });
    fireEvent.change(screen.getByLabelText("Record id"), { target: { value: "c0ffee00-0000-4000-8000-000000000000" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "regulator request" } });
    fireEvent.click(screen.getByRole("button", { name: "Place legal hold" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/retention/holds", {
      target_type: "company", target_id: "c0ffee00-0000-4000-8000-000000000000", reason: "regulator request",
    }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Legal hold placed on Beta Inc"));
  });

  it("asks for a reason before placing a hold", async () => {
    answer();
    render(<RetentionSettings />);
    fireEvent.change(screen.getByLabelText("Record id"), { target: { value: "app-9" } });
    fireEvent.click(screen.getByRole("button", { name: "Place legal hold" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Give a reason"));
    expect(h.post).not.toHaveBeenCalled();
  });

  it("releases a hold, recording the reason", async () => {
    answer();
    h.post.mockResolvedValueOnce({ ok: true, hold: { ...hold, released_at: "2026-10-24T00:00:00Z" } });
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("case settled");
    render(<RetentionSettings />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Release" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Release" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/retention/holds/h1/release", { reason: "case settled" }));
    prompt.mockRestore();
  });
});
