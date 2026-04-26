import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CreateCompanyModal from "@/pages/crm/companies/CreateCompanyModal";

const { apiMock } = vi.hoisted(() => ({ apiMock: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/api", () => ({ api: apiMock }));

describe("CreateCompanyModal", () => {
  window.alert = vi.fn();

  it("keeps save disabled when company name is empty", () => {
    render(<CreateCompanyModal onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("posts expected body when valid", async () => {
    apiMock.post.mockResolvedValue({});
    render(<CreateCompanyModal onClose={() => {}} />);
    const nameInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(nameInput, { target: { value: "Acme" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith("/api/companies", expect.objectContaining({ name: "Acme" })));
  });
});
