// BF_PORTAL_BLOCK_v630_LENDER_PURBECK_RENDER_v1
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const src = fs.readFileSync(
  path.resolve(__dirname, "../LenderApplicationForm.tsx"),
  "utf8",
);

describe("LenderApplicationForm (v630) — Purbeck alignment", () => {
  it("drops the 3 risk booleans (bankruptcy/insolvency/judgment_history)", () => {
    expect(src).not.toMatch(/bankruptcy_history/);
    expect(src).not.toMatch(/insolvency_history/);
    expect(src).not.toMatch(/judgment_history/);
  });

  it("uses the nested wire shape (guarantor, business, loan, financials)", () => {
    expect(src).toMatch(/guarantor:\s*{/);
    expect(src).toMatch(/business:\s*{/);
    expect(src).toMatch(/loan:\s*{/);
    expect(src).toMatch(/financials:\s*{/);
  });

  it("contains declarations object with all 11 section keys", () => {
    for (const k of ["section_1_a","section_1_2","section_2_a","section_2_b","section_2_c","section_2_d","section_3_a","section_3_c","section_4_a","section_5_a","section_6_a"]) {
      expect(src).toMatch(new RegExp(k));
    }
  });

  it("Quebec is removed from province dropdown", () => {
    expect(src).toMatch(/PROVINCES_NO_QC/);
    expect(src).not.toMatch(/value="QC"/);
  });

  it("q_ca_loan_type is restricted to 2 eligible values", () => {
    expect(src).toMatch(/Commercial Mortgage/);
    expect(src).toMatch(/Other Secured Loan/);
    expect(src).not.toMatch(/Asset Finance/);
    expect(src).not.toMatch(/Invoice Finance/);
  });

  it("submits to bi-server lender route", () => {
    expect(src).toMatch(/\/api\/v1\/bi\/lender\/applications/);
  });

  it("validates 1M caps client-side", () => {
    expect(src).toMatch(/LOAN_AMOUNT_MAX\s*=\s*1_000_000/);
    expect(src).toMatch(/PGI_LIMIT_MAX\s*=\s*1_000_000/);
  });

  it("does NOT submit co_guarantors (handled separately via BI silo)", () => {
    expect(src).toMatch(/co_guarantors:\s*\[\]/);
  });
});
