// BF_PORTAL_v864_ACTIVE_CONTRACTS - the contracts table: lender / product, type, original amount, balance (with its
// source), progress bar, status, maturity, next action; each row expands into the contract detail.
import { Fragment, useMemo, useState } from "react";
import type { Contract } from "./api";
import { balanceSource, Btn, day, input, money, Pill, Progress, table, td, th } from "./ui";
import ContractDetail from "./ContractDetail";

export default function ContractsTable({ contracts, title, onChanged, onAdd, openId, setOpenId, showCompany }: {
  contracts: Contract[]; title: string; onChanged: () => void; onAdd?: () => void;
  openId: string | null; setOpenId: (id: string | null) => void; showCompany?: boolean;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const rows = useMemo(() => contracts.filter((c) => {
    if (status && c.status !== status) return false;
    if (!q.trim()) return true;
    const hay = `${c.lender_name ?? ""} ${c.product_name ?? ""} ${c.product_category ?? ""} ${c.company_name ?? ""} ${c.facility_type ?? ""}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  }), [contracts, q, status]);
  const statuses = useMemo(() => Array.from(new Set(contracts.map((c) => c.status))), [contracts]);
  return (
    <section style={{ background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border-soft, var(--ui-border))", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ fontSize: 18, margin: 0, flex: "1 1 200px", color: "var(--ui-text)" }}>{title} ({contracts.length})</h2>
        <input aria-label="Search contracts" placeholder="Search contracts..." value={q} onChange={(e) => setQ(e.target.value)} style={{ ...input, flex: "1 1 180px" }} />
        <select aria-label="Status filter" value={status} onChange={(e) => setStatus(e.target.value)} style={input}>
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{contracts.find((c) => c.status === s)?.status_label ?? s}</option>)}
        </select>
        {onAdd ? <Btn primary onClick={onAdd}>+ Add Contract</Btn> : null}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Lender / Product</th>{showCompany ? <th style={th}>Client</th> : null}<th style={th}>Type</th><th style={th}>Original</th>
              <th style={th}>Current Balance</th><th style={th}>Progress</th><th style={th}>Status</th><th style={th}>Maturity</th><th style={th}>Next Action</th><th style={th}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <tr><td style={{ ...td, color: "var(--ui-text-muted)" }} colSpan={showCompany ? 10 : 9}>No contracts.</td></tr> : rows.map((c) => (
              <Fragment key={c.id}>
                <tr data-testid={`ac-row-${c.id}`} style={{ background: openId === c.id ? "var(--ui-surface, transparent)" : undefined }}>
                  <td style={td}><div style={{ fontWeight: 600 }}>{c.lender_name ?? "Lender not set"}</div><div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{c.product_name ?? c.facility_type ?? "-"}</div></td>
                  {showCompany ? <td style={td}>{c.company_name ?? "-"}</td> : null}
                  <td style={td}><span style={{ border: "1px solid var(--ui-border)", borderRadius: 4, padding: "1px 6px", fontSize: 12 }}>{c.product_category ?? "-"}</span></td>
                  <td style={td}>{money(c.original_amount)}</td>
                  <td style={td}><div>{money(c.balance.balance)}</div><div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>{balanceSource(c.balance)}</div></td>
                  <td style={td}><Progress pct={c.balance.percent_paid} /></td>
                  <td style={td}><Pill kind={c.status}>{c.status_label}</Pill>{c.pending_statements ? <div style={{ marginTop: 3 }}><Pill kind="pending">Statement to review</Pill></div> : null}</td>
                  <td style={td}>{c.maturity_date ? day(c.maturity_date) : "n/a"}</td>
                  <td style={{ ...td, fontWeight: c.renewal.eligibility === "eligible" || c.outcome_required ? 700 : 400, color: "var(--ui-text)" }}>{c.next_action}</td>
                  <td style={td}>
                    <Btn onClick={() => setOpenId(openId === c.id ? null : c.id)} title={openId === c.id ? "Hide details" : "Show details"}>{openId === c.id ? "Hide" : "View"}</Btn>
                  </td>
                </tr>
                {openId === c.id ? (
                  <tr><td colSpan={showCompany ? 10 : 9} style={{ padding: 0, borderBottom: "1px solid var(--ui-border)" }}><ContractDetail contractId={c.id} onChanged={onChanged} /></td></tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
