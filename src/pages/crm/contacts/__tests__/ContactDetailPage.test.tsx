import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ContactDetailPage from "../ContactDetailPage";

vi.mock("@/api/crm", () => ({
  crmApi: {
    getContact: vi.fn().mockResolvedValue({
      id: "c1", name: "Jane Doe", email: "jane@example.com", phone: "+15551234567",
      created_at: new Date().toISOString(),
    }),
    timeline: vi.fn().mockResolvedValue([]),
    sharedMailboxes: vi.fn().mockResolvedValue({ mine: null, shared: [] }),
  },
}));

describe("ContactDetailPage", () => {
  it("renders contact name and the action bar", async () => {
    render(
      <MemoryRouter initialEntries={["/crm/contacts/c1"]}>
        <Routes>
          <Route path="/crm/contacts/:id" element={<ContactDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("Jane Doe")).toBeInTheDocument());
    ["Note", "Email", "Call", "SMS", "Task", "Meeting"].forEach((label) => {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    });
  });
});
