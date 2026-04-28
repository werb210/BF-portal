// BI_NOTES_UI_v47 — behavior test for BI Notes list.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BINotesList from "../pipeline/BINotesList";

const listBINotesMock = vi.fn();
const createBINoteMock = vi.fn();
const updateBINoteMock = vi.fn();
const deleteBINoteMock = vi.fn();

vi.mock("../api/biNotes", () => ({
  listBINotes: (...args: unknown[]) => listBINotesMock(...args),
  createBINote: (...args: unknown[]) => createBINoteMock(...args),
  updateBINote: (...args: unknown[]) => updateBINoteMock(...args),
  deleteBINote: (...args: unknown[]) => deleteBINoteMock(...args),
}));

describe("BI_NOTES_UI_v47 BINotesList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listBINotesMock.mockResolvedValue({
      ok: true,
      items: [
        {
          id: "n-1",
          application_id: "app-1",
          body: "Initial note",
          owner_user_id: null,
          mentions: [],
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    createBINoteMock.mockResolvedValue({ ok: true });
    updateBINoteMock.mockResolvedValue({ ok: true });
    deleteBINoteMock.mockResolvedValue({ ok: true });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("has draft, add, edit, delete affordances", async () => {
    render(<BINotesList applicationId="app-1" />);

    expect(await screen.findByTestId("bi-note-draft")).toBeInTheDocument();
    expect(screen.getByTestId("bi-note-add")).toBeInTheDocument();
    expect(await screen.findByTestId("bi-note-n-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("creates, edits, and deletes notes", async () => {
    render(<BINotesList applicationId="app-1" />);
    await screen.findByTestId("bi-note-draft");

    fireEvent.change(screen.getByTestId("bi-note-draft"), { target: { value: "New note" } });
    fireEvent.click(screen.getByTestId("bi-note-add"));
    await waitFor(() => {
      expect(createBINoteMock).toHaveBeenCalledWith("app-1", "New note");
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const editTextarea = screen.getByDisplayValue("Initial note");
    fireEvent.change(editTextarea, { target: { value: "Updated note" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(updateBINoteMock).toHaveBeenCalledWith("app-1", "n-1", "Updated note");
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(deleteBINoteMock).toHaveBeenCalledWith("app-1", "n-1");
    });
  });
});
