// BF_PORTAL_SHEETS_v41 - three sheets hardcoded their own values and never
// read the tokens v40 set, so they stayed off-brand.
import { describe, it, expect } from "vitest";
import fs from "fs";

const SHEETS = {
  "lender.css": fs.readFileSync("src/styles/lender.css", "utf8"),
  "light-inputs.css": fs.readFileSync("src/styles/light-inputs.css", "utf8"),
  "MessageThread.css": fs.readFileSync("src/components/messaging/MessageThread.css", "utf8"),
};
const BI_THEME = fs.readFileSync("src/styles/bi-theme.css", "utf8");

describe("the three sheets are on brand", () => {
  for (const [name, css] of Object.entries(SHEETS)) {
    it(`${name} dropped the generic blues and greys`, () => {
      expect(css).not.toContain("#2563eb");
      expect(css).not.toContain("#1d4ed8");
      expect(css).not.toContain("#cbd6e2");
      expect(css).not.toContain("#64748b");
    });
  }

  it("lender.css keeps its success green", () => {
    expect(SHEETS["lender.css"]).toContain("#166534");
  });

  it("message bubbles use mist and navy", () => {
    expect(SHEETS["MessageThread.css"]).toContain("#F5F8FC");
    expect(SHEETS["MessageThread.css"]).toContain("#0B1F3A");
  });
});

describe("status colours are left alone", () => {
  it("bi-theme.css still maps emerald, sky and purple for light mode", () => {
    expect(BI_THEME).toContain("#047857");
    expect(BI_THEME).toContain("#0369a1");
    expect(BI_THEME).toContain("#6d28d9");
  });
});
