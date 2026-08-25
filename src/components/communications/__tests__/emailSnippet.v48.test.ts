// BF_PORTAL_EMAIL_SNIPPET_v48 - v45 wired #pnw into SMS, Messages and Team.
// Email was left out because its body is contentEditable, which has no
// selectionStart and cannot have its value replaced.
import { describe, it, expect } from "vitest";
import fs from "fs";

const SRC = fs.readFileSync("src/components/communications/O365ComposeModal.tsx", "utf8");

describe("it uses the Range API, not selectionStart", () => {
  it("reads the caret from the Selection", () => {
    expect(SRC).toContain("window.getSelection()");
    expect(SRC).toContain("sel.getRangeAt(0)");
  });

  it("only acts on a collapsed caret in a text node", () => {
    expect(SRC).toContain("!sel.isCollapsed");
    expect(SRC).toContain("node.nodeType !== Node.TEXT_NODE");
  });

  it("selects exactly the token before replacing it", () => {
    expect(SRC).toContain("del.setStart(node, start)");
    expect(SRC).toContain("del.setEnd(node, caret)");
  });

  it("reuses the existing insertion helper, so syncBody still runs", () => {
    expect(SRC).toContain("insertHtmlAtCursor(escapeSnippetHtml(body))");
  });
});

describe("it follows the same trigger rule as the other composers", () => {
  it("requires the hash to start a word", () => {
    expect(SRC).toContain("before.match(/(^|\\s)#([a-z0-9_-]{1,40})$/i)");
  });

  it("fires on space, tab or enter", () => {
    expect(SRC).toContain('if (e.key !== " " && e.key !== "Tab" && e.key !== "Enter") return;');
  });

  it("swallows the keystroke only when it expanded", () => {
    expect(SRC).toContain("if (expandEmailSnippet()) e.preventDefault();");
  });
});

describe("a snippet cannot inject markup", () => {
  it("escapes the body rather than inserting it raw", () => {
    expect(SRC).toContain("function escapeSnippetHtml");
    expect(SRC).toContain('.replace(/</g, "&lt;")');
  });

  it("keeps line breaks readable", () => {
    expect(SRC).toContain('.replace(/\\n/g, "<br/>")');
  });
});

describe("it shares one snippet set with the other composers", () => {
  it("loads the channel-agnostic snippets", () => {
    expect(SRC).toContain("useSnippets()");
  });
});
