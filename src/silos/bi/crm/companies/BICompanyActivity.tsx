// BF_PORTAL_v789_BI_COMPANY_ACTIVITY - notes, calls, meetings and email logs recorded against a BI
// company (GET /api/v1/bi/crm/companies/:id/activity, BI-Server v789). The ActionBar's BI popups
// write to the same path.
import { useEffect, useState, type CSSProperties } from "react";
import { biActivityPath, listBiActivity, type BiActivityRow } from "@/api/biCrmActivity";

export function BICompanyActivity({ companyId, refreshKey }: { companyId: string; refreshKey?: number }) {
  const [rows, setRows] = useState<BiActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listBiActivity(biActivityPath({ kind: "company", id: companyId }))
      .then((r) => { if (!cancelled) setRows(r); })
      .catch((e: unknown) => {
        if (cancelled) return;
        setRows([]);
        setError(e instanceof Error ? e.message : "Could not load activity.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [companyId, refreshKey]);

  const sorted = [...rows].sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0));

  return (
    <section data-testid="bi-company-activity" style={panel}>
      <h3 style={{ margin: 0, marginBottom: 8, fontSize: 15, color: "var(--ui-text)" }}>Activity</h3>
      {loading && <div style={muted}>Loading...</div>}
      {error && <div role="alert" style={{ ...muted, color: "var(--ui-text-danger)" }}>{error}</div>}
      {!loading && !error && sorted.length === 0 && <div style={muted}>No activity logged for this company yet.</div>}
      {sorted.map((r) => {
        const subject = typeof r.meta?.subject === "string" ? r.meta.subject : typeof r.meta?.title === "string" ? r.meta.title : null;
        return (
          <article key={r.id} data-testid="bi-company-activity-row" style={row}>
            <header style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <strong style={{ textTransform: "capitalize", color: "var(--ui-text)", fontSize: 13 }}>
                {r.event_type}{r.outcome ? ` - ${r.outcome.replace(/_/g, " ")}` : ""}
              </strong>
              <time style={muted}>{r.created_at && !Number.isNaN(Date.parse(r.created_at)) ? new Date(r.created_at).toLocaleString() : ""}</time>
            </header>
            {subject && <div style={{ color: "var(--ui-text)", fontSize: 13, marginTop: 2 }}>{subject}</div>}
            {r.body && <div style={{ ...muted, whiteSpace: "pre-wrap", marginTop: 2 }}>{r.body}</div>}
            {r.actor_name && <div style={{ ...muted, marginTop: 2 }}>{r.actor_name}</div>}
          </article>
        );
      })}
    </section>
  );
}

const panel: CSSProperties = { marginTop: 16, background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border-soft)", borderRadius: 6, padding: 16 };
const row: CSSProperties = { borderTop: "1px solid var(--ui-border-soft)", padding: "8px 0" };
const muted: CSSProperties = { color: "var(--ui-text-muted)", fontSize: 12 };
