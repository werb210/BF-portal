// BF_PORTAL_AI_PAGE_v784
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";

const { call, post } = vi.hoisted(() => ({ call: vi.fn(), post: vi.fn() }));
vi.mock("@/api", () => ({ api: Object.assign(call, { post }) }));

import AiLiveChat from "@/modules/ai/AiLiveChat";

describe("AI page", () => {
  beforeEach(() => {
    call.mockReset();
    post.mockReset();
  });

  it("lists Maya conversations and shows a transcript", async () => {
    call.mockImplementation(async (path: string) => {
      if (path === "/api/communications/maya-sessions") {
        return { sessions: [{ id: "s1", source: "website", status: "open", message_count: 2, last_message: "Hi there" }] };
      }
      if (path === "/api/communications/maya-sessions/s1/messages") {
        return { messages: [{ id: "m1", role: "user", message: "Do you fund trucks?" }, { id: "m2", role: "ai", message: "Yes, we do." }] };
      }
      throw new Error("unexpected " + path);
    });
    render(<AiLiveChat />);
    fireEvent.click(await screen.findByText(/website/));
    expect(await screen.findByText("Do you fund trucks?")).toBeInTheDocument();
    expect(screen.getByText("Yes, we do.")).toBeInTheDocument();
  });

  it("shows an error when the conversations cannot load", async () => {
    call.mockRejectedValue(new Error("Server down"));
    render(<AiLiveChat />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load Maya conversations: Server down");
  });

  it("chats through /api/ai/ai/start, /message and /close", async () => {
    call.mockResolvedValue({ sessions: [] });
    post.mockImplementation(async (path: string) => {
      if (path === "/api/ai/ai/start") return { sessionId: "chat-1" };
      if (path === "/api/ai/ai/message") return { reply: "Hello from Maya" };
      if (path === "/api/ai/ai/close") return { success: true };
      throw new Error("unexpected " + path);
    });
    render(<AiLiveChat />);
    fireEvent.change(screen.getByLabelText("Message Maya"), { target: { value: "Hi" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Hello from Maya")).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith("/api/ai/ai/start", expect.anything());
    expect(post).toHaveBeenCalledWith("/api/ai/ai/message", { sessionId: "chat-1", message: "Hi" });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/ai/ai/close", { sessionId: "chat-1" }));
  });

  it("shows an error when Maya cannot reply", async () => {
    call.mockResolvedValue({ sessions: [] });
    post.mockRejectedValue(new Error("Nope"));
    render(<AiLiveChat />);
    fireEvent.change(screen.getByLabelText("Message Maya"), { target: { value: "Hi" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Maya could not reply: Nope");
  });

  it("has no redirect loop, WebSocket or missing endpoints", () => {
    const page = readFileSync("src/pages/ai/AiLiveChatPage.tsx", "utf8");
    const mod = readFileSync("src/modules/ai/AiLiveChat.tsx", "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    expect(page).not.toContain("Navigate");
    for (const gone of ["new WebSocket", "/api/ai/ws", "/api/ai/session/", '"/api/ai/close"']) expect(mod).not.toContain(gone);
  });
});
