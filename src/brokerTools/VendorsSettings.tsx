// BF_PORTAL_v867_BROKER_TOOLS_VENDORS - Settings > Deal tools > Vendors: equipment vendors and dealers who quote your financing at
// the point of sale. Admins add vendors, set fees, send the vendor agreement, and mark fees paid; staff can look.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { Chip, ErrorLine, card, h3, input, label, money, muted, primaryButton, row, secondaryButton, table, td, th } from "./ui";
import { useRun } from "./useRun";

type Vendor = { user_id: string; company_name: string; contact_name: string | null; email: string | null; phone: string | null; code: string; status: string;
  fee_pct: string | null; fee_flat: string | null; quotes: number; deals: number; fees_expected: string; fees_paid: string; apply_link: string };
type Fee = { id: string; vendor: string; business_name: string | null; fee_amount: string; status: string; paid_on: string | null };

const STATUS: Record<string, { text: string; tone: "green" | "amber" | "grey" | "blue" }> = {
  active: { text: "Active", tone: "green" }, invited: { text: "Invited", tone: "blue" }, pending_agreement: { text: "Agreement out", tone: "amber" }, paused: { text: "Paused", tone: "grey" },
};
const blank = { company_name: "", contact_name: "", email: "", phone: "", province: "", fee_pct: "", fee_flat: "", fee_terms: "" };

export default function VendorsSettings({ isAdmin }: { isAdmin: boolean }) {
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [form, setForm] = useState(blank);
  const [link, setLink] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await api.get<{ vendors: Vendor[] }>("/api/deal-desk/vendors").catch(() => null);
    setVendors(r?.vendors ?? []);
    const f = await api.get<{ fees: Fee[] }>("/api/deal-desk/vendor-fees").catch(() => null);
    setFees(f?.fees ?? []);
  }, []);
  const { busy, err, msg, run } = useRun(load);
  useEffect(() => { void load(); }, [load]);
  const add = () => run(async () => {
    const r = await api.post<{ signup_link: string }>("/api/deal-desk/vendors", form);
    setForm(blank);
    setLink(`${window.location.origin}${r?.signup_link ?? "/vendor/signup"}`);
  }, "Vendor added. Send them the sign-up link below to sign the vendor agreement.");
  const agreement = (v: Vendor) => run(async () => { const r = await api.post<{ signing_url: string }>(`/api/deal-desk/vendors/${v.user_id}/agreement`); setLink(r?.signing_url ?? null); }, "Agreement ready: the signing link below works for 45 minutes.");

  return (
    <section style={card} data-testid="vendors-settings">
      <h3 style={h3}>Vendors and dealers</h3>
      <p style={muted}>Vendors log in at /vendor, quote your financing to their customers from your rate cards, and send each customer an apply link that names them. Their fee is recorded when a deal funds.</p>
      <ErrorLine text={err} />
      {msg && <p role="status" style={{ ...muted, color: "var(--ui-text)" }}>{msg}</p>}
      {link && <p style={{ ...muted, color: "var(--ui-text)", overflowWrap: "anywhere" }} data-testid="vendor-link">{link}</p>}
      {vendors === null ? <p style={muted}>Loading...</p> : vendors.length === 0 ? <p style={muted}>No vendors yet.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead><tr>{["Vendor", "Status", "Fee", "Quotes", "Deals", "Fees owed", "Fees paid", ""].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead>
            <tbody>{vendors.map((v) => (
              <tr key={v.user_id}>
                <td style={td}><strong>{v.company_name}</strong><div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{v.contact_name ?? ""} {v.email ?? ""} - code {v.code}</div></td>
                <td style={td}><Chip tone={STATUS[v.status]?.tone ?? "grey"}>{STATUS[v.status]?.text ?? v.status}</Chip></td>
                <td style={td}>{[v.fee_pct ? `${Number(v.fee_pct)}%` : null, v.fee_flat ? money(v.fee_flat) : null].filter(Boolean).join(" + ") || "-"}</td>
                <td style={td}>{v.quotes}</td><td style={td}>{v.deals}</td><td style={td}>{money(v.fees_expected)}</td><td style={td}>{money(v.fees_paid)}</td>
                <td style={td}>{isAdmin && (
                  <div style={row}>
                    {v.status !== "active" && <button type="button" style={secondaryButton} disabled={busy} onClick={() => void agreement(v)}>Agreement link</button>}
                    {v.status !== "active" && <button type="button" style={secondaryButton} disabled={busy} onClick={() => { if (window.confirm(`Mark ${v.company_name} active (agreement signed on paper)?`)) void run(() => api.patch(`/api/deal-desk/vendors/${v.user_id}`, { status: "active" })); }}>Mark active</button>}
                    {v.status === "active" && <button type="button" style={secondaryButton} disabled={busy} onClick={() => void run(() => api.patch(`/api/deal-desk/vendors/${v.user_id}`, { status: "paused" }))}>Pause</button>}
                    {v.status === "paused" && <button type="button" style={secondaryButton} disabled={busy} onClick={() => void run(() => api.patch(`/api/deal-desk/vendors/${v.user_id}`, { status: "active" }))}>Resume</button>}
                  </div>
                )}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
      {fees.length > 0 && (
        <>
          <h3 style={{ ...h3, marginTop: 12 }}>Vendor fees</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={table} data-testid="vendor-fees">
              <thead><tr>{["Vendor", "Deal", "Fee", "Status", ""].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead>
              <tbody>{fees.map((f) => (
                <tr key={f.id}><td style={td}>{f.vendor}</td><td style={td}>{f.business_name ?? "-"}</td><td style={td}>{money(f.fee_amount)}</td>
                  <td style={td}><Chip tone={f.status === "paid" ? "green" : f.status === "void" ? "grey" : "amber"}>{f.status === "paid" ? `Paid ${f.paid_on ?? ""}` : f.status === "void" ? "Void" : "Owed"}</Chip></td>
                  <td style={td}>{isAdmin && f.status === "expected" && <button type="button" style={secondaryButton} disabled={busy} onClick={() => void run(() => api.patch(`/api/deal-desk/vendor-fees/${f.id}`, { status: "paid" }), "Marked paid.")}>Mark paid</button>}</td></tr>))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {isAdmin && (
        <>
          <h3 style={{ ...h3, marginTop: 12 }}>Add a vendor</h3>
          <div style={row}>
            {([["company_name", "Company"], ["contact_name", "Contact name"], ["email", "Email"], ["phone", "Mobile"], ["province", "Province"], ["fee_pct", "Fee % of funded"], ["fee_flat", "Flat fee $"]] as const).map(([k, l]) => (
              <label key={k} style={label}>{l}<input style={{ ...input, width: k.startsWith("fee") || k === "province" ? 110 : undefined }} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
            ))}
          </div>
          <label style={{ ...label, marginTop: 8 }}>Fee terms<input style={input} value={form.fee_terms} onChange={(e) => setForm({ ...form, fee_terms: e.target.value })} /></label>
          <div style={{ ...row, marginTop: 8 }}><button type="button" style={primaryButton} disabled={busy} onClick={() => void add()}>Add vendor</button></div>
        </>
      )}
    </section>
  );
}
