// BF_PORTAL_IN_PAGE_CONFIRM_v1
import { describe, expect, it, vi, afterEach } from "vitest";
import { confirmAction } from "../confirmAction";

describe("confirmAction", () => {
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ""; });
  it("draws an in-page dialog and answers Confirm / Cancel", async () => {
    const yes = confirmAction("Delete it?");
    const dlg = document.querySelector('[data-testid="confirm-dialog"]')!;
    expect(dlg.textContent).toContain("Delete it?");
    (Array.from(dlg.querySelectorAll("button")).find((b) => b.textContent === "Confirm") as HTMLButtonElement).click();
    await expect(yes).resolves.toBe(true);
    const no = confirmAction("Again?");
    (Array.from(document.querySelectorAll('[data-testid="confirm-dialog"] button')).find((b) => b.textContent === "Cancel") as HTMLButtonElement).click();
    await expect(no).resolves.toBe(false);
    expect(document.querySelector('[data-testid="confirm-dialog"]')).toBeNull();
  });
  it("uses a stubbed window.confirm in tests", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await expect(confirmAction("x")).resolves.toBe(true);
    expect(document.querySelector('[data-testid="confirm-dialog"]')).toBeNull();
  });
});
