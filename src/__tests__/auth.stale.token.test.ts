import { describe, expect, it } from "vitest";

function isValidUuidToken(token: string | null): boolean {
  if (!token) return false;

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return false;

    const payload = JSON.parse(atob(payloadB64));
    return UUID_REGEX.test(payload?.sub ?? "");
  } catch {
    return false;
  }
}

function fakeToken(sub: string): string {
  const payload = btoa(JSON.stringify({ sub, role: "Staff" }));
  return `header.${payload}.signature`;
}

describe("stale token detection", () => {
  it("rejects old test-mode token sub", () => {
    expect(isValidUuidToken(fakeToken("test-user:+15878881837"))).toBe(false);
  });

  it("rejects empty sub", () => {
    expect(isValidUuidToken(fakeToken(""))).toBe(false);
  });

  it("rejects phone-number sub", () => {
    expect(isValidUuidToken(fakeToken("+15878881837"))).toBe(false);
  });

  it("accepts valid UUID sub", () => {
    expect(isValidUuidToken(fakeToken("00000000-0000-0000-0000-000000000099"))).toBe(true);
  });

  it("returns false for null token", () => {
    expect(isValidUuidToken(null)).toBe(false);
  });
});
