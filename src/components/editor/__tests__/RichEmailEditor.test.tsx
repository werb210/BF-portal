// BF_PORTAL_TEMPLATE_RICH_EDITOR_v1
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import RichEmailEditor, { styleEditorLists, toEditorHtml } from "../RichEmailEditor";

describe("rich email editor", () => {
  it("has list, formatting, link and meeting-button controls", () => {
    render(<RichEmailEditor value="" onChange={() => undefined} docKey="a" />);
    for (const name of ["Bold", "Italic", "Underline", "Bulleted list", "Numbered list", "Insert link", "Clear formatting", "Add meeting button"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
    expect(screen.getByLabelText("Text style")).toBeTruthy();
  });
  it("opens an old plain-text template with its line breaks kept, and HTML as HTML", () => {
    expect(toEditorHtml("Hi {{first_name}},\nThanks <3")).toBe("Hi {{first_name}},<br>Thanks &lt;3");
    expect(toEditorHtml("<ul><li>One</li></ul>")).toBe("<ul><li>One</li></ul>");
    render(<RichEmailEditor value={"Line one\nLine two"} onChange={() => undefined} docKey="b" />);
    expect(screen.getByRole("textbox", { name: "Email body" }).innerHTML).toBe("Line one<br>Line two");
  });
  it("reports typed content and gives lists visible markers", () => {
    let out = "";
    render(<RichEmailEditor value="" onChange={(h) => { out = h; }} docKey="c" />);
    const box = screen.getByRole("textbox", { name: "Email body" });
    box.innerHTML = "<ul><li>Point</li></ul>";
    fireEvent.input(box);
    expect(out).toContain("list-style-type: disc");
    const div = document.createElement("div");
    div.innerHTML = "<ol><li>a</li></ol>";
    styleEditorLists(div);
    expect((div.firstChild as HTMLElement).style.listStyleType).toBe("decimal");
  });
});
