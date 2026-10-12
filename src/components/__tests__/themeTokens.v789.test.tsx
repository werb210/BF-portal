// BF_PORTAL_v789_CONTRAST - the shortcut sheet and the live chat queue draw with theme tokens, so they
// stay readable in the dark theme (the default) as well as the light one.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/api", () => ({ default: { get: vi.fn(async () => [{ id: "1", name: "Pat", email: "pat@example.com", lastMessage: "Hi" }]) } }));

import ShortcutHelp from "@/components/ShortcutHelp";
import LiveChatQueuePage from "@/pages/admin/LiveChatQueuePage";

describe("theme tokens (items 80, 81)", () => {
  it("ShortcutHelp's panel uses the surface and text tokens, not #fff", () => {
    render(<ShortcutHelp open onClose={() => {}} />);
    const panel = screen.getByRole("heading", { name: "Keyboard shortcuts" }).parentElement as HTMLElement;
    expect(panel.style.background).toBe("var(--ui-surface-strong)");
    expect(panel.style.color).toBe("var(--ui-text)");
  });

  it("LiveChatQueuePage cards use the token utilities instead of bg-white", async () => {
    render(<LiveChatQueuePage />);
    const name = await screen.findByText("Pat");
    const card = name.parentElement as HTMLElement;
    expect(card.className).toContain("bg-ui-surface");
    expect(card.className).not.toContain("bg-white");
    expect(screen.getByText("pat@example.com").className).toContain("text-ui-muted");
  });
});
