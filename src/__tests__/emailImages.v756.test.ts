// BF_PORTAL_EMAIL_IMAGES_v756 - emails are rendered inside the portal page, so the portal's Content-Security-Policy
// decides which images load. img-src only allowed Boreal's own servers, so every logo, signature or picture an email
// pulls from the sender's site was blocked (broken-image box). Images may now load from any https address; scripts,
// connections and frames stay locked to the same short list as before.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const csp: string = JSON.parse(readFileSync("staticwebapp.config.json", "utf8")).globalHeaders["Content-Security-Policy"];
const directive = (name: string) => (csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(name + " ")) ?? "");

describe("email images load in the portal", () => {
  it("img-src allows https images from senders' sites", () => {
    expect(directive("img-src").split(/\s+/)).toContain("https:");
  });
  it("nothing else is opened up", () => {
    expect(directive("script-src")).not.toMatch(/\shttps:(\s|$)/);
    expect(directive("connect-src")).not.toMatch(/\shttps:(\s|$)/);
    expect(directive("frame-src")).not.toMatch(/\shttps:(\s|$)/);
    expect(directive("default-src")).toBe("default-src 'self'");
  });
});
