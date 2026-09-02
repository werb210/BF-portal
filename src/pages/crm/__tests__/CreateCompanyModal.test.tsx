import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CreateCompanyModal from "@/pages/crm/companies/CreateCompanyModal";

const { apiMock } = vi.hoisted(() => ({ apiMock: { post: vi.fn(), get: vi.fn() } }));
vi.mock("@/api", () => ({ api: apiMock }));

describe("CreateCompanyModal", () => {
  window.alert = vi.fn();

  it("renders all expected fields by label", () => {
    render(<CreateCompanyModal onClose={() => {}} />);
    const expected = ["Company Name", "Business Name (DBA)", "Business Legal Name", "Estimated Yearly Revenue", "Business Start Date"];
    const text = document.body.textContent ?? "";
    expected.forEach((label) => expect(text).toContain(label));
  });

  it("submit with empty name keeps Save disabled", () => {
    render(<CreateCompanyModal onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("posts /api/companies with expected body shape", async () => {
    apiMock.post.mockResolvedValue({ id: "cmp-1", name: "Acme" });
    render(<CreateCompanyModal onClose={() => {}} />);
    const textboxes = screen.getAllByRole("textbox");
    const companyNameInput = textboxes[0];
    if (!companyNameInput) throw new Error("Expected company name input");
    fireEvent.change(companyNameInput, { target: { value: "Acme" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith("/api/companies", expect.objectContaining({ name: "Acme", address_country: "CA" })));
  });
});
