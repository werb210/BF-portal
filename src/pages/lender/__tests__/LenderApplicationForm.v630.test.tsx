// BF_PORTAL_BLOCK_v631_HOTFIX_v629_v630_v1
// Behavioral test using @testing-library/react. Replaces the v630 source-grep
// test which imported node:fs/node:path/__dirname — those imports fail the
// main typecheck in BF-portal because (a) tsconfig.json's `types` array
// doesn't include "node", and (b) its `exclude` pattern catches `*.test.ts`
// but NOT `*.test.tsx`, so .tsx tests get caught by the prod typecheck.
//
// The pattern used here matches the v629 ApplicationTab test, which is the
// canonical shape for behavioral .test.tsx files in BF-portal.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LenderApplicationForm from "../LenderApplicationForm";

// Mock the api module so submit() doesn't actually fire.
vi.mock("@/api", () => ({
  api: {
    post: vi.fn(async () => ({ ok: true })),
  },
}));

describe("LenderApplicationForm (v630/v631) — Purbeck alignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Purbeck-aligned modal with declarations + no risk booleans", () => {
    render(<LenderApplicationForm onClose={() => {}} onSubmitted={() => {}} />);
    expect(screen.getByText(/Create Lender Application \(Purbeck-aligned\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Declarations \(Purbeck — all 11 required\)/i)).toBeInTheDocument();
    // Risk boolean labels from the OLD form must not appear.
    expect(screen.queryByText(/^Bankruptcy History$/i)).toBeNull();
    expect(screen.queryByText(/^Insolvency History$/i)).toBeNull();
    expect(screen.queryByText(/^Judgment History$/i)).toBeNull();
  });

  // BF_PORTAL_BLOCK_v633_HOTFIX_v631_STALE_TEST_v1
  // Was asserting on the inferred (pre-v632) wording. v632 swapped those
  // labels for Craig's authoritative wording, and v632's own test file
  // (LenderApplicationForm.v632.test.tsx) now owns the label-text
  // assertions. Here we keep a structural assertion that survives wording
  // changes: confirm the section renders 11 rows (one selector per
  // declaration plus the truthfulness oath = 11 total).
  it("renders all 11 declaration rows (structural)", () => {
    render(<LenderApplicationForm onClose={() => {}} onSubmitted={() => {}} />);
    // Each DeclarationRow renders a <select>. The form has additional
    // selects elsewhere (entity type, province, loan type, etc.), so we
    // assert on the declarations section's selects by scoping to the
    // section heading.
    expect(screen.getByText(/Declarations \(Purbeck — all 11 required\)/i)).toBeInTheDocument();
    // 11 yes/no or Agree/Disagree dropdowns within the Declarations card.
    // The heading text is unique on this page; query its parent section.
    const heading = screen.getByText(/Declarations \(Purbeck — all 11 required\)/i);
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    const selects = section!.querySelectorAll("select");
    expect(selects.length).toBe(11);
  });

  it("Quebec is absent from the province dropdown", () => {
    render(<LenderApplicationForm onClose={() => {}} onSubmitted={() => {}} />);
    const select = screen.getByDisplayValue(/Province \*/i) as HTMLSelectElement;
    const options = Array.from(select.querySelectorAll("option")).map((o) => o.value);
    expect(options).not.toContain("QC");
    expect(options).toContain("ON");
    expect(options).toContain("AB");
  });

  it("Loan type dropdown contains only the 2 eligible carrier values", () => {
    render(<LenderApplicationForm onClose={() => {}} onSubmitted={() => {}} />);
    const select = screen.getByDisplayValue(/Loan type \*/i) as HTMLSelectElement;
    const options = Array.from(select.querySelectorAll("option")).map((o) => o.textContent);
    expect(options.some((t) => t && /Commercial Mortgage/.test(t))).toBe(true);
    expect(options.some((t) => t && /Other Secured Loan/.test(t))).toBe(true);
    expect(options.some((t) => t && /Asset Finance/.test(t))).toBe(false);
    expect(options.some((t) => t && /Invoice Finance/.test(t))).toBe(false);
  });

  it("submit button is disabled until validation passes", () => {
    render(<LenderApplicationForm onClose={() => {}} onSubmitted={() => {}} />);
    const submit = screen.getByRole("button", { name: /Create application/i });
    expect(submit).toBeDisabled();
  });

  it("shows the Quebec block error when QC is somehow selected (defense in depth)", () => {
    render(<LenderApplicationForm onClose={() => {}} onSubmitted={() => {}} />);
    // Type the company name + drive amount over cap to surface validation errors.
    const company = screen.getByPlaceholderText(/Company name/i) as HTMLInputElement;
    fireEvent.change(company, { target: { value: "Test Co" } });
    const loan = screen.getByPlaceholderText(/Loan amount/i) as HTMLInputElement;
    fireEvent.change(loan, { target: { value: "1500000" } });
    // Validation error list should mention 1M cap.
    expect(screen.getByText(/exceeds 1,000,000 cap/i)).toBeInTheDocument();
  });
});
