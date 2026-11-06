// BF_PORTAL_v907_CRM - export of every matching record, segments that return to all contacts, partial mass delete
// message, find more sources, and ignoring a clean-up proposal.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), saveBlob: vi.fn() }));
vi.mock("@/api", () => {
  const fn: any = vi.fn(async () => ({}));
  fn.get = (...a: unknown[]) => h.get(...a);
  fn.post = (...a: unknown[]) => h.post(...a);
  fn.delete = vi.fn(async () => ({}));
  return { api: fn, default: fn };
});
vi.mock("@/lib/downloadName", () => ({ saveBlob: (...a: unknown[]) => h.saveBlob(...a) }));

import { fetchAllRows, rowsToCsv, saveCsv } from "@/pages/crm/crmExport";
import { bulkDeleteMessage, skippedFrom } from "@/pages/crm/bulkDeleteResult";
import { CrmSegmentBar } from "@/components/crm/CrmSegmentBar";
import { CrmCleanupPage } from "@/components/crm/unified/CrmCleanupPage";
import { CrmAiSummary } from "@/components/crm/unified/CrmAiSummary";
import { MemoryRouter } from "react-router-dom";

const BF = { kind: "bf" as const, base: "/api/crm", linkBase: "/crm", contactsPath: "/api/crm/contacts" };

beforeEach(() => { h.get.mockReset(); h.post.mockReset(); h.saveBlob.mockReset(); });

describe("CRM export", () => {
  it("fetches every page that matches the view", async () => {
    const page = vi.fn(async (p: number, size: number) => ({ rows: Array.from({ length: p < 3 ? size : 7 }, (_, i) => ({ id: `${p}-${i}` })), total: size * 2 + 7 }));
    const rows = await fetchAllRows(page);
    expect(rows).toHaveLength(1007);
    expect(page).toHaveBeenCalledTimes(3);
  });
  it("writes the chosen columns, quotes commas and neutralises formulas", () => {
    const csv = rowsToCsv([{ n: "Acme, Inc", t: ["a", "b"], f: "=SUM(A1)" }], [
      { label: "Name", value: (r) => r.n }, { label: "Tags", value: (r) => r.t }, { label: "Note", value: (r) => r.f },
    ]);
    expect(csv.replace("﻿", "").split("\r\n")).toEqual(["Name,Tags,Note", `"Acme, Inc",a; b,"'=SUM(A1)"`]);
  });
  it("saves the file (the link is released after the download starts)", async () => {
    expect(await saveCsv("contacts.csv", "a,b")).toBe("saved");
    expect(h.saveBlob).toHaveBeenCalledWith(expect.any(Blob), "contacts.csv");
  });
});

describe("segments", () => {
  it("All contacts applies empty filters so the list returns to every contact", async () => {
    h.get.mockResolvedValue([{ id: "s1", name: "Hot leads", filters: { tagFilter: "hot" } }]);
    const onApply = vi.fn();
    render(<CrmSegmentBar current={{}} onApply={onApply} allLabel="All contacts" />);
    const select = screen.getByLabelText("Segments");
    await screen.findByRole("option", { name: "Hot leads" });
    fireEvent.change(select, { target: { value: "s1" } });
    expect(onApply).toHaveBeenLastCalledWith({ tagFilter: "hot" });
    fireEvent.click(screen.getByTestId("segment-clear"));
    expect(onApply).toHaveBeenLastCalledWith({});
    fireEvent.change(select, { target: { value: "s1" } });
    fireEvent.change(select, { target: { value: "" } });
    expect(onApply).toHaveBeenLastCalledWith({});
    expect(screen.getByRole("option", { name: "All contacts" })).toBeInTheDocument();
  });
});

describe("mass delete result", () => {
  it("lists the records left and why", () => {
    const skipped = skippedFrom({ deleted: 2, skipped: [{ id: "c1", name: "Acme Ltd", reason: "has applications" }] });
    expect(bulkDeleteMessage("company", 2, skipped)).toBe("Deleted 2 companies.\n\n1 company not deleted:\n- Acme Ltd: has applications");
    expect(skippedFrom({ details: { skipped: [{ id: "x", reason: "kept" }] } })).toEqual([{ id: "x", name: null, reason: "kept" }]);
  });
});

describe("clean up data: Ignore", () => {
  it("ignores one proposal and removes it from the list", async () => {
    const change = { entity: "contact", entityId: "11111111-1111-4111-8111-111111111111", record: "JANE DOE", field: "name", before: "JANE DOE", after: "Jane Doe", reason: "All capitals" };
    h.get.mockImplementation(async (url: string) => (url.includes("/cleanup/scan") ? { entity: "contact", changes: [change] } : []));
    h.post.mockResolvedValue({ ignored: 1 });
    render(<MemoryRouter><CrmCleanupPage backend={BF} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Scan" }));
    fireEvent.click(await screen.findByRole("button", { name: "Ignore Name of JANE DOE" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/crm/unified/cleanup/ignore", { changes: [change] }));
    expect(await screen.findByText(/will not be proposed again/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ignore Name of JANE DOE" })).toBeNull();
  });
});

describe("find more sources", () => {
  it("asks the server for public pages and shows them with the summary", async () => {
    h.get.mockResolvedValue({ summary: "Jane runs Acme.", business: null, sources: [], generatedAt: "2026-11-01T00:00:00Z", cached: true });
    h.post.mockResolvedValue({ sources: [{ label: "LinkedIn", url: "https://www.linkedin.com/in/jane", detail: null }], photoUrl: null,
      summary: { summary: "Jane runs Acme.", business: null, sources: [{ type: "web", label: "LinkedIn", url: "https://www.linkedin.com/in/jane", status: "used" }], generatedAt: "2026-11-01T00:00:00Z", cached: true } });
    render(<CrmAiSummary backend={BF} entity="contact" id="c1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Find more sources" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/crm/unified/ai-summary/contact/c1/sources", {}));
    expect(await screen.findByText("Found 1 public page(s).")).toBeInTheDocument();
    expect(within(screen.getByTestId("crm-ai-summary")).getByRole("link", { name: "LinkedIn" })).toHaveAttribute("href", "https://www.linkedin.com/in/jane");
  });
});
