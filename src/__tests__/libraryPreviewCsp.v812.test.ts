// BF_PORTAL_v812_LIBRARY_PREVIEW_CSP - the Staff Library preview panel shows Microsoft's file viewer (SharePoint /
// Office online) in a frame and plays Library videos from SharePoint. Both must be allowed by the portal's policy,
// and nothing wider (no bare https: or *) may be opened up.
import { describe, expect, it } from "vitest";
import rootConfig from "../../staticwebapp.config.json";
import publicConfig from "../../public/staticwebapp.config.json";

function directive(csp: string, name: string): string[] {
  const part = csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `));
  return part ? part.split(/\s+/).slice(1) : [];
}

describe("Staff Library preview is allowed by the portal policy", () => {
  for (const [name, cfg] of [["root", rootConfig], ["public", publicConfig]] as const) {
    const csp: string = (cfg as any).globalHeaders["Content-Security-Policy"];
    it(`${name}: frames from SharePoint and Office online`, () => {
      const frames = directive(csp, "frame-src");
      expect(frames).toEqual(expect.arrayContaining(["https://*.sharepoint.com", "https://*.officeapps.live.com", "https://onedrive.live.com"]));
      expect(frames).not.toContain("https:");
      expect(frames).not.toContain("*");
    });
    it(`${name}: videos from SharePoint`, () => {
      const media = directive(csp, "media-src");
      expect(media).toContain("https://*.sharepoint.com");
      expect(media).not.toContain("https:");
    });
  }
  it("both copies stay identical", () => {
    expect(publicConfig.globalHeaders["Content-Security-Policy"]).toBe(rootConfig.globalHeaders["Content-Security-Policy"]);
  });
});
