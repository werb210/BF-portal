// BF_PORTAL_v948_TERM_SHEET_BY_TYPE
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), postFile: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, patch: h.patch, put: vi.fn(), post: vi.fn() } }));
vi.mock("@/brokerTools/useRun", async (orig) => ({ ...(await orig() as object), postFile: h.postFile, downloadFile: vi.fn() }));

import YourDocumentsSettings from "../YourDocumentsSettings";

const TYPES = [{ key: "TERM_LOAN", label: "Term Loan" }, { key: "EQUIPMENT_FINANCE", label: "Equipment Finance" }, { key: "FACTORING", label: "Factoring" }];
const doc = (id: string, name: string, financing_type: string | null) => ({ id, kind: "term_sheet", name, file_name: "f.pdf", format: "pdf_form", fields: [], active: true, financing_type });

beforeEach(() => {
  h.get.mockReset(); h.patch.mockReset(); h.postFile.mockReset();
  h.get.mockResolvedValue({ kinds: [{ key: "term_sheet", label: "Offer / term sheet" }], financingTypes: TYPES, dataFields: [], questions: [],
    documents: [doc("d1", "General sheet", null), doc("d2", "Equipment sheet", "EQUIPMENT_FINANCE")] });
  h.patch.mockResolvedValue({ ok: true });
  h.postFile.mockResolvedValue({ document: doc("d3", "Factoring sheet", "FACTORING") });
});

describe("term sheet templates by type of financing", () => {
  it("says which types have their own template", async () => {
    render(<YourDocumentsSettings isAdmin />);
    const note = await screen.findByTestId("term-sheet-by-type-note");
    expect(note.textContent).toContain("Types with their own template: Equipment Finance.");
    expect(note.textContent).not.toContain("no general template");
  });

  it("uploads a template for the chosen type", async () => {
    render(<YourDocumentsSettings isAdmin />);
    fireEvent.change(await screen.findByTestId("doc-financing-type"), { target: { value: "FACTORING" } });
    fireEvent.change(screen.getByTestId("doc-file"), { target: { files: [new File(["x"], "f.pdf", { type: "application/pdf" })] } });
    fireEvent.click(screen.getByTestId("doc-upload"));
    await waitFor(() => expect(h.postFile).toHaveBeenCalled());
    expect(h.postFile.mock.calls[0]![2]).toMatchObject({ kind: "term_sheet", financing_type: "FACTORING" });
  });

  it("a general upload sends no type", async () => {
    render(<YourDocumentsSettings isAdmin />);
    fireEvent.change(await screen.findByTestId("doc-file"), { target: { files: [new File(["x"], "f.pdf", { type: "application/pdf" })] } });
    fireEvent.click(screen.getByTestId("doc-upload"));
    await waitFor(() => expect(h.postFile).toHaveBeenCalled());
    expect(h.postFile.mock.calls[0]![2]).not.toHaveProperty("financing_type");
  });

  it("an admin can change which type an existing template is for", async () => {
    render(<YourDocumentsSettings isAdmin />);
    const sel = await screen.findByTestId("doc-type-d1") as HTMLSelectElement;
    expect(sel.value).toBe("");
    fireEvent.change(sel, { target: { value: "TERM_LOAN" } });
    await waitFor(() => expect(h.patch).toHaveBeenCalledWith("/api/licensee-documents/d1", { financing_type: "TERM_LOAN" }));
  });

  it("staff see the type but cannot change it", async () => {
    render(<YourDocumentsSettings isAdmin={false} />);
    expect(await screen.findByText("Equipment Finance")).toBeTruthy();
    expect(screen.queryByTestId("doc-type-d2")).toBeNull();
    expect(screen.queryByTestId("doc-financing-type")).toBeNull();
  });
});
