// BF_PORTAL_v950_BASIC_CALCULATOR - the everyday calculator next to the loan calculator. Works from the keyboard too.
import { useEffect, useState } from "react";
import { CALC_START, press, type CalcState } from "./basicCalc";

const KEYS: Array<[string, string]> = [
  ["C", "C"], ["+/-", "+/-"], ["%", "%"], ["/", "÷"],
  ["7", "7"], ["8", "8"], ["9", "9"], ["*", "×"],
  ["4", "4"], ["5", "5"], ["6", "6"], ["-", "−"],
  ["1", "1"], ["2", "2"], ["3", "3"], ["+", "+"],
  ["0", "0"], [".", "."], ["back", "⌫"], ["=", "="],
];
const LABEL: Record<string, string> = { C: "Clear", "+/-": "Change sign", "%": "Percent", "/": "Divide", "*": "Multiply", "-": "Subtract", "+": "Add", back: "Delete last digit", "=": "Equals", ".": "Decimal point" };

export default function BasicCalculator(): JSX.Element {
  const [s, setS] = useState<CalcState>(CALC_START);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      const k = e.key === "Enter" ? "=" : e.key === "Backspace" ? "back" : e.key === "Delete" || e.key.toLowerCase() === "c" ? "C" : e.key;
      if (/^[0-9.+\-*/=%]$/.test(k) || k === "back" || k === "C") { e.preventDefault(); setS((p) => press(p, k)); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);
  const opKey = (k: string) => ["/", "*", "-", "+", "="].includes(k);
  return (
    <div data-testid="basic-calculator" style={{ maxWidth: 320, margin: "0 auto" }}>
      <output data-testid="basic-calc-display" aria-live="polite"
        style={{ display: "block", textAlign: "right", fontSize: 30, fontWeight: 600, padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#f8fafc", color: "#0B1F3A", minHeight: 44, overflow: "hidden", fontVariantNumeric: "tabular-nums" }}>
        {s.display === "Error" ? "Error" : Number(s.display).toLocaleString("en-CA", { maximumFractionDigits: 10 }) + (s.display.endsWith(".") ? "." : "")}
      </output>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 10 }}>
        {KEYS.map(([k, face]) => (
          <button key={k} type="button" aria-label={LABEL[k] ?? k} data-testid={`calc-key-${k}`} onClick={() => setS((p) => press(p, k))}
            style={{ padding: "14px 0", fontSize: 20, fontWeight: 600, borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
              border: "1px solid " + (opKey(k) ? "#0B1F3A" : "#cbd5e1"), background: k === "=" ? "#0B1F3A" : opKey(k) ? "#e8edf5" : "#ffffff", color: k === "=" ? "#ffffff" : "#0B1F3A" }}>
            {face}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "#475569", margin: "10px 0 0", textAlign: "center" }}>You can also type on the keyboard. Enter is equals.</p>
    </div>
  );
}
