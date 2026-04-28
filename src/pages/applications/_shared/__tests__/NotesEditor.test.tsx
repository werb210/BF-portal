// @ts-nocheck
// BF_NOTES_UI_v49 — file-content contract test.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const editor = fs.readFileSync(path.resolve(__dirname, "../NotesEditor.tsx"), "utf8");
const drawer = fs.readFileSync(path.resolve(__dirname, "../../drawer/tab-notes/NotesTab.tsx"), "utf8");
const detail = fs.readFileSync(path.resolve(__dirname, "../../tabs/NotesTab.tsx"), "utf8");
const apiF   = fs.readFileSync(path.resolve(__dirname, "../../../../api/applicationNotes.ts"), "utf8");

describe("BF_NOTES_UI_v49 NotesEditor", () => {
  it("renders draft + add button + list", () => {
    expect(editor).toContain('data-testid="note-draft"');
    expect(editor).toContain('data-testid="add-note-btn"');
    expect(editor).toContain('data-testid="notes-list"');
  });
  it("supports edit + delete per note", () => {
    expect(editor).toMatch(/data-testid=\{`edit-/);
    expect(editor).toMatch(/data-testid=\{`delete-/);
  });
  it("highlights @mention tokens", () => {
    expect(editor).toContain("renderBodyWithMentions");
  });
});

describe("BF_NOTES_UI_v49 shells", () => {
  it("drawer shell delegates to NotesEditor", () => {
    expect(drawer).toContain("NotesEditor");
    expect(drawer).toContain("BF_NOTES_UI_v49");
  });
  it("detail-page shell takes applicationId prop", () => {
    expect(detail).toContain("applicationId");
    expect(detail).toContain("NotesEditor");
  });
});

describe("BF_NOTES_UI_v49 api/applicationNotes.ts", () => {
  it("targets /api/applications/:id/notes endpoints", () => {
    expect(apiF).toContain("/api/applications/");
    expect(apiF).toContain("listApplicationNotes");
    expect(apiF).toContain("createApplicationNote");
    expect(apiF).toContain("updateApplicationNote");
    expect(apiF).toContain("deleteApplicationNote");
  });
});
