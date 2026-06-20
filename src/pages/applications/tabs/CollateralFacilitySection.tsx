// BF_PORTAL_BLOCK_v303_COLLATERAL_DOCTYPES_v1 — Collateral & Facility section.
// Staff-entered underwriting collateral summary, surfaced in the Lenders tab so
// it's ready proactively whether or not Accord ends up the chosen lender.
// Persists to the generic form-responses store, doc_type "collateral_facility".
import { useEffect, useState } from "react";
import { getFormResponse, saveFormResponse } from "@/api/formResponses";

type ClassRow = {
  included: boolean;
  value: string;
  limit: string;
  encumbered: string;
  balance: string;
};
type Facility = { lender: string; type: string; limit: string; balance: string };

const CLASSES: Array<{ key: string; label: string }> = [
  { key: "accounts_receivable", label: "Accounts Receivable" },
  { key: "finished_goods", label: "Finished Goods" },
  { key: "raw_materials", label: "Raw Materials" },
  { key: "equipment", label: "Equipment" },
  { key: "real_estate", label: "Real Estate" },
];

const emptyRow = (): ClassRow => ({ included: false, value: "", limit: "", encumbered: "", balance: "" });

type CollateralData = {
  classes: Record<string, ClassRow>;
  facilities: Facility[];
};

const emptyData = (): CollateralData => ({
  classes: Object.fromEntries(CLASSES.map((c) => [c.key, emptyRow()])),
  facilities: [{ lender: "", type: "", limit: "", balance: "" }],
});

const s = {
  wrap: { marginTop: 24, padding: 16, background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 8 } as const,
  title: { fontSize: 16, fontWeight: 700, color: "var(--ui-text)", margin: "0 0 4px" } as const,
  sub: { fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 12 } as const,
  table: { width: "100%", borderCollapse: "collapse" as const } as const,
  th: { textAlign: "left" as const, padding: "6px 8px", fontSize: 11, fontWeight: 600, color: "var(--ui-text-muted)", borderBottom: "1px solid var(--ui-border)" } as const,
  td: { padding: "4px 8px", borderBottom: "1px solid var(--ui-border-soft)", color: "var(--ui-text)" } as const, // BF_PORTAL_BLOCK_v723_COLLATERAL_TEXT_COLOR_v1
  input: { width: "100%", padding: "6px 8px", fontSize: 13, border: "1px solid var(--ui-border)", borderRadius: 4, boxSizing: "border-box" as const, color: "var(--ui-text)", background: "var(--ui-surface-strong)" } as const, // BF_PORTAL_BLOCK_v723_COLLATERAL_TEXT_COLOR_v1
  addBtn: { marginTop: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", padding: "6px 12px", borderRadius: 6, fontSize: 13, cursor: "pointer", color: "var(--ui-text)" } as const,
};

export default function CollateralFacilitySection({ applicationId }: { applicationId: string }) {
  const [data, setData] = useState<CollateralData>(emptyData());
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!applicationId) { setLoaded(true); return; }
    void (async () => {
      const existing = await getFormResponse(applicationId, "collateral_facility");
      if (existing?.data) {
        const d = existing.data as Partial<CollateralData>;
        setData({
          classes: { ...emptyData().classes, ...(d.classes as Record<string, ClassRow> | undefined) },
          facilities: Array.isArray(d.facilities) && d.facilities.length ? (d.facilities as Facility[]) : emptyData().facilities,
        });
      }
      setLoaded(true);
    })();
  }, [applicationId]);

  const persist = async (next: CollateralData) => {
    if (!applicationId) return;
    setSaving(true);
    try {
      await saveFormResponse(applicationId, "collateral_facility", next as unknown as Record<string, unknown>);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const setClass = (key: string, patch: Partial<ClassRow>) =>
    setData((d) => {
      const nextRow: ClassRow = { ...(d.classes[key] ?? emptyRow()), ...patch };
      return { ...d, classes: { ...d.classes, [key]: nextRow } };
    });

  const setFacility = (idx: number, patch: Partial<Facility>) =>
    setData((d) => {
      const facilities = d.facilities.map((f, i): Facility => (i === idx ? { ...f, ...patch } : f));
      return { ...d, facilities };
    });

  const addFacility = () =>
    setData((d) => ({ ...d, facilities: [...d.facilities, { lender: "", type: "", limit: "", balance: "" }] }));

  if (!loaded) return <div style={s.wrap}>Loading collateral…</div>;

  return (
    <div style={s.wrap} onBlur={() => void persist(data)} data-testid="collateral-facility">
      <h3 style={s.title}>Collateral &amp; Facility</h3>
      <div style={s.sub}>
        Staff underwriting summary. {saving ? "Saving…" : "Saved"}{error ? ` — ${error}` : ""}
      </div>

      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Collateral</th>
            <th style={s.th}>Included</th>
            <th style={s.th}>Value</th>
            <th style={s.th}>Limit</th>
            <th style={s.th}>Encumbered</th>
            <th style={s.th}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {CLASSES.map((c) => {
            const row = data.classes[c.key] ?? emptyRow();
            return (
              <tr key={c.key}>
                <td style={s.td}>{c.label}</td>
                <td style={s.td}>
                  <input
                    type="checkbox"
                    checked={row.included}
                    onChange={(e) => setClass(c.key, { included: e.target.checked })}
                    aria-label={`${c.label} included`}
                  />
                </td>
                {(["value", "limit", "encumbered", "balance"] as const).map((f) => (
                  <td style={s.td} key={f}>
                    <input
                      style={s.input}
                      inputMode="decimal"
                      value={row[f]}
                      onChange={(e) => setClass(c.key, { [f]: e.target.value } as Partial<ClassRow>)}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      <h4 style={{ ...s.title, fontSize: 14, margin: "16px 0 4px" }}>Existing Facilities</h4>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Lender</th>
            <th style={s.th}>Type</th>
            <th style={s.th}>Authorized Limit</th>
            <th style={s.th}>Balance Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {data.facilities.map((fac, idx) => (
            <tr key={idx}>
              {(["lender", "type", "limit", "balance"] as const).map((f) => (
                <td style={s.td} key={f}>
                  <input
                    style={s.input}
                    inputMode={f === "limit" || f === "balance" ? "decimal" : "text"}
                    value={fac[f]}
                    onChange={(e) => setFacility(idx, { [f]: e.target.value } as Partial<Facility>)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" style={s.addBtn} onClick={addFacility}>+ Add facility</button>
    </div>
  );
}
