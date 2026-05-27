// BF_PORTAL_BLOCK_v629_BI_PURBECK_RENDER_v1
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ApplicationTab from "../ApplicationTab";

function baseApp(overrides: Record<string, unknown> = {}) {
  return {
    id: "app-1",
    public_id: "ABC123",
    guarantor_name: "Sarah Chen",
    business_name: "Maple Leaf Technologies Inc.",
    loan_amount: 500000,
    pgi_limit: 250000,
    q_ca_loan_type: "Commercial Mortgage",
    q_business_province: "ON",
    declarations: { section_1_a: "yes", section_1_2: "no" },
    loan_agreement_uploaded_at: null,
    pgi_application_id: null,
    status: "in_progress",
    has_co_guarantors: false,
    ...overrides,
  } as any;
}

describe("ApplicationTab (v629)", () => {
  it("renders director / business / loan sections with new q-keys", () => {
    render(<ApplicationTab app={baseApp({ source_type: "public", stage: "document_review" })} />);
    expect(screen.getByText(/Director \/ Guarantor/)).toBeInTheDocument();
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
    expect(screen.getByText("Maple Leaf Technologies Inc.")).toBeInTheDocument();
    expect(screen.getByText("Commercial Mortgage")).toBeInTheDocument();
  });

  it("shows carrier eligibility issues banner for Quebec", () => {
    render(<ApplicationTab app={baseApp({ q_business_province: "QC" })} />);
    expect(screen.getByText(/Quebec/)).toBeInTheDocument();
    expect(screen.getByText(/Carrier eligibility issues/)).toBeInTheDocument();
  });

  it("shows carrier eligibility issues banner for 1M+ loan", () => {
    render(<ApplicationTab app={baseApp({ loan_amount: 1_500_000 })} />);
    expect(screen.getByText(/exceeds the 1,000,000 cap/)).toBeInTheDocument();
  });

  it("shows carrier eligibility issues for ineligible loan type", () => {
    render(<ApplicationTab app={baseApp({ q_ca_loan_type: "Asset Finance" })} />);
    expect(screen.getByText(/'Asset Finance' is not eligible/)).toBeInTheDocument();
  });

  it("renders 'Not collected yet' for missing q_ca_id_type/q_ca_id_number", () => {
    render(<ApplicationTab app={baseApp()} />);
    const notCollected = screen.getAllByText(/Not collected yet/);
    expect(notCollected.length).toBeGreaterThanOrEqual(2);
  });

  it("renders auto-submit hint for public document-review applications", () => {
    render(<ApplicationTab app={baseApp()} />);
    expect(screen.getByText(/automatically forwarded to PGI/i)).toBeInTheDocument();
    expect(screen.queryByText(/Send to Purbeck/i)).not.toBeInTheDocument();
  });

  
  it("falls back to legacy columns when q-keyed columns are absent", () => {
    render(<ApplicationTab app={baseApp({ q_ca_loan_type: undefined, q_business_province: undefined, business_province: "AB", loan_purpose: "Commercial Mortgage" })} />);
    expect(screen.getByText("AB")).toBeInTheDocument();
  });
});
