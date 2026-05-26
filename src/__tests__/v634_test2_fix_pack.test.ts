// BF_PORTAL_BLOCK_v634_TEST2_FIX_PACK_v1
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const root = path.resolve(__dirname, "..");
const r = (p: string) => fs.readFileSync(path.resolve(root, p), "utf8");

const stub = r("components/pipeline/ApplicationCard.tsx");
const types = r("core/engines/pipeline/pipeline.types.ts");
const card = r("core/engines/pipeline/PipelineCard.tsx");

describe("v634 — ApplicationCard placeholder neutralized (H)", () => {
  it("throws on render to prevent accidental use", () => {
    expect(stub).toMatch(/throw new Error[\s\S]+deprecated/);
    expect(stub).toMatch(/Use PipelineCard/);
  });
  it("no hardcoded 'No documents uploaded' string remains", () => {
    expect(stub).not.toMatch(/No documents uploaded/);
    expect(stub).not.toMatch(/No notes yet/);
  });
});

describe("v634 — PipelineApplication has optional country (N)", () => {
  it("country field present on type", () => {
    expect(types).toMatch(/country\?:\s*string/);
  });
});

describe("v634 — formatAmount derives currency from country (N)", () => {
  it("pickCurrency helper exists", () => {
    expect(card).toMatch(/const pickCurrency/);
  });
  it("Canada maps to CAD, default to USD", () => {
    expect(card).toMatch(/c === "ca"[\s\S]*return "CAD"/);
    expect(card).toMatch(/return "USD"/);
  });
  it("formatAmount accepts country as second arg", () => {
    expect(card).toMatch(/formatAmount = \(value\?: number, country\?: string\)/);
  });
  it("call sites pass card.country", () => {
    expect(card).toMatch(/formatAmount\(card\.requestedAmount,\s*card\.country\)/);
  });
});
