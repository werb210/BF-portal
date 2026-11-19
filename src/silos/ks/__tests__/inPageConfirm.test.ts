// BF_PORTAL_IN_PAGE_CONFIRM_v1 - Keystone actions confirm in the page, not with the browser's confirm() pop-up.
import { describe, expect, it, vi } from "vitest";
import { confirmAction } from "../ksUi";

describe("in-page confirmation", () => {
  it("never calls window.confirm and resolves with the button pressed", async () => {
    const native = vi.spyOn(window, "confirm");
    const yes = confirmAction("Save these changes?");
    const dialog = document.querySelector('[data-testid="confirm-dialog"]')!;
    expect(dialog.textContent).toContain("Save these changes?");
    (dialog.querySelector("button:last-child") as HTMLButtonElement).click();
    await expect(yes).resolves.toBe(true);
    const no = confirmAction("Purge?");
    (document.querySelector('[data-testid="confirm-dialog"] button') as HTMLButtonElement).click();
    await expect(no).resolves.toBe(false);
    expect(native).not.toHaveBeenCalled();
    expect(document.querySelector('[data-testid="confirm-dialog"]')).toBeNull();
  });
  it("Escape cancels", async () => {
    const p = confirmAction("Rotate key?");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await expect(p).resolves.toBe(false);
  });
});
