import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const { post } = vi.hoisted(() => ({ post: vi.fn(async () => ({ ok: true })) }));

vi.mock("@/api", () => ({
  api: {
    get: vi.fn(async () => ({ items: [], queues: [] })),
    post,
  },
}));
vi.mock("../MarketingT", async () => {
  const { createElement } = await import("react");
  return { default: () => createElement("div", null, "Apollo") };
});
vi.mock("@/components/marketing/BrandedEmailComposer", async () => {
  const { createElement } = await import("react");
  return { default: () => createElement("div", null, "Email") };
});
vi.mock("@/components/marketing/SequenceCanvas", async () => {
  const { createElement } = await import("react");
  return {
    default: ({ onSave }: { onSave: (steps: Array<Record<string, unknown>>) => void }) => createElement(
      "button",
      { type: "button", onClick: () => onSave([{ type: "email" }]) },
      "Save sequence",
    ),
  };
});

import BIMarketing from "../BIMarketing";

describe("BI sequence names", () => {
  beforeEach(() => post.mockClear());

  it("does not post an unnamed sequence", () => {
    render(createElement(BIMarketing));
    fireEvent.click(screen.getByRole("tab", { name: "Sequences" }));
    fireEvent.click(screen.getByRole("button", { name: "Save sequence" }));

    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText("Sequence name is required.")).toBeInTheDocument();
  });

  it("sends the trimmed name with the sequence steps", async () => {
    render(createElement(BIMarketing));
    fireEvent.click(screen.getByRole("tab", { name: "Sequences" }));
    fireEvent.change(screen.getByLabelText("Sequence name"), { target: { value: "  Renewal follow-up  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save sequence" }));

    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/v1/bi/marketing/sequences", {
      name: "Renewal follow-up",
      steps: [{ type: "email" }],
    }));
  });
});
