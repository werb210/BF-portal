// BF_PORTAL_v803_MENTIONS - an @mention in Team chat lands in the bell with who mentioned you.
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/api", () => ({
  api: vi.fn(async () => ({ items: [
    { id: "n1", type: "mention", title: "Todd Werboweski mentioned you in #deals", body: "@Andrew can you call TFG?", context_url: "/communications?tab=team&channel=ch-1", is_read: false, created_at: "2026-10-14T15:00:00Z" },
    { id: "n2", type: "mention", title: null, body: "@Andrew see note", context_url: "/applications/a1", is_read: false, created_at: "2026-10-14T14:00:00Z" },
  ] })),
}));

import { useServerNotifications } from "../useServerNotifications";
import { useNotificationsStore } from "@/state/notifications.store";

describe("v803 mention notifications in the bell", () => {
  it("shows who mentioned you and links to the conversation", async () => {
    renderHook(() => useServerNotifications(60_000));
    await waitFor(() => expect(useNotificationsStore.getState().notifications.some((n) => n.id === "n1")).toBe(true));
    const items = useNotificationsStore.getState().notifications;
    const team = items.find((n) => n.id === "n1")!;
    expect(team).toMatchObject({ title: "Todd Werboweski mentioned you in #deals", type: "new_message", url: "/communications?tab=team&channel=ch-1", read: false });
    expect(items.find((n) => n.id === "n2")!.title).toBe("You were mentioned");
  });
});
