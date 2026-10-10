// BF_PORTAL_DEAD_PAGES_v781
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

describe("broken pages and unused files are gone", () => {
  it("the three old chat pages are no longer routed", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    for (const p of ['path="/chat"', 'path="/ai-chat"', 'path="/ai-comms"', "AiCommsPage", "AIChatDashboard"]) expect(app).not.toContain(p);
    expect(app).toContain('path="/portal/ai"');
  });
  it("unused files are deleted", () => {
    for (const f of ["src/pages/AiCommsPage.tsx", "src/pages/AIChatDashboard.tsx", "src/components/AIChatSessionView.tsx", "src/api/aiChat.ts", "src/api/ai.ts",
      "src/components/layout/Sidebar.tsx", "src/components/email/EmailViewer.tsx", "src/pages/admin/AIKnowledgeManager.tsx", "src/services/aiService.ts",
      "src/components/CallHistoryTab.tsx", "src/components/CallDispositionPicker.tsx"]) expect(existsSync(f)).toBe(false);
  });
});
