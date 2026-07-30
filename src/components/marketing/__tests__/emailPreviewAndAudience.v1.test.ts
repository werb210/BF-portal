import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("email preview, assets, and audience layout", () => {
  it("keeps both static web app configs identical and permits BI email assets", () => {
    const root = read("staticwebapp.config.json");
    const publicCopy = read("public/staticwebapp.config.json");
    expect(publicCopy).toBe(root);
    const csp = JSON.parse(root).globalHeaders["Content-Security-Policy"] as string;
    const imageSources = csp.match(/img-src ([^;]+)/)?.[1] ?? "";
    expect(imageSources).toContain("https://bi-server-cse0apamgkheb9d5.canadacentral-01.azurewebsites.net");
  });

  it("renders the preview at 600px and scales it into its pane", () => {
    const source = read("src/components/marketing/BrandedEmailComposer.tsx");
    expect(source).toContain("BF_PORTAL_EMAIL_PREVIEW_WIDTH_v1");
    expect(source).toContain("const EMAIL_PREVIEW_WIDTH = 600");
    expect(source).toContain("transformOrigin: \"top left\"");
    expect(source).not.toContain('srcDoc={preview} style={{ width: "100%"');
  });

  it("places independently scrolling include and exclude lists side by side", () => {
    const source = read("src/pages/marketing/MarketingDashboard.tsx");
    expect(source).toContain("BF_PORTAL_SEQ_AUDIENCE_LAYOUT_v1");
    expect(source).toContain("sm:grid-cols-2");
    expect(source.match(/max-h-48 gap-1 overflow-y-auto/g)).toHaveLength(2);
  });
});
