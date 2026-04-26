import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ContactDetailPage from "../ContactDetailPage";

vi.mock("@/api/crm", () => ({
  crmApi: { getContact: vi.fn().mockResolvedValue({ id: "c1", name: "Jane Doe", phone: "+15551234567", created_at: new Date().toISOString() }) },
}));

describe("Contact detail call button", () => {
  it("dispatches bf:dialer-call", async () => {
    const spy = vi.spyOn(window, "dispatchEvent");
    render(<MemoryRouter initialEntries={["/crm/contacts/c1"]}><Routes><Route path="/crm/contacts/:id" element={<ContactDetailPage />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("Jane Doe")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Call" }));
    const evt = spy.mock.calls.find((c) => (c[0] as CustomEvent).type === "bf:dialer-call")?.[0] as CustomEvent;
    expect(evt.detail.phone).toBe("+15551234567");
  });
});
