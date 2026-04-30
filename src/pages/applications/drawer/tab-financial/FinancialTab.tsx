// BF_PORTAL_v71_BLOCK_2_5 — Financial tab rebuild per locked spec.
import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";

type Period = string; // "2026-01", "2026-02", ...
type LineItem = { id: string; label: string; values: Record<Period, number | null> };
type Section = { id: string; title: string; lines: LineItem[] };

type Ratios = {
  dscr: number | null;
  current_ratio: number | null;
  quick_ratio: number | null;
  debt_to_equity: number | null;
};

type DebtRow = {
  id: string;
  lender: string;
  type: string | null;
  balance: number | null;
  monthly_payment: number | null;
  rate: number | null;
};

type Flag = { id: string; severity: "info" | "warn" | "danger"; text: string };

type FinancialsPayload = {
  periods: Period[];
  summary: Section;
  pnl: Section;
  balance_sheet: Section;
  cash_flow: Section;
  debt: DebtRow[];
  flags: Flag[];
  ratios: Ratios;
};

type Props = { applicationId: string };

const EMPTY: FinancialsPayload = {
  periods: [],
  summary: { id: "summary", title: "Financial Summary", lines: [] },
  pnl: { id: "pnl", title: "Profit & Loss", lines: [] },
  balance_sheet: { id: "balance_sheet", title: "Balance Sheet", lines: [] },
  cash_flow: { id: "cash_flow", title: "Cash Flow", lines: [] },
  debt: [],
  flags: [],
  ratios: { dscr: null, current_ratio: null, quick_ratio: null, debt_to_equity: null },
};

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const s = Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n < 0 ? `($${s})` : `$${s}`;
}
function fmtRatio(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toFixed(2);
}
function periodLabel(p: Period): string {
  // "2026-01" -> "Jan 26"
  const m = /^(\d{4})-(\d{2})/.exec(p);
  if (!m) return p;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const yy = (m[1] ?? "").slice(2);
  const mIdx = Math.max(1, Math.min(12, Number(m[2] ?? "1"))) - 1;
  return `${months[mIdx] ?? "?"} ${yy}`;
}

function CellInput({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (next: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState<string>(value === null ? "" : String(value));
  return editing ? (
    <input
      autoFocus
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setEditing(false);
        const trimmed = text.trim();
        if (trimmed === "") onCommit(null);
        else {
          const n = Number(trimmed.replace(/[\$,]/g, ""));
          onCommit(Number.isNaN(n) ? null : n);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setText(value === null ? "" : String(value));
          setEditing(false);
        }
      }}
      style={{ width: "100%", border: "1px solid #2563eb", borderRadius: 4, padding: "2px 6px", fontSize: 13, textAlign: "right" }}
    />
  ) : (
    <button
      type="button"
      onClick={() => {
        setText(value === null ? "" : String(value));
        setEditing(true);
      }}
      style={{ width: "100%", textAlign: "right", border: "none", background: "transparent", padding: "2px 6px", fontSize: 13, cursor: "text" }}
    >
      {fmtMoney(value)}
    </button>
  );
}

