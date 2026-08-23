// BF_PORTAL_SNIPPETS_v44 - shortcut expansion is the part that saves time, so
// it is tested as behaviour rather than by reading the source.
import { describe, it, expect } from "vitest";
import fs from "fs";
import { expandShortcut, snippetBody } from "../../../hooks/useSnippets";

const PULLDOWNS = fs.readFileSync("src/components/communications/ComposerPulldowns.tsx", "utf8");

const SNIPPETS = [
  { id: "1", name: "Thanks", shortcut: "thanks", body_text: "Thanks for your patience." },
  { id: "2", name: "Docs", shortcut: "docs", body_html: "Please send <b>bank statements</b>." },
];

describe("shortcut expansion", () => {
  it("replaces the token in place", () => {
    const r = expandShortcut("/thanks", 7, SNIPPETS);
    expect(r?.value).toBe("Thanks for your patience.");
    expect(r?.caret).toBe(25);
  });

  it("works mid-sentence and keeps what follows the caret", () => {
    const r = expandShortcut("Hi Todd. /thanks Speak soon.", 16, SNIPPETS);
    expect(r?.value).toBe("Hi Todd. Thanks for your patience. Speak soon.");
  });

  it("strips markup, so a snippet cannot paste HTML into an SMS", () => {
    const r = expandShortcut("/docs", 5, SNIPPETS);
    expect(r?.value).toBe("Please send bank statements.");
  });

  it("ignores an unknown shortcut", () => {
    expect(expandShortcut("/nope", 5, SNIPPETS)).toBeNull();
  });

  it("ignores a slash that is not the start of a word", () => {
    expect(expandShortcut("and/thanks", 10, SNIPPETS)).toBeNull();
  });

  it("ignores a slash after the caret", () => {
    expect(expandShortcut("/thanks later", 13, SNIPPETS)).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(expandShortcut("/THANKS", 7, SNIPPETS)?.value).toBe("Thanks for your patience.");
  });
});

describe("body selection", () => {
  it("prefers plain text", () => {
    expect(snippetBody({ id: "x", name: "n", body_text: "plain", body_html: "<b>rich</b>" }))
      .toBe("plain");
  });

  it("converts line breaks rather than dropping them", () => {
    expect(snippetBody({ id: "x", name: "n", body_html: "one<br>two" })).toBe("one\ntwo");
  });
});

describe("the dropdown", () => {
  it("keeps snippets out of the template list", () => {
    expect(PULLDOWNS).toContain("is_snippet?: boolean }).is_snippet !== true");
  });

  it("shows the shortcut so people learn it", () => {
    expect(PULLDOWNS).toContain("`/${snippet.shortcut} — ${snippet.name}`");
  });

  it("hides itself when there are none", () => {
    expect(PULLDOWNS).toContain("snippets.length > 0 ? (");
  });
});
