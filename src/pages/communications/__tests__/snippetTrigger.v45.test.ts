// BF_PORTAL_SNIPPET_TRIGGER_v45 - v44 shipped the expansion hook and nothing
// called it, so typing "#pnw" did nothing at all.
import { describe, it, expect } from "vitest";
import fs from "fs";

const SRC = fs.readFileSync("src/pages/communications/CommunicationsPage.tsx", "utf8");

describe("the trigger is attached", () => {
  it("imports the hook", () => {
    expect(SRC).toContain('from "@/hooks/useSnippets"');
    expect(SRC).toContain("useShortcutExpansion");
  });

  for (const name of ["expandSms", "expandMsg", "expandTeam"] as const) {
    it(`${name} is wired to the channel-agnostic snippet list`, () => {
      expect(SRC).toContain(`const ${name}Snippets = useSnippets()`);
      expect(SRC).toContain(`const ${name} = useShortcutExpansion(`);
      expect(SRC).toContain(`${name}(e);`);
    });
  }
});

describe("an expanding keystroke does not also send", () => {
  it("checks defaultPrevented before the send handler", () => {
    // Three composers, three guards.
    expect(SRC.match(/if \(e\.defaultPrevented\) return;/g)?.length).toBe(3);
  });

  it("runs the expansion before the Enter check in each", () => {
    for (const name of ["expandSms", "expandMsg", "expandTeam"]) {
      const at = SRC.indexOf(`${name}(e);`);
      const guard = SRC.indexOf("if (e.defaultPrevented) return;", at);
      expect(guard).toBeGreaterThan(at);
    }
  });
});

describe("the email composer is deliberately excluded", () => {
  it("is not wired here - its body is contentEditable", () => {
    const modal = fs.readFileSync("src/components/communications/O365ComposeModal.tsx", "utf8");
    expect(modal).not.toContain("useShortcutExpansion");
  });
});
