// BF_PORTAL_v864_SIGNATURE_BUILDER - brand + details -> email-safe table HTML, live preview, advanced paste.
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import SignatureBuilder from "../SignatureBuilder";
import { buildSignatureHtml, contrast, decodeFields, EMPTY_FIELDS, safeUrl, textColorOn, textColorOnWhite } from "../signatureHtml";

const FIELDS = {
  ...EMPTY_FIELDS,
  name: "Todd Werboweski", title: "Director", company: "Boreal Financial", email: "todd@example.com", phone: "(866) 555-0100",
  website: "boreal.financial", bookingUrl: "https://www.boreal.financial/book-todd", linkedin: "https://linkedin.com/in/todd",
  logoUrl: "https://staff.boreal.financial/images/300_300.png", color: "#1E3A8A",
};

describe("buildSignatureHtml (v864)", () => {
  it("writes tables with inline styles only - no <style>, classes, divs or flexbox", () => {
    const html = buildSignatureHtml(FIELDS);
    expect(html).toContain('<table role="presentation" cellpadding="0" cellspacing="0" border="0"');
    expect(html).not.toMatch(/<style|class=|<div|display:\s*flex/i);
    expect(html).toContain('src="https://staff.boreal.financial/images/300_300.png"');
    expect(html).toContain('width="120"');
    expect(html).toContain('href="tel:8665550100"');
    expect(html).toContain('href="mailto:todd@example.com"');
    expect(html).toContain('href="https://boreal.financial/"');
    expect(html).toContain("Book a meeting");
    expect(html).toContain('href="https://linkedin.com/in/todd"');
  });
  it("escapes values and drops unsafe links", () => {
    const html = buildSignatureHtml({ ...FIELDS, name: '<img src=x onerror="alert(1)">', linkedin: "javascript:alert(1)", logoUrl: "data:image/png;base64,AAA" });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("data:image");
    expect(safeUrl("ftp://x.com")).toBe("");
  });
  it("leaves out empty fields and keeps the fields so the builder can reopen it", () => {
    const html = buildSignatureHtml({ ...EMPTY_FIELDS, name: "Pat" });
    expect(html).not.toContain("Book a meeting");
    expect(html).not.toContain("<img");
    expect(decodeFields(html)?.name).toBe("Pat");
  });
  it("keeps text readable whatever the brand colour", () => {
    expect(textColorOnWhite("#2FA86A")).toBe("#111827"); // BI green fails 4.5:1 on white
    expect(textColorOnWhite("#1E3A8A")).toBe("#1E3A8A");
    for (const c of ["#2FA86A", "#1E3A8A", "#FDE047", "#B45309"]) expect(contrast(c, textColorOn(c))).toBeGreaterThanOrEqual(4.5);
  });
});

function Harness({ html = "", onSave = vi.fn() }: { html?: string; onSave?: (h: string) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <>
      <SignatureBuilder html={html} defaults={{ name: "Todd Werboweski", email: "todd@example.com", company: "Boreal Financial", color: "#1E3A8A", logoUrl: "https://staff.boreal.financial/images/300_300.png" }} onChange={setDraft} label="Email signature" />
      <button type="button" onClick={() => onSave(draft)}>save</button>
    </>
  );
}

describe("SignatureBuilder (v864)", () => {
  it("fills from the profile and brand and previews live as you type", () => {
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);
    expect((screen.getByLabelText("Email signature Name") as HTMLInputElement).value).toBe("Todd Werboweski");
    fireEvent.change(screen.getByLabelText("Email signature Title"), { target: { value: "Director" } });
    expect(screen.getByTestId("sig-preview").textContent).toContain("Director");
    expect(screen.getByTestId("sig-preview").querySelector("img")?.getAttribute("src")).toBe("https://staff.boreal.financial/images/300_300.png");
    fireEvent.click(screen.getByText("save"));
    expect(onSave.mock.calls[0]?.[0]).toContain("Director");
    expect(onSave.mock.calls[0]?.[0]).toContain("<table");
  });
  it("opens a pasted signature in the advanced editor without changing it", () => {
    const onSave = vi.fn();
    render(<Harness html="<p>Old <b>sig</b></p>" onSave={onSave} />);
    expect(screen.getByRole("tab", { name: "Paste your own HTML (advanced)" })).toHaveAttribute("aria-selected", "true");
    expect((screen.getByLabelText("Email signature HTML") as HTMLTextAreaElement).value).toBe("<p>Old <b>sig</b></p>");
    fireEvent.click(screen.getByText("save"));
    expect(onSave).toHaveBeenCalledWith("<p>Old <b>sig</b></p>");
  });
  it("reopens a builder signature in the builder with its fields", () => {
    render(<Harness html={buildSignatureHtml({ ...FIELDS, title: "Partner" })} />);
    expect((screen.getByLabelText("Email signature Title") as HTMLInputElement).value).toBe("Partner");
  });
  it("the preview never runs script from pasted HTML", () => {
    render(<Harness html={'<p>Hi</p><img src="x" onerror="window.__pwned=1"><script>window.__pwned=1</script>'} />);
    const preview = screen.getByTestId("sig-preview");
    expect(preview.innerHTML).not.toContain("onerror");
    expect(preview.innerHTML).not.toContain("<script");
  });
});
