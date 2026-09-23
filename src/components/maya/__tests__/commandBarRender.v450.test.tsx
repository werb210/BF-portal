// BF_PORTAL_COMMAND_BAR_RENDER_v450
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const bar = readFileSync(
  path.join(root, "src/components/maya/MayaCommandBar.tsx"), "utf8");
const chat = readFileSync(
  path.join(root, "src/components/maya/MayaChat.tsx"), "utf8");

describe("v450 the sidebar command box renders replies", () => {
  it("routes assistant replies through the renderer", () => {
    expect(bar).toContain("<MayaMessage message={reply} />");
    expect(bar).toContain('import { MayaMessage } from "./mayaMarkdown"');
  });

  it("leaves the operator's own text as plain textarea content", () => {
    expect(bar).toContain("value={text}");
    expect(bar).not.toContain("<MayaMessage message={text} />");
  });

  it("both Maya surfaces in this repo use the same renderer", () => {
    // v439 covered MayaChat; the box staff actually use was missed until v450.
    expect(chat).toContain("MayaMessage");
    expect(bar).toContain("MayaMessage");
  });
});
