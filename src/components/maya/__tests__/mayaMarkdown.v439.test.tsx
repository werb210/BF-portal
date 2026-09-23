// BF_PORTAL_MAYA_MARKDOWN_v439
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MayaMessage, toBlocks } from "../mayaMarkdown";

describe("v439 the staff Maya panel renders replies", () => {
  it("renders bold instead of asterisks", () => {
    render(<MayaMessage message="**Equipment Financing**: $20,000 to $3,000,000" />);
    expect(screen.getByText("Equipment Financing").tagName).toBe("STRONG");
  });

  it("renders a link instead of the bracket syntax", () => {
    render(<MayaMessage message="open it [here](https://staff.boreal.financial/pipeline)" />);
    expect(screen.getByRole("link", { name: "here" }))
      .toHaveAttribute("href", "https://staff.boreal.financial/pipeline");
  });

  it("refuses a non-http scheme", () => {
    render(<MayaMessage message="tap [here](javascript:alert(1))" />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("breaks an inline numbered run into a list", () => {
    const blocks = toBlocks("Next: 1. Call the client 2. Request bank statements 3. Send to lenders");
    const ol = blocks.find((b) => b.kind === "ol");
    expect(ol && "items" in ol ? ol.items.length : 0).toBe(3);
  });

  it("leaves an ordinary reply as one paragraph", () => {
    expect(toBlocks("Three applications are stalled at Documents.")).toHaveLength(1);
  });

  it("never renders raw HTML from the model", () => {
    const { container } = render(<MayaMessage message={'<img src=x onerror="alert(1)">'} />);
    expect(container.querySelector("img")).toBeNull();
  });
});
