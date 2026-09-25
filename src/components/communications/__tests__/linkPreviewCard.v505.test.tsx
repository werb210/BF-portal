// BF_PORTAL_BLOCK_v505_TEAM_LINK_PREVIEW_CARD
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/api", () => ({
  api: vi.fn(async () => ({ preview: { url: "https://boreal.financial/", ok: true, title: "Boreal Financial", description: "Business financing", imageUrl: null, siteName: "boreal.financial" } })),
}));

import LinkPreviewCard, { firstLink } from "../LinkPreviewCard";

describe("v505 Team link preview card", () => {
  it("finds the first link and trims trailing punctuation", () => {
    expect(firstLink("see https://boreal.financial/rates, thanks")).toBe("https://boreal.financial/rates");
    expect(firstLink("no link here")).toBeNull();
  });

  it("renders the preview for a message with a link", async () => {
    render(createElement(LinkPreviewCard, { text: "look https://boreal.financial/" }));
    expect(await screen.findByTestId("link-preview-card")).toBeInTheDocument();
    expect(screen.getByText("Boreal Financial")).toBeInTheDocument();
  });

  it("renders nothing without a link", () => {
    const { container } = render(createElement(LinkPreviewCard, { text: "hello team" }));
    expect(container.innerHTML).toBe("");
  });
});
