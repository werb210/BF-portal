// BF_PORTAL_v864_ACTIVE_CONTRACTS - Related Applications: the original application, the financing chain
// (Original Deal -> Contract -> Renewal Opportunity -> New Contract) and the renewal / refinance / additional
// opportunities on this contract.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useCrmBase } from "@/pages/crm/crmBase";
import { acApi, errorText, type Detail } from "./api";
import { Btn, card, day, ErrorLine, Field, h3, input, label, money, muted, Pill, table, td, th } from "./ui";

export default function RelatedPanel({ d, onChanged }: { d: Detail; onChanged: () => void }) {
  const c = d.contract;
  const crmBase = useCrmBase();
  const [kind, setKind] = useState("renewal");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); onChanged(); } catch (x) { setErr(errorText(x)); } finally { setBusy(false); }
  };
  const open = d.opportunities.find((o) => ["open", "contacted", "application_started"].includes(o.status));
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ErrorLine text={err} />
      <div style={card}>
        <h3 style={h3}>Financing chain</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", fontSize: 13, color: "var(--ui-text)" }}>
          {c.application_id ? <><Link to={`/applications/${c.application_id}`} style={{ color: "var(--ui-accent-fg)" }}>Original application</Link><span aria-hidden>{"->"}</span></> : null}
          {d.chain.map((x, i) => (
            <span key={x.id} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              {i > 0 ? <span aria-hidden>{"->"}</span> : null}
              {x.id === c.id ? <strong>This contract</strong> : <Link to={`${crmBase}/active-contracts/${x.id}`} style={{ color: "var(--ui-accent-fg)" }}>{x.lender_name ?? "Contract"} {money(Number(x.original_amount))}</Link>}
              <Pill kind={x.status}>{label(x.status)}</Pill>
            </span>
          ))}
          {d.opportunities.filter((o) => o.new_contract_id).map((o) => (
            <span key={o.id} style={{ display: "inline-flex", gap: 6 }}><span aria-hidden>{"->"}</span><Link to={`${crmBase}/active-contracts/${o.new_contract_id}`} style={{ color: "var(--ui-accent-fg)" }}>New contract ({label(o.kind)})</Link></span>
          ))}
        </div>
      </div>
      <div style={card}>
        <h3 style={h3}>Opportunities</h3>
        <table style={table}>
          <thead><tr><th style={th}>Created</th><th style={th}>Kind</th><th style={th}>Status</th><th style={th}>Application</th><th style={th}>Reason</th><th style={th} /></tr></thead>
          <tbody>
            {d.opportunities.length === 0 ? <tr><td style={td} colSpan={6}>No opportunities yet.</td></tr> : d.opportunities.map((o) => (
              <tr key={o.id}>
                <td style={td}>{day(o.created_at)}</td><td style={td}>{label(o.kind)}</td><td style={td}>{label(o.status)}</td>
                <td style={td}>{o.application_id ? <Link to={`/applications/${o.application_id}`} style={{ color: "var(--ui-accent-fg)" }}>{label(o.application_stage) || "Open"}</Link> : "-"}</td>
                <td style={td}>{o.reason ?? ""}</td>
                <td style={td}>{["open", "contacted"].includes(o.status) ? (
                  <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
                    {o.status === "open" ? <Btn disabled={busy} onClick={() => void run(() => acApi.updateOpportunity(c.id, o.id, "contacted"))}>Client contacted</Btn> : null}
                    <Btn disabled={busy} onClick={() => void run(() => acApi.updateOpportunity(c.id, o.id, "not_interested"))}>Not interested</Btn>
                    <Btn disabled={busy} onClick={() => void run(() => acApi.updateOpportunity(c.id, o.id, "lost"))}>Lost</Btn>
                  </span>
                ) : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!open && !c.is_history ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", marginTop: 8 }}>
            <Field label="New opportunity"><select style={input} value={kind} onChange={(e) => setKind(e.target.value)}><option value="renewal">Renewal</option><option value="refinance">Refinance</option><option value="additional">Additional financing / equipment</option></select></Field>
            <Field label="Reason"><input style={input} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            <Btn disabled={busy} onClick={() => void run(() => acApi.openOpportunity(c.id, kind, reason))}>Create opportunity</Btn>
          </div>
        ) : <div style={{ ...muted, marginTop: 6 }}>{open ? "An opportunity is open - start its application from Contract Details." : ""}</div>}
      </div>
    </div>
  );
}