function SectionTable({
  section,
  periods,
  onChange,
}: {
  section: Section;
  periods: Period[];
  onChange: (lineId: string, period: Period, value: number | null) => void;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 12 }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", fontWeight: 600 }}>{section.title}</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }} data-testid={`fin-section-${section.id}`}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid #f3f4f6", color: "#6b7280", fontWeight: 600 }}>
                Line
              </th>
              {periods.map((p) => (
                <th key={p} style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid #f3f4f6", color: "#6b7280", fontWeight: 600 }}>
                  {periodLabel(p)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.lines.length === 0 ? (
              <tr>
                <td colSpan={periods.length + 1} style={{ padding: 14, color: "#9ca3af" }}>
                  No data.
                </td>
              </tr>
            ) : (
              section.lines.map((ln) => (
                <tr key={ln.id} data-testid={`fin-line-${ln.id}`}>
                  <td style={{ padding: "4px 10px", borderBottom: "1px solid #f9fafb" }}>{ln.label}</td>
                  {periods.map((p) => (
                    <td key={p} style={{ padding: 0, borderBottom: "1px solid #f9fafb" }}>
                      <CellInput
                        value={ln.values[p] ?? null}
                        onCommit={(v) => onChange(ln.id, p, v)}
                      />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FinancialTab({ applicationId }: Props) {
  const [data, setData] = useState<FinancialsPayload>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const resp = await api.get<FinancialsPayload>(`/api/applications/${encodeURIComponent(applicationId)}/financials`);
        if (!active) return;
        setData(resp ?? EMPTY);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load financials.");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [applicationId]);

  const onCellChange = (sectionKey: keyof FinancialsPayload, lineId: string, period: Period, v: number | null) => {
    setData((prev) => {
      const target = prev[sectionKey];
      if (!target || typeof target !== "object" || Array.isArray(target)) return prev;
      const sec = target as Section;
      const lines = sec.lines.map((ln) =>
        ln.id === lineId ? { ...ln, values: { ...ln.values, [period]: v } } : ln
      );
      const next: FinancialsPayload = { ...prev, [sectionKey]: { ...sec, lines } } as FinancialsPayload;
      void persist(next);
      return next;
    });
  };

  const persist = async (next: FinancialsPayload) => {
    setSaving(true);
    try {
      await api.patch(`/api/applications/${encodeURIComponent(applicationId)}/financials`, next);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("financials_save_failed", e);
    } finally {
      setSaving(false);
    }
  };

  const flags = useMemo(() => data.flags ?? [], [data.flags]);

  if (loading) return <div data-testid="fin-loading">Loading financials…</div>;
  if (error)   return <div data-testid="fin-error" style={{ color: "#b91c1c" }}>{error}</div>;

  return (
    <div data-testid="financial-tab" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
      <div>
        <SectionTable section={data.summary} periods={data.periods} onChange={(id, p, v) => onCellChange("summary", id, p, v)} />
        <SectionTable section={data.pnl} periods={data.periods} onChange={(id, p, v) => onCellChange("pnl", id, p, v)} />
        <SectionTable section={data.balance_sheet} periods={data.periods} onChange={(id, p, v) => onCellChange("balance_sheet", id, p, v)} />
        <SectionTable section={data.cash_flow} periods={data.periods} onChange={(id, p, v) => onCellChange("cash_flow", id, p, v)} />

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 12 }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", fontWeight: 600 }}>Debt Summary</div>
          {data.debt.length === 0 ? (
            <div style={{ padding: 14, color: "#9ca3af" }}>No debt rows.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid #f3f4f6", color: "#6b7280" }}>Lender</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid #f3f4f6", color: "#6b7280" }}>Type</th>
                  <th style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid #f3f4f6", color: "#6b7280" }}>Balance</th>
                  <th style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid #f3f4f6", color: "#6b7280" }}>Monthly</th>
                  <th style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid #f3f4f6", color: "#6b7280" }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.debt.map((d) => (
                  <tr key={d.id} data-testid={`debt-row-${d.id}`}>
                    <td style={{ padding: "4px 10px" }}>{d.lender}</td>
                    <td style={{ padding: "4px 10px" }}>{d.type ?? "—"}</td>
                    <td style={{ padding: "4px 10px", textAlign: "right" }}>{fmtMoney(d.balance)}</td>
                    <td style={{ padding: "4px 10px", textAlign: "right" }}>{fmtMoney(d.monthly_payment)}</td>
                    <td style={{ padding: "4px 10px", textAlign: "right" }}>{d.rate !== null ? `${(d.rate * 100).toFixed(2)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {flags.length > 0 ? (
          <div data-testid="fin-flags" style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>⚠ Flags / Concerns</h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
              {flags.map((f) => (
                <li key={f.id} style={{ color: f.severity === "danger" ? "#991b1b" : f.severity === "warn" ? "#78350f" : "#374151" }}>
                  {f.text}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <aside>
        <div data-testid="fin-ratios" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 14, marginBottom: 12 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>Ratios</h3>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "1fr auto", gap: "6px 12px", fontSize: 13 }}>
            <dt>DSCR</dt><dd style={{ margin: 0, fontWeight: 600 }} data-testid="ratio-dscr">{fmtRatio(data.ratios.dscr)}</dd>
            <dt>Current Ratio</dt><dd style={{ margin: 0, fontWeight: 600 }} data-testid="ratio-current">{fmtRatio(data.ratios.current_ratio)}</dd>
            <dt>Quick Ratio</dt><dd style={{ margin: 0, fontWeight: 600 }} data-testid="ratio-quick">{fmtRatio(data.ratios.quick_ratio)}</dd>
            <dt>Debt / Equity</dt><dd style={{ margin: 0, fontWeight: 600 }} data-testid="ratio-de">{fmtRatio(data.ratios.debt_to_equity)}</dd>
          </dl>
        </div>
        <div style={{ fontSize: 11, color: "#6b7280", textAlign: "right" }}>
          {saving ? "Saving…" : "All changes saved."}
        </div>
      </aside>
    </div>
  );
}
