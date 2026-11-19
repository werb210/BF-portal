// BF_PORTAL_IN_PAGE_CONFIRM_v1 - the portal's one "are you sure?" box. The browser's own confirm() freezes the page (and
// the iPad app's web view), cannot be styled, and showed raw values. This draws an in-page dialog and resolves true
// (Confirm) or false (Cancel, Escape or a click outside).
//
// Tests that stub window.confirm (vi.spyOn / vi.fn) keep working: when window.confirm is a test double, it answers.

type MaybeMock = { mock?: unknown };

export function confirmAction(message: string, opts: { confirmLabel?: string; danger?: boolean } = {}): Promise<boolean> {
  if (typeof document === "undefined" || typeof window === "undefined") return Promise.resolve(false);
  const native = window.confirm as unknown as MaybeMock | undefined;
  if (native && typeof native === "function" && (native as MaybeMock).mock) {
    return Promise.resolve(Boolean((window.confirm as (m?: string) => boolean)(message)));
  }
  return new Promise<boolean>((resolve) => {
    const overlay = document.createElement("div");
    overlay.setAttribute("data-testid", "confirm-dialog");
    overlay.style.cssText = "position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px";
    const box = document.createElement("div");
    box.setAttribute("role", "alertdialog");
    box.setAttribute("aria-modal", "true");
    box.style.cssText = "background:var(--ui-surface-strong,#fff);color:var(--ui-text,#0f172a);border-radius:12px;max-width:440px;width:100%;padding:20px;box-shadow:0 20px 40px rgba(0,0,0,.25);font-size:14px;line-height:1.5";
    const text = document.createElement("p");
    text.style.cssText = "margin:0 0 16px;white-space:pre-wrap";
    text.textContent = message;
    const row = document.createElement("div");
    row.style.cssText = "display:flex;justify-content:flex-end;gap:8px";
    const cancel = document.createElement("button");
    cancel.type = "button"; cancel.textContent = "Cancel";
    cancel.style.cssText = "padding:8px 14px;border-radius:8px;border:1px solid var(--ui-border,#cbd5e1);background:transparent;color:inherit;cursor:pointer";
    const ok = document.createElement("button");
    ok.type = "button"; ok.textContent = opts.confirmLabel ?? "Confirm";
    ok.style.cssText = `padding:8px 14px;border-radius:8px;border:0;background:${opts.danger ? "#b91c1c" : "var(--accent,#0b1f3a)"};color:#fff;font-weight:600;cursor:pointer`;
    const done = (answer: boolean) => { document.removeEventListener("keydown", onKey); overlay.remove(); resolve(answer); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") done(false); if (e.key === "Enter") done(true); };
    cancel.onclick = () => done(false);
    ok.onclick = () => done(true);
    overlay.onclick = (e) => { if (e.target === overlay) done(false); };
    document.addEventListener("keydown", onKey);
    row.append(cancel, ok); box.append(text, row); overlay.append(box); document.body.append(overlay);
    ok.focus();
  });
}

export default confirmAction;
