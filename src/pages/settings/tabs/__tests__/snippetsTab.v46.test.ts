// BF_PORTAL_SNIPPETS_TAB_v46
import { describe, it, expect } from "vitest";
import fs from "fs";

const TAB = fs.readFileSync("src/pages/settings/tabs/SnippetsSettings.tsx", "utf8");
const PAGE = fs.readFileSync("src/pages/settings/SettingsPage.tsx", "utf8");

describe("a snippet can be created", () => {
  it("has name, text and shortcut", () => {
    expect(TAB).toContain('placeholder="Personal net worth request"');
    expect(TAB).toContain('placeholder="pnw"');
    expect(TAB).toContain("Snippet text");
  });
  it("shows the # outside the field so nobody types it in", () => {
    expect(TAB).toContain('<span style={{ fontSize: 18, color: "var(--ui-text-muted)" }}>#</span>');
  });
  it("previews the trigger back to the author", () => {
    expect(TAB).toContain("Type <strong>#{preview}</strong> then a space");
  });
  it("refuses to save without a shortcut", () => {
    expect(TAB).toContain('A snippet needs a shortcut - the word you type after #.');
  });
});

describe("the shortcut cannot hold something illegal", () => {
  it("strips the hash, punctuation and case as you type", () => {
    expect(TAB).toContain("function cleanShortcut");
    expect(TAB).toContain('replace(/^#+/, "")');
    expect(TAB).toContain('replace(/[^a-z0-9_-]/gi, "")');
    expect(TAB).toContain("slice(0, 40)");
  });
  it("cleans on change, not only on save", () => {
    expect(TAB).toContain("shortcut: cleanShortcut(e.target.value)");
  });
});

describe("personalisation is picked, not memorised", () => {
  it("loads the catalogue from the server", () => {
    expect(TAB).toContain('"/api/templates/merge-fields"');
  });
  it("inserts at the caret rather than appending", () => {
    expect(TAB).toContain("function insertToken");
    expect(TAB).toContain("el.selectionStart");
    expect(TAB).toContain("body.slice(0, start) + token + body.slice(end)");
  });
  it("hides itself when the catalogue is unavailable", () => {
    expect(TAB).toContain("{fields.length > 0 ? (");
  });
});

describe("it is wired into settings", () => {
  it("appears as its own tab", () => {
    expect(PAGE).toContain('id: "snippets"');
    expect(PAGE).toContain("<SnippetsSettings />");
  });
  it("is available in BI as well as BF", () => {
    expect(PAGE).toContain('{ id: "snippets", label: "Snippets", visible: true');
  });
});

describe("it saves as a snippet", () => {
  it("sets the flag the server needs", () => {
    expect(TAB).toContain("is_snippet: true");
  });
  it("is channel-agnostic, so one shortcut works everywhere", () => {
    expect(TAB).toContain('channel: "message"');
  });
});
