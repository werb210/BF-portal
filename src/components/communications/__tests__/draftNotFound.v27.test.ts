// BF_PORTAL_DRAFT_NOT_FOUND_v27
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const src = readFileSync(
  path.join(process.cwd(), "src/components/communications/O365ComposeModal.tsx"),
  "utf8",
);

const saveDraft = src.slice(
  src.indexOf("async function saveDraft"),
  src.indexOf("function normalizeDraftRecipients"),
);
const loadDraft = src.slice(
  src.indexOf("async function loadDraft"),
  src.indexOf("async function discardDraft"),
);

describe("a draft that Outlook no longer has stops the autosave loop", () => {
  it("saveDraft recognises the 409 the server now sends", () => {
    expect(saveDraft).toContain('e?.status === 409 || e?.message === "draft_not_found"');
  });

  it("saveDraft drops the dead id rather than retrying it", () => {
    const branch = saveDraft.slice(saveDraft.indexOf('e?.status === 409'));
    expect(branch).toContain("setDraftId(null);");
    expect(branch).toContain("setAutosaveStopped(true);");
  });

  it("saveDraft clears the stale saved-at time so the label cannot lie", () => {
    const branch = saveDraft.slice(saveDraft.indexOf('e?.status === 409'));
    expect(branch).toContain("setDraftSavedAt(null);");
  });

  it("the autosave effect honours the stop flag", () => {
    expect(src).toContain("|| autosaveStopped) return;");
    expect(src).toContain("composeSending, savingDraft, autosaveStopped]);");
  });

  it("does not silently recreate the draft, which would duplicate a sent email", () => {
    const branch = saveDraft.slice(saveDraft.indexOf('e?.status === 409'), saveDraft.indexOf("} else {"));
    expect(branch).not.toContain("saveDraft()");
    expect(branch).not.toContain('api<any>("/api/o365/mail/draft"');
  });

  it("an explicit save re-arms autosave", () => {
    const success = saveDraft.slice(saveDraft.indexOf("if (id) {"), saveDraft.indexOf("} catch"));
    expect(success).toContain("setAutosaveStopped(false);");
  });

  it("opening a stale draft from the dropdown removes it from the list", () => {
    expect(loadDraft).toContain('e?.status === 409 || e?.message === "draft_not_found"');
    expect(loadDraft).toContain("prev.filter((item) => item.id !== nextDraftId)");
  });

  it("reopening the composer clears the stop flag", () => {
    expect(src).toContain("setAutosaveStopped(false); // BF_PORTAL_DRAFT_NOT_FOUND_v27");
  });
});
