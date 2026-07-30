import { describe, expect, it } from "vitest";
import { safeInternalPath } from "../safeInternalPath";

describe("BF_PORTAL_NAV_GUARD_v1", () => {
  it("accepts ordinary in-app paths", () => {
    expect(safeInternalPath("/crm/contacts")).toBe("/crm/contacts");
    expect(safeInternalPath("/pipeline?stage=new#top")).toBe("/pipeline?stage=new#top");
    expect(safeInternalPath("  /calendar  ")).toBe("/calendar");
  });

  it("rejects protocol-relative targets", () => {
    expect(safeInternalPath("//example.com/pwned")).toBeNull();
    expect(safeInternalPath("///example.com")).toBeNull();
  });

  it("rejects backslash variants the router used to reinterpret", () => {
    expect(safeInternalPath("/\\example.com")).toBeNull();
    expect(safeInternalPath("/crm\\..\\out")).toBeNull();
  });

  it("rejects absolute and scheme-bearing targets", () => {
    expect(safeInternalPath("https://example.com")).toBeNull();
    expect(safeInternalPath("javascript:alert(1)")).toBeNull();
    expect(safeInternalPath("crm/contacts")).toBeNull();
  });

  it("rejects control characters and non-strings", () => {
    expect(safeInternalPath("/crm\u0000/x")).toBeNull();
    expect(safeInternalPath("/crm\nx")).toBeNull();
    expect(safeInternalPath(null)).toBeNull();
    expect(safeInternalPath(undefined)).toBeNull();
    expect(safeInternalPath(42)).toBeNull();
  });
});
