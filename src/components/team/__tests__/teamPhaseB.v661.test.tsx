// BF_PORTAL_TEAM_PHASE_B_v661
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const calls = vi.hoisted(() => ({ get: [] as string[], post: [] as Array<[string, any]> }));
vi.mock("@/api", () => {
  const get = vi.fn(async (url: string) => {
    calls.get.push(url);
    if (url.endsWith("/channels/browse")) return { channels: [
      { id: "c1", name: "deals", topic: "Live deals", is_private: false, archived_at: null, member_count: 3, is_member: false },
      { id: "c2", name: "leads", topic: null, is_private: true, archived_at: null, member_count: 2, is_member: true },
    ] };
    if (url.includes("/threads/")) return { root: { id: "r1", channel_id: "c1", sender_id: "u2", body: "Who can take **Accord**?", created_at: "2026-09-28T10:00:00Z" }, replies: [{ id: "x1", channel_id: "c1", sender_id: "u1", body: "I can", created_at: "2026-09-28T10:01:00Z", thread_root_id: "r1" }] };
    return {};
  });
  const post = vi.fn(async (url: string, body: any) => {
    calls.post.push([url, body]);
    if (url.includes("/threads/")) return { message: { id: "x2", channel_id: "c1", sender_id: "u1", body: body.body, created_at: "2026-09-28T10:02:00Z", thread_root_id: "r1" }, summary: { reply_count: 2, last_reply_at: "2026-09-28T10:02:00Z", participant_ids: ["u1"] } };
    return { ok: true };
  });
  return { api: Object.assign(get, { post, patch: vi.fn(async () => ({})), put: vi.fn(async () => ({})), delete: vi.fn(async () => ({})) }) };
});

import { applyFormat, renderTeamText } from "@/components/team/teamFormat";
import { emojiFromCode, emojiGroups, searchEmojis } from "@/components/team/FullEmojiPicker";
import ChannelBrowser from "@/components/team/ChannelBrowser";
import ThreadPanel from "@/components/team/ThreadPanel";

describe("formatting", () => {
  it("renders bold, italic, strike, code, lists, code blocks, links and mentions", () => {
    const { container } = render(<div>{renderTeamText("**Big** _news_ ~old~ " + String.fromCharCode(96) + "x=1" + String.fromCharCode(96) + " @Pat Lee see https://boreal.financial\n- one\n- two\n1. first\n2. second\n" + "\u0060\u0060\u0060\nconst a = 1;\n\u0060\u0060\u0060", ["Pat Lee"])}</div>);
    expect(container.querySelector("strong")?.textContent).toBe("Big");
    expect(container.querySelector("em")?.textContent).toBe("news");
    expect(container.querySelector("s")?.textContent).toBe("old");
    expect(container.querySelector("code")?.textContent).toBe("x=1");
    expect(container.querySelectorAll("ul li")).toHaveLength(2);
    expect(container.querySelectorAll("ol li")).toHaveLength(2);
    expect(container.querySelector("pre")?.textContent).toBe("const a = 1;");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("https://boreal.financial");
    expect(container.textContent).toContain("@Pat Lee");
  });
  it("toolbar wraps the selection or turns lines into a list", () => {
    expect(applyFormat("hello world", 6, 11, "bold")).toEqual({ value: "hello **world**", start: 8, end: 13 });
    expect(applyFormat("a\nb", 0, 3, "bullet").value).toBe("- a\n- b");
    expect(applyFormat("- a\n- b", 0, 7, "numbered").value).toBe("1. a\n2. b");
    expect(applyFormat("x", 1, 1, "italic").value).toBe("x__");
  });
});

describe("full emoji picker", () => {
  it("has every group with search by name, flags and emoji presentation", () => {
    const groups = emojiGroups();
    expect(groups.map((g) => g.group)).toEqual(["Smileys & Emotion", "People & Body", "Animals & Nature", "Food & Drink", "Activities", "Travel & Places", "Objects", "Symbols", "Flags"]);
    expect(groups.reduce((n, g) => n + g.emojis.length, 0)).toBeGreaterThan(1400);
    expect(emojiFromCode("ca")).toBe("\u{1F1E8}\u{1F1E6}");
    expect(emojiFromCode("2764")).toBe("\u2764\uFE0F");
    expect(searchEmojis("thumb up").map((e) => e.char)).toContain("\u{1F44D}");
    expect(searchEmojis("canada").map((e) => e.char)).toContain("\u{1F1E8}\u{1F1E6}");
  });
});

describe("channel browser", () => {
  it("lists channels with topics and joins a public one", async () => {
    const opened = vi.fn();
    render(<ChannelBrowser onClose={() => undefined} onOpen={opened} onCreate={() => undefined} />);
    await screen.findByText(/Live deals/);
    fireEvent.click(screen.getByText("Join"));
    await waitFor(() => expect(opened).toHaveBeenCalledWith("c1"));
    expect(calls.post.some(([u]) => u === "/api/team/channels/c1/join")).toBe(true);
    expect(screen.getByText("Open")).toBeTruthy();
  });
});

describe("thread panel", () => {
  it("shows the root and replies, and sends a reply", async () => {
    const onSummary = vi.fn();
    render(<ThreadPanel channelId="c1" rootId="r1" nameOf={() => "Pat"} memberNames={[]} myId="u1" live={null} onClose={() => undefined} onSummary={onSummary} />);
    await screen.findByText("Accord");
    expect(screen.getByText("1 reply")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Reply in thread"), { target: { value: "On it" } });
    fireEvent.keyDown(screen.getByLabelText("Reply in thread"), { key: "Enter" });
    await screen.findByText("On it");
    expect(onSummary).toHaveBeenCalledWith("r1", expect.objectContaining({ reply_count: 2 }));
  });
});
