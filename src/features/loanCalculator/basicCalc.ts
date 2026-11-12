// BF_PORTAL_v950_BASIC_CALCULATOR - a plain four-function calculator beside the loan calculator. Pure state machine so
// it can be tested without a screen.
export type CalcState = { display: string; acc: number | null; op: "+" | "-" | "*" | "/" | null; fresh: boolean };
export const CALC_START: CalcState = { display: "0", acc: null, op: null, fresh: true };

const round = (n: number): number => Math.round((n + Number.EPSILON) * 1e10) / 1e10;
const show = (n: number): string => (Number.isFinite(n) ? String(round(n)) : "Error");
const apply = (a: number, b: number, op: NonNullable<CalcState["op"]>): number => (op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : b === 0 ? NaN : a / b);

/** Keys: digits, ".", "+", "-", "*", "/", "=", "%", "+/-", "C", "back". */
export function press(s: CalcState, key: string): CalcState {
  if (key === "C") return CALC_START;
  if (s.display === "Error") return /^[0-9.]$/.test(key) ? press(CALC_START, key) : s;
  if (/^[0-9]$/.test(key)) return { ...s, display: s.fresh || s.display === "0" ? key : (s.display.replace(/[-.]/g, "").length >= 15 ? s.display : s.display + key), fresh: false };
  if (key === ".") return s.fresh ? { ...s, display: "0.", fresh: false } : s.display.includes(".") ? s : { ...s, display: s.display + "." };
  if (key === "back") return s.fresh ? s : { ...s, display: s.display.length <= 1 || /^-\d$/.test(s.display) ? "0" : s.display.slice(0, -1) };
  if (key === "+/-") return s.display === "0" ? s : { ...s, display: s.display.startsWith("-") ? s.display.slice(1) : "-" + s.display };
  const cur = Number(s.display);
  if (key === "%") return { ...s, display: show(s.acc !== null && s.op ? (s.acc * cur) / 100 : cur / 100), fresh: false };
  if (key === "=") {
    if (s.acc === null || !s.op) return { ...s, fresh: true };
    return { display: show(apply(s.acc, cur, s.op)), acc: null, op: null, fresh: true };
  }
  if (key === "+" || key === "-" || key === "*" || key === "/") {
    if (s.acc !== null && s.op && !s.fresh) { const r = apply(s.acc, cur, s.op); return Number.isFinite(r) ? { display: show(r), acc: round(r), op: key, fresh: true } : { ...CALC_START, display: "Error" }; }
    return { display: s.display, acc: cur, op: key, fresh: true };
  }
  return s;
}
