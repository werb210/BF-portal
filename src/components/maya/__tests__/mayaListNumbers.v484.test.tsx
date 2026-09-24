// BF_PORTAL_BLOCK_v484_MAYA_LIST_NUMBERS
import { render } from "@testing-library/react";
import { createElement } from "react";
import { describe, it, expect } from "vitest";
import { MayaMessage } from "../mayaMarkdown";

describe("v484 Maya lists keep their markers", () => {
  it("numbered list renders with decimal markers", () => {
    const { container } = render(createElement(MayaMessage, { message: "Steps:\n1. Upload statements\n2. Sign the form" }));
    const ol = container.querySelector("ol");
    expect(ol).not.toBeNull();
    expect((ol as HTMLElement).style.listStyleType).toBe("decimal");
    expect(ol!.querySelectorAll("li").length).toBe(2);
  });
  it("bulleted list renders with disc markers", () => {
    const { container } = render(createElement(MayaMessage, { message: "- Term loans\n- Lines of credit" }));
    expect((container.querySelector("ul") as HTMLElement).style.listStyleType).toBe("disc");
  });
});
