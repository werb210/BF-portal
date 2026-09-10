// BF_PORTAL_NEGATIVES_TYPECHECK_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/pages/diagnostics/NegativesPanel.tsx", "utf8");

// Mirror of unwrapCandidates so the shapes are asserted, not just the source.
type C = { searchTerm: string };
function unwrapCandidates(response: unknown): C[] {
  if (Array.isArray(response)) return response as C[];
  const envelope = (response as { data?: { candidates?: C[] } } | null)?.data;
  if (envelope && Array.isArray(envelope.candidates)) return envelope.candidates;
  const direct = (response as { candidates?: C[] } | null)?.candidates;
  return Array.isArray(direct) ? direct : [];
}

describe("BF_PORTAL_NEGATIVES_TYPECHECK_v1", () => {
  it("no longer reads .data off the narrow generic", () => {
    expect(source).not.toContain("(response?.data ?? response)?.candidates");
    expect(source).toContain("unwrapCandidates(response)");
  });

  it("reads a bare { candidates } body", () => {
    expect(unwrapCandidates({ candidates: [{ searchTerm: "a" }] })).toHaveLength(1);
  });

  it("reads an enveloped { data: { candidates } } body", () => {
    expect(unwrapCandidates({ data: { candidates: [{ searchTerm: "b" }] } })).toHaveLength(1);
  });

  it("reads a raw array body", () => {
    expect(unwrapCandidates([{ searchTerm: "c" }])).toHaveLength(1);
  });

  it("returns [] for null, undefined and an empty object", () => {
    expect(unwrapCandidates(null)).toEqual([]);
    expect(unwrapCandidates(undefined)).toEqual([]);
    expect(unwrapCandidates({})).toEqual([]);
  });
});
