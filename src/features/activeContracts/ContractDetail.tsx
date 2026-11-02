// BF_PORTAL_v864_ACTIVE_CONTRACTS - one contract, expanded: Contract Details, Payments & Ledger, Commission,
// Documents, Renewal Rules, Related Applications.
import { useCallback, useEffect, useState } from "react";
import { acApi, errorText, type Detail } from "./api";
import { ErrorLine, Pill } from "./ui";
import DetailsPanel from "./DetailsPanel";
import LedgerPanel from "./LedgerPanel";
import CommissionPanel from "./CommissionPanel";
import DocumentsPanel from "./DocumentsPanel";
import RulesPanel from "./RulesPanel";
import RelatedPanel from "./RelatedPanel";

const TABS = [
  ["details", "Contract Details"], ["ledger", "Payments & Ledger"], ["commission", "Commission"],
  ["documents", "Documents"], ["rules", "Renewal Rules"], ["related", "Related Applications"],
] as const;
export type DetailTab = (typeof TABS)[number][0];

export default function ContractDetail({ contractId, onChanged, initialTab = "details" }: { contractId: string; onChanged?: () => void; initialTab?: DetailTab }) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>(initialTab);
  const load = useCallback(async () => {
    try { setD(await acApi.detail(contractId)); setErr(null); } catch (e) { setErr(errorText(e)); }
  }, [contractId]);
  useEffect(() => { void load(); }, [load]);
  const changed = useCallback(() => { void load(); onChanged?.(); }, [load, onChanged]);
  if (err) return <div style={{ padding: 12 }}><ErrorLine text={err} /></div>;
  if (!d) return <div style={{ padding: 12, color: "var(--ui-text-muted)" }}>Loading contract...</div>;
  const c = d.contract;
  return (
    <div data-testid="ac-detail" style={{ padding: 12, background: "var(--ui-surface, var(--ui-surface-strong))" }}>
      <div role="tablist" aria-label="Contract" style={{ display: "flex", flexWrap: "wrap", gap: 4, borderBottom: "1px solid var(--ui-border)", marginBottom: 12 }}>
        {TABS.map(([id, name]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            style={{ border: "none", background: "transparent", padding: "8px 10px", fontSize: 13, cursor: "pointer", fontWeight: tab === id ? 700 : 500,
              color: tab === id ? "var(--ui-text)" : "var(--ui-text-muted)", borderBottom: tab === id ? "2px solid var(--ui-accent-blue, #2563eb)" : "2px solid transparent" }}>
            {name}{id === "documents" && c.pending_statements ? ` (${c.pending_statements})` : ""}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ui-text)" }}>{c.lender_name ?? "Lender not set"}</div>
        <div style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>{c.product_name ?? c.product_category ?? ""}</div>
        <Pill kind={c.status}>{c.status_label}</Pill>
        {c.renewal.eligibility === "eligible" && !c.is_history ? <Pill kind="renewal_eligible">Renewal Eligible</Pill> : null}
        {c.outcome_required ? <Pill kind="default">Outcome required</Pill> : null}
      </div>
      {tab === "details" ? <DetailsPanel d={d} onChanged={changed} goTo={setTab} /> : null}
      {tab === "ledger" ? <LedgerPanel d={d} onChanged={changed} /> : null}
      {tab === "commission" ? <CommissionPanel d={d} onChanged={changed} /> : null}
      {tab === "documents" ? <DocumentsPanel d={d} onChanged={changed} /> : null}
      {tab === "rules" ? <RulesPanel d={d} onChanged={changed} /> : null}
      {tab === "related" ? <RelatedPanel d={d} onChanged={changed} /> : null}
    </div>
  );
}
