import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CreateCompanyModal from "@/pages/crm/companies/CreateCompanyModal";

const { apiMock } = vi.hoisted(() => {
  const mock = { get: vi.fn(), post: vi.fn() };
  return { apiMock: mock };
});

vi.mock("@/api", () => ({ api: apiMock }));

describe("CreateCompanyModal", () => {
  it("shows required error for empty name", async () => {
    apiMock.get.mockResolvedValue([]);
    render(<CreateCompanyModal onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Company name is required")).toBeInTheDocument();
  });

  it("posts expected body when valid", async () => {
    apiMock.get.mockResolvedValue([]);
    apiMock.post.mockResolvedValue({});
    render(<CreateCompanyModal onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Acme" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith("/api/companies", expect.objectContaining({ name: "Acme" })));
  });
});
