// BF_PORTAL_v789_BI_APP_NOTES - the BI application Notes tab lists notes with author and date and
// adds new ones.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const apiMock = vi.hoisted(() => vi.fn());
vi.mock("@/api", () => ({ api: apiMock, default: apiMock }));

import NotesTab from "@/silos/bi/pipeline/tabs/NotesTab";
import BIApplicationDetail from "@/silos/bi/pipeline/BIApplicationDetail";

const NOTES = "/api/v1/bi/applications/app1/notes";
let notes: Array<Record<string, unknown>> = [];

beforeEach(() => {
  notes = [{ id: "n1", body: "Carrier asked for financials", author_name: "Sam Staff", created_at: "2026-05-02T10:00:00Z" }];
  apiMock.mockReset();
  apiMock.mockImplementation(async (path: string, init?: { method?: string; body?: { body: string } }) => {
    if (path === NOTES && init?.method === "POST") {
      notes = [...notes, { id: "n2", body: init.body?.body, author_name: "Me", created_at: "2026-05-03T10:00:00Z" }];
      return { ok: true };
    }
    if (path === NOTES) return { notes };
    return { id: "app1", stage: "new", source_type: "public", guarantor_name: "G", guarantor_email: "g@x.com", business_name: "Biz", lender_name: null, data: {}, docs_review_required: false, all_docs_accepted: false, submission_locked: false };
  });
});

describe("BI NotesTab (item 91)", () => {
  it("shows each note with its author and date", async () => {
    render(<NotesTab applicationId="app1" />);
    expect(screen.getByText(/loading notes/i)).toBeInTheDocument();
    const row = await screen.findByTestId("bi-app-note");
    expect(row).toHaveTextContent("Carrier asked for financials");
    expect(row).toHaveTextContent("Sam Staff");
    expect(row.querySelector("time")?.getAttribute("dateTime")).toBe("2026-05-02T10:00:00Z");
  });

  it("posts {body} and shows the new note", async () => {
    render(<NotesTab applicationId="app1" />);
    await screen.findByTestId("bi-app-note");
    fireEvent.change(screen.getByLabelText("Add a note"), { target: { value: "  Sent financials  " } });
    fireEvent.click(screen.getByRole("button", { name: "Add note" }));
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith(NOTES, { method: "POST", body: { body: "Sent financials" } }));
    await waitFor(() => expect(screen.getAllByTestId("bi-app-note")).toHaveLength(2));
    expect(screen.getByLabelText("Add a note")).toHaveValue("");
  });

  it("shows load and save errors", async () => {
    apiMock.mockRejectedValueOnce(new Error("notes_unavailable"));
    render(<NotesTab applicationId="app1" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("notes_unavailable");
  });

  it("shows a save error without losing the draft", async () => {
    render(<NotesTab applicationId="app1" />);
    await screen.findByTestId("bi-app-note");
    apiMock.mockRejectedValueOnce(new Error("too_long"));
    fireEvent.change(screen.getByLabelText("Add a note"), { target: { value: "draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Add note" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("too_long");
    expect(screen.getByLabelText("Add a note")).toHaveValue("draft");
  });

  it("is a tab on the BI application detail", async () => {
    render(
      <MemoryRouter initialEntries={["/silo/bi/pipeline/app1?tab=notes"]}>
        <Routes>
          <Route path="/silo/bi/pipeline/:id" element={<BIApplicationDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("button", { name: "Notes" })).toBeInTheDocument();
    expect(await screen.findByTestId("bi-app-note")).toHaveTextContent("Carrier asked for financials");
  });
});
