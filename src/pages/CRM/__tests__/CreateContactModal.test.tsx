import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CreateContactModal from "@/pages/crm/contacts/CreateContactModal";

const { apiMock } = vi.hoisted(() => ({ apiMock: { post: vi.fn(), get: vi.fn() } }));
vi.mock("@/api", () => ({ api: apiMock }));

describe("CreateContactModal", () => {
  window.alert = vi.fn();

  it("renders main + role + company fields", async () => {
    apiMock.get.mockResolvedValue([]);
    render(<CreateContactModal onClose={() => {}} />);
    await waitFor(() => expect(apiMock.get).toHaveBeenCalled());
    const text = document.body.textContent ?? "";
    ["First Name", "Last Name", "Email", "SSN / SIN", "Role", "Company"].forEach((label) => expect(text).toContain(label));
  });

  it("masks SSN on blur", () => {
    apiMock.get.mockResolvedValue([]);
    render(<CreateContactModal onClose={() => {}} />);
    const label = screen.getByText("SSN / SIN");
    const ssn = label.closest("label")?.querySelector("input") as HTMLInputElement;
    fireEvent.focus(ssn);
    fireEvent.change(ssn, { target: { value: "123456789" } });
    fireEvent.blur(ssn);
    expect(ssn.value).toBe("•••-••-6789");
  });

  it("submits to /api/crm/contacts with default role unknown", async () => {
    apiMock.get.mockResolvedValue([]);
    apiMock.post.mockResolvedValue({});
    render(<CreateContactModal onClose={() => {}} />);
    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[0], { target: { value: "Jane" } });
    fireEvent.change(textboxes[1], { target: { value: "Doe" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith("/api/crm/contacts", expect.objectContaining({ first_name: "Jane", last_name: "Doe", role: "unknown" })));
  });
});
