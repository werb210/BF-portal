// BF_PORTAL_BLOCK_v632_CARRIER_CORRECTIONS_v1
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LenderApplicationForm from "../LenderApplicationForm";

vi.mock("@/api", () => ({ api: { post: vi.fn(async () => ({ ok: true })) } }));

describe("LenderApplicationForm v632 — authoritative wording + ID + $50K", () => {
  it("renders the new declaration wording (not the v630 inferred wording)", () => {
    render(<LenderApplicationForm onClose={() => {}} onSubmitted={() => {}} />);
    expect(screen.getByText(/Have you ever declared personal bankruptcy/i)).toBeInTheDocument();
    expect(screen.getByText(/barred from serving as a Director/i)).toBeInTheDocument();
    expect(screen.getByText(/Canada Revenue Agency or the Canada Border Services Agency/i)).toBeInTheDocument();
    expect(screen.getByText(/insurance coverage for all physical assets/i)).toBeInTheDocument();
    expect(screen.getByText(/all answers above are true/i)).toBeInTheDocument();
    expect(screen.getByText(/As of today, is the company solvent/i)).toBeInTheDocument();
  });
  it("does NOT render the v630 inferred wording (regression)", () => {
    render(<LenderApplicationForm onClose={() => {}} onSubmitted={() => {}} />);
    expect(screen.queryByText(/Personal bankruptcy history$/i)).toBeNull();
    expect(screen.queryByText(/Criminal proceedings/i)).toBeNull();
    expect(screen.queryByText(/Regulatory investigations$/i)).toBeNull();
    expect(screen.queryByText(/Agree to policy terms/i)).toBeNull();
  });
  it("Gov ID dropdown is present", () => {
    render(<LenderApplicationForm onClose={() => {}} onSubmitted={() => {}} />);
    expect(screen.getByText(/Gov ID type \*/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Gov ID number/i)).toBeInTheDocument();
  });
});
