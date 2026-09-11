// BF_PORTAL_ERROR_REPORTING_v1
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/authToken", () => ({ getAuthToken: () => "tok" }));

const { reportError, shouldReport, __resetErrorReporter } = await import("../errorReporter");

beforeEach(() => {
__resetErrorReporter();
vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true } as Response)));
});
afterEach(() => vi.unstubAllGlobals());

describe("error reporting is safe to leave switched on", () => {
it("collapses a repeating error to one report", () => {
const stack = "Error: x\n at Foo (bundle.js:1:1)";
expect(shouldReport("x", stack, 0)).toBe(true);
// A render loop throws hundreds of times a second.
expect(shouldReport("x", stack, 500)).toBe(false);
expect(shouldReport("x", stack, 61_000)).toBe(true);
});

it("caps reports per session so a loop cannot flood the endpoint", () => {
for (let i = 0; i < 25; i += 1) reportError("runtime", new Error(`distinct-${i}`));
expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(20);
});

it("never throws when the network is unavailable", () => {
vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
expect(() => reportError("runtime", new Error("boom"))).not.toThrow();
});

it("never throws when fetch itself is missing", () => {
vi.stubGlobal("fetch", undefined);
expect(() => reportError("runtime", new Error("boom"))).not.toThrow();
});

it("sends the detail needed to locate the failure", () => {
reportError("boundary", new Error("kaboom"));
const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
expect(url).toBe("/api/client/issues");
const body = JSON.parse(String((init as RequestInit).body));
expect(body).toMatchObject({ source: "boundary", message: "kaboom" });
expect(body.stack).toContain("kaboom");
});

it("handles a non-Error rejection value", () => {
// unhandledrejection often carries a string or an object, not an Error.
expect(() => reportError("unhandledrejection", "just a string")).not.toThrow();
});
});
