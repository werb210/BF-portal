// BF_PORTAL_CONDITION_CLIENT_WORDING
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ClientWording } from "../ClientWording";

afterEach(cleanup);
const TITLE = "Executed PG from all principals";
const box = () => screen.getByLabelText(`What the client sees: ${TITLE}`) as HTMLInputElement;

describe("what the client sees for a condition", () => {
  it("shows the plain wording and, when blank, the lender's wording as the hint", () => {
    render(<ClientWording title={TITLE} value="Sign the personal guarantee" onSave={vi.fn()} />);
    expect(box().value).toBe("Sign the personal guarantee");
    cleanup();
    render(<ClientWording title={TITLE} value={null} onSave={vi.fn()} />);
    expect(box().value).toBe("");
    expect(box().placeholder).toBe(TITLE);
    expect(screen.getByText(/Leave blank to show the condition as written/)).toBeTruthy();
  });
  it("saves a change when the field is left, trimmed", () => {
    const onSave = vi.fn();
    render(<ClientWording title={TITLE} value={null} onSave={onSave} />);
    fireEvent.change(box(), { target: { value: "  Sign the guarantee we send you  " } });
    fireEvent.blur(box());
    expect(onSave).toHaveBeenCalledWith("Sign the guarantee we send you");
  });
  it("clearing it saves nothing-set, and leaving it unchanged saves nothing", () => {
    const onSave = vi.fn();
    render(<ClientWording title={TITLE} value="Sign it" onSave={onSave} />);
    fireEvent.blur(box());
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(box(), { target: { value: "" } });
    fireEvent.blur(box());
    expect(onSave).toHaveBeenCalledWith(null);
  });
});
