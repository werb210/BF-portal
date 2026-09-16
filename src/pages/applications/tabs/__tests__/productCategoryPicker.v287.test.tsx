// BF_PORTAL_PRODUCT_CATEGORY_PICKER_v287
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const post = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock("@/api", () => ({ api: { post } }));

import ProductCategoryPicker, { toCategoryOption } from "../ProductCategoryPicker";

describe("product category picker", () => {
  it("shows the stored category however it was saved", () => {
    expect(toCategoryOption("MCA")).toBe("MERCHANT_CASH_ADVANCE");
    expect(toCategoryOption("Merchant Cash Advance")).toBe("MERCHANT_CASH_ADVANCE");
    expect(toCategoryOption("term")).toBe("TERM_LOAN");
    expect(toCategoryOption(null)).toBe("");
  });

  it("confirms, saves the new category and refreshes the lender matches", async () => {
    const onChanged = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ProductCategoryPicker applicationId="app-1" current="MCA" canEdit onChanged={onChanged} />);
    const select = screen.getByLabelText("Product category") as HTMLSelectElement;
    expect(select.value).toBe("MERCHANT_CASH_ADVANCE");
    fireEvent.change(select, { target: { value: "TERM_LOAN" } });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(post).toHaveBeenCalledWith("/api/applications/app-1/product-category", { category: "TERM_LOAN" });
    expect(String((window.confirm as any).mock.calls[0][0])).toContain("from Merchant Cash Advance to Term Loan");
  });

  it("does nothing when staff cancel, and is read-only without write access", () => {
    post.mockClear();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { rerender } = render(<ProductCategoryPicker applicationId="app-1" current="MCA" canEdit onChanged={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Product category"), { target: { value: "TERM_LOAN" } });
    expect(post).not.toHaveBeenCalled();
    rerender(<ProductCategoryPicker applicationId="app-1" current="MCA" canEdit={false} onChanged={vi.fn()} />);
    expect((screen.getByLabelText("Product category") as HTMLSelectElement).disabled).toBe(true);
  });

  it("is on the Lenders tab in both the matched and the locked views", () => {
    const tab = fs.readFileSync(path.resolve(__dirname, "../LendersTab.tsx"), "utf8");
    expect(tab.match(/<ProductCategoryPicker/g)?.length).toBe(2);
  });
});
