// BF_PORTAL_v852_CALC_QBO - "Calculator" on the application card: opens the loan calculator in a dialog, the amount
// pre-filled from the application's requested amount. Save to file adds the scenario as a note on the application
// (onSaveNote: the BF / SLF notes API, or BI-Server's notes for a BI file).
import { useEffect, useState } from "react";
import LoanCalculator from "./LoanCalculator";
import BasicCalculator from "./BasicCalculator";

export type CalculatorButtonProps = {
  requestedAmount?: number | null;
  title?: string;
  onSaveNote?: (text: string) => Promise<void>;
  /** "dark" for the BI header (white outline button on navy). */
  tone?: "light" | "dark";
};

/** A number from whatever the API sent ("250000", "$250,000.00", 250000). */
export function amountFrom(...candidates: unknown[]): number | null {
  for (const c of candidates) {
    if (c === null || c === undefined || c === "") continue;
    const n = typeof c === "number" ? c : Number(String(c).replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export default function CalculatorButton({ requestedAmount, title, onSaveNote, tone = "light" }: CalculatorButtonProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"loan" | "basic">("loan"); // BF_PORTAL_v950_BASIC_CALCULATOR
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const btn = tone === "dark"
    ? { background: "transparent", color: "#ffffff", border: "1px solid rgba(255,255,255,0.7)" }
    : { background: "#ffffff", color: "#0B1F3A", border: "1px solid #0B1F3A" };
  return (
    <>
      <button type="button" data-testid="open-calculator" onClick={() => setOpen(true)}
        style={{ ...btn, borderRadius: 8, padding: "5px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
        Calculator
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Calculator" data-testid="calculator-dialog"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1300, padding: "4vh 12px", overflowY: "auto" }}>
          <div style={{ background: "#ffffff", color: "#0B1F3A", borderRadius: 12, width: "min(980px, 100%)", padding: 20, boxShadow: "0 20px 50px rgba(15,23,42,0.35)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: "#0B1F3A" }}>{mode === "loan" ? "Loan calculator" : "Calculator"}{title ? " - " + title : ""}</h2>
              <div role="tablist" aria-label="Which calculator" style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                {(["loan", "basic"] as const).map((m) => (
                  <button key={m} type="button" role="tab" aria-selected={mode === m} data-testid={`calculator-mode-${m}`} onClick={() => setMode(m)}
                    style={{ padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid #0B1F3A", background: mode === m ? "#0B1F3A" : "#ffffff", color: mode === m ? "#ffffff" : "#0B1F3A" }}>
                    {m === "loan" ? "Loan" : "Regular"}
                  </button>
                ))}
              </div>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)}
                style={{ background: "#ffffff", color: "#0B1F3A", border: "1px solid #cbd5e1", borderRadius: 8, padding: "4px 10px", fontSize: 16, cursor: "pointer" }}>&times;</button>
            </div>
            {/* The loan calculator stays mounted so its figures are still there when you switch back. */}
            <div style={{ display: mode === "loan" ? "block" : "none" }}><LoanCalculator initialAmount={requestedAmount ?? null} title={title} onSaveNote={onSaveNote} /></div>
            {mode === "basic" ? <BasicCalculator /> : null}
          </div>
        </div>
      )}
    </>
  );
}
