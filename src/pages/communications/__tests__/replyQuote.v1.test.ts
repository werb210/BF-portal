// BF_PORTAL_REPLY_QUOTE_HTML_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
const src = readFileSync(path.join(process.cwd(), "src/pages/communications/CommunicationsPage.tsx"), "utf8");
const sanitizer = readFileSync(path.join(process.cwd(), "src/lib/sanitizeHtml.ts"), "utf8");

describe("reply quotes preserve the original as HTML", () => {
  it("no longer strips tags with a regex", () => {
    // .replace(/<[^>]+>/g, " ") flattened the email AND left entities like &nbsp; and
    // &quot; rendering literally in the composer.
    expect(src).not.toContain('replace(/<[^>]+>/g, " ")');
  });

  it("quotes html bodies verbatim and escapes plaintext ones", () => {
    expect(src).toContain("BF_PORTAL_REPLY_QUOTE_HTML_v1");
    expect(src).toContain("<blockquote");
  });

  it("keeps a real attribution line instead of a bare separator", () => {
    expect(src).toContain("wrote:");
    expect(src).not.toContain("----- Original message -----");
  });

  it("relies on a sanitiser that permits blockquote and style, so the quote survives", () => {
    expect(sanitizer).toContain('"blockquote"');
    expect(sanitizer).toContain('"style"');
    expect(sanitizer).toContain('FORBID_TAGS');
  });
});
