import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MessageThread, { type ThreadMessage } from "../MessageThread";

const messages: ThreadMessage[] = [
  { id: "1", authorRole: "other", authorName: "Todd", body: "Welcome!", createdAt: "2026-04-30T10:00:00Z" },
  { id: "2", authorRole: "self",  authorName: "John", body: "Please complete #networth and upload statements.", createdAt: "2026-04-30T10:05:00Z" },
];

describe("MessageThread", () => {
  it("renders messages in chronological order with sender on the right", () => {
    render(<MessageThread messages={messages} />);
    const rows = document.querySelectorAll(".msg-row");
    expect(rows.length).toBe(2);
    expect(rows[0].classList.contains("msg-row--left")).toBe(true);
    expect(rows[1].classList.contains("msg-row--right")).toBe(true);
  });

  it("renders #hashtag as a tappable button and fires onHashtagClick", () => {
    const onClick = vi.fn();
    render(<MessageThread messages={messages} onHashtagClick={onClick} />);
    const chip = screen.getByRole("button", { name: /networth/i });
    fireEvent.click(chip);
    expect(onClick).toHaveBeenCalledWith("#networth", "Networth");
  });

  it("shows empty state when no messages", () => {
    render(<MessageThread messages={[]} emptyText="Nothing yet" />);
    expect(screen.getByText("Nothing yet")).toBeTruthy();
  });
});
