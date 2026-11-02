// BF_PORTAL_v864_ACTIVE_CONTRACTS - the KPI tiles across the top and the right rail (Renewal & Follow-up counts,
// Portfolio by Product Type donut, Upcoming Milestones).
import type { ReactNode } from "react";
import type { Summary } from "./api";
import { card, day, h3, money, muted, shortMoney } from "./ui";

function Tile({ title, value, note }: { title: string; value: ReactNode; note?: string }) {
  return (
    <div style={{ ...card, padding: "10px 12px", minWidth: 0 }}>
      <div style={{ ...muted, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ui-text)" }}>{value}</div>
      {note ? <div style={{ ...muted, fontSize: 11 }}>{note}</div> : null}
    </div>
  );
}

export function KpiTiles({ s }: { s: Summary }) {
  return (
    <div data-testid="ac-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 12 }}>
      <Tile title="Total Original Financing" value={money(s.total_original_financing)} />
      <Tile title="Estimated Outstanding" value={money(s.estimated_outstanding)} note={s.outstanding_has_estimates ? "Total exposure - includes estimates" : "Total exposure"} />
      <Tile title="Active Facilities" value={s.active_facilities} />
      <Tile title="Renewal Eligible" value={s.renewal_eligible} />
      <Tile title="Renewals Next 90 Days" value={s.renewals_next_90_days} />
      <Tile title="Boreal Revenue YTD" value={money(s.revenue_ytd)} note="Received only" />
      <Tile title="Lifetime Revenue" value={money(s.revenue_lifetime)} />
    </div>
  );
}

const COLORS = ["#1d4ed8", "#0ea5e9", "#16a34a", "#9ca3af", "#7c3aed", "#ea580c", "#be185d"];

function Donut({ rows, total }: { rows: Summary["by_product"]; total: number }) {
  const r = 52, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="Portfolio by product type">
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--ui-border)" strokeWidth="18" />
      {rows.map((row, i) => {
        const len = total > 0 ? (row.amount / total) * c : 0;
        const el = <circle key={row.product} cx="70" cy="70" r={r} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="18"
          strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />;
        offset += len;
        return el;
      })}
      <text x="70" y="68" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--ui-text)">{shortMoney(total)}</text>
      <text x="70" y="84" textAnchor="middle" fontSize="9" fill="var(--ui-text-muted)">Total funded</text>
    </svg>
  );
}

export function RightRail({ s, onOpen }: { s: Summary; onOpen: (contractId: string) => void }) {
  const f = s.follow_up;
  const rows: Array<[string, number, string]> = [
    ["Due now", f.due_now, "#dc2626"], ["Next 30 days", f.next_30, "#ea580c"], ["Next 60 days", f.next_60, "#ca8a04"],
    ["Next 90 days", f.next_90, "#2563eb"], ["Approaching 50% paid", f.approaching_50, "#16a34a"], ["No contact (90+ days)", f.no_contact_90_days, "#6b7280"],
  ];
  return (
    <aside style={{ display: "flex", flexDirection: "column", gap: 12 }} data-testid="ac-rail">
      <div style={card}>
        <h3 style={h3}>Renewal &amp; Follow-up</h3>
        {rows.map(([name, n, color]) => (
          <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: "4px 0" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ui-text)" }}><span aria-hidden style={{ width: 9, height: 9, borderRadius: 9, background: color }} />{name}</span>
            <strong style={{ color: "var(--ui-text)" }}>{n}</strong>
          </div>
        ))}
        {f.last_contact_at ? <div style={{ ...muted, marginTop: 6 }}>Last contact {day(f.last_contact_at)}</div> : null}
      </div>
      <div style={card}>
        <h3 style={h3}>Portfolio by Product Type</h3>
        {s.by_product.length === 0 ? <div style={muted}>No active facilities.</div> : (
          <>
            <div style={{ display: "flex", justifyContent: "center" }}><Donut rows={s.by_product} total={s.open_original_financing} /></div>
            {s.by_product.map((row, i) => (
              <div key={row.product} style={{ display: "grid", gridTemplateColumns: "12px 1fr auto auto", gap: 8, alignItems: "center", fontSize: 12, padding: "2px 0", color: "var(--ui-text)" }}>
                <span aria-hidden style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                <span>{row.product}</span><span>{money(row.amount)}</span><span style={{ color: "var(--ui-text-muted)" }}>{row.percent}%</span>
              </div>
            ))}
          </>
        )}
      </div>
      <div style={card}>
        <h3 style={h3}>Upcoming Milestones</h3>
        {s.milestones.length === 0 ? <div style={muted}>Nothing scheduled.</div> : s.milestones.map((m) => (
          <button key={`${m.contract_id}-${m.title}-${m.date}`} type="button" onClick={() => onOpen(m.contract_id)}
            style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", borderBottom: "1px solid var(--ui-border-soft, var(--ui-border))", padding: "6px 0", cursor: "pointer", color: "var(--ui-text)" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</div>
            <div style={muted}>{m.detail}</div>
            <div style={{ fontSize: 12, color: "var(--ui-accent-fg)" }}>{day(m.date)}</div>
          </button>
        ))}
      </div>
    </aside>
  );
}
