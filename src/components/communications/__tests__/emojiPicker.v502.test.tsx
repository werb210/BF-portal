// BF_PORTAL_BLOCK_v502_EMOJI_PICKER
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, vi } from "vitest";
import EmojiPicker, { EMOJIS } from "../EmojiPicker";

describe("v502 emoji picker", () => {
  it("opens, inserts the picked emoji and closes", () => {
    const onPick = vi.fn();
    render(createElement(EmojiPicker, { onPick }));
    fireEvent.mouseDown(screen.getByTestId("emoji-picker-button"));
    expect(screen.getByTestId("emoji-picker-panel")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText(`Insert ${EMOJIS[10]}`));
    expect(onPick).toHaveBeenCalledWith(EMOJIS[10]);
    expect(screen.queryByTestId("emoji-picker-panel")).toBeNull();
  });

  it("is on all four composers", () => {
    const page = readFileSync(resolve(__dirname, "../../../pages/communications/CommunicationsPage.tsx"), "utf8");
    const email = readFileSync(resolve(__dirname, "../O365ComposeModal.tsx"), "utf8");
    expect(page.match(/<EmojiPicker /g)?.length).toBe(3);
    expect(email).toContain('document.execCommand("insertText", false, emoji)');
  });
});
