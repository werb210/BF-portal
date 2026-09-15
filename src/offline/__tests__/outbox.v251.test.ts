// BF_PORTAL_OFFLINE_OUTBOX_v251
import { describe, expect, it, vi } from "vitest";
import { dismissFailed, flushOutbox, isQueueablePath, postOrQueue, readOutbox } from "../outbox";

const ID = "11111111-2222-4333-8444-555555555555";
function mem() { const data = new Map<string, string>(); return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) }; }

describe("offline outbox", () => {
  it("only permits the supported additive actions", () => {
    expect(isQueueablePath(`/api/crm/contacts/${ID}/notes`)).toBe(true);
    expect(isQueueablePath("/api/tasks")).toBe(true);
    expect(isQueueablePath(`/api/tasks/${ID}/complete`)).toBe(true);
    expect(isQueueablePath("/api/telephony/calls/CA12/disposition")).toBe(true);
    expect(isQueueablePath("/api/tasks/bulk")).toBe(false);
  });

  it("posts online and queues offline network work", async () => {
    const s = mem(); const post = vi.fn(async () => ({ id: "n1" }));
    expect(await postOrQueue("/api/tasks", { title: "Call" }, "New task", { post, online: true, eligible: true, s })).toEqual({ id: "n1" });
    expect(readOutbox(s)).toHaveLength(0);
    expect(await postOrQueue("/api/tasks", { title: "Call" }, "New task", { post, online: false, eligible: true, s })).toEqual({ queued: true });
    expect(readOutbox(s)[0]).toMatchObject({ path: "/api/tasks", status: "pending" });
  });

  it("replays with an idempotency key and removes successes", async () => {
    const s = mem(); await postOrQueue("/api/tasks", { title: "A" }, "New task", { online: false, eligible: true, s });
    const id = readOutbox(s)[0].id;
    const post = vi.fn(async () => ({ results: [{ id, status: "succeeded", statusCode: 201 }] }));
    expect(await flushOutbox({ post, s })).toEqual({ sent: 1, failed: 0 });
    expect(post).toHaveBeenCalledWith("/api/pwa/sync", { actions: [{ id, method: "POST", path: "/api/tasks", body: { title: "A" }, idempotencyKey: id }] });
    expect(readOutbox(s)).toHaveLength(0);
  });

  it("marks permanent failures and allows dismissing them", async () => {
    const s = mem(); await postOrQueue(`/api/tasks/${ID}/complete`, {}, "Task completed", { online: false, eligible: true, s });
    expect(await flushOutbox({ post: vi.fn(async () => ({ results: [{ status: "failed", statusCode: 404, error: { message: "Task not found" } }] })), s })).toEqual({ sent: 0, failed: 1 });
    expect(readOutbox(s)[0]).toMatchObject({ status: "failed", error: "Task not found" });
    dismissFailed(readOutbox(s)[0].id, s); expect(readOutbox(s)).toHaveLength(0);
  });
});
