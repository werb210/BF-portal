// BF_PORTAL_BLOCK_v198_REFERRER_MANAGEMENT_v1
// Staff view of the referrer system: list of all referrers with
// referral + commission rollups, drill-down to per-referrer detail.
import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";

type Referrer = {
  id: string;
  full_name?: string | null;
  company_name?: string | null;
  email?: string | null;
  phone_e164?: string | null;
  etransfer_email?: string | null;
  is_active?: boolean | null;
  profile_completed_at?: string | null;
  referrals_count?: number | null;
  matched_count?: number | null;
  total_accrued?: number | string | null;
  total_payable?: number | string | null;
  total_paid?: number | string | null;
  created_at?: string | null;
};

type Detail = {
  referrer: Referrer;
  referrals: Array<{
    id: string;
    full_name: string;
    company_name?: string | null;
    email?: string | null;
    phone_e164?: string | null;
    ref_code?: string | null;
    sms_sent_at?: string | null;
    application_id?: string | null;
    application_created?: boolean | null;
    matched_at?: string | null;
    status?: string | null;
    created_at?: string | null;
  }>;
  applications: Array<{
    id: string;
    application_code?: string | null;
    business_name?: string | null;
    stage?: string | null;
    status?: string | null;
    annual_premium?: number | string | null;
    policy_id?: string | null;
    updated_at?: string | null;
  }>;
  commissions: Array<{
    id: string;
    amount: number | string | null;
    status: string;
    accrued_at?: string | null;
    payable_at?: string | null;
    paid_at?: string | null;
    application_id?: string | null;
    business_name?: string | null;
  }>;
};

function fmtMoney(n: number | string | null | undefined): string {
  const num = typeof n === "string" ? Number(n) : n;
  if (typeof num !== "number" || !Number.isFinite(num) || num <= 0) return "—";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(num);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export default function BIReferrerManagement() {
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const r: any = await api<any>("/api/v1/bi/admin/referrers");
      const list: Referrer[] = Array.isArray(r) ? r : (Array.isArray(r?.referrers) ? r.referrers : []);
      setReferrers(list);
    } catch (e) {
      // Endpoint may not exist yet (BI-Server v239 will add it).
      setError(e instanceof Error ? e.message : "Could not load referrers");
      setReferrers([]);
    } finally { setLoading(false); }
  }

  async function openDetail(id: string) {
    setSelected(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d: any = await api<any>(`/api/v1/bi/admin/referrers/${id}/detail`);
      setDetail((d?.detail ?? d) as Detail);
    } catch (e) {
      console.warn("referrer detail load failed", e);
      setDetail(null);
    } finally { setDetailLoading(false); }
  }

  const totals = useMemo(() => ({
    referrers: referrers.length,
    active: referrers.filter((r) => r.is_active !== false).length,
    completed: referrers.filter((r) => !!r.profile_completed_at).length,
    accrued: referrers.reduce((s, r) => s + Number(r.total_accrued || 0), 0),
    paid: referrers.reduce((s, r) => s + Number(r.total_paid || 0), 0),
  }), [referrers]);

  return (
    <div className="text-white">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-3xl font-semibold">Referrer Management</h2>
        <button onClick={() => void load()} className="rounded border border-card px-3 py-1 text-sm text-white/70 hover:text-white">Refresh</button>
      </div>

      {error ? <div className="mb-4 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">{error}. Click Refresh to retry; the referrers list endpoint is live.</div> : null}

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5 mb-6">
        <Pill label="Referrers" value={totals.referrers} />
        <Pill label="Active" value={totals.active} />
        <Pill label="Profile complete" value={totals.completed} />
        <Pill label="Total accrued" value={fmtMoney(totals.accrued)} />
        <Pill label="Total paid" value={fmtMoney(totals.paid)} />
      </div>

      <div className="rounded-xl border border-card overflow-hidden bg-brand-surface">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-white/60">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Company</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Payout email</th>
              <th className="px-4 py-2 text-right">Referrals</th>
              <th className="px-4 py-2 text-right">Matched</th>
              <th className="px-4 py-2 text-right">Accrued</th>
              <th className="px-4 py-2 text-right">Paid</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4 text-white/40" colSpan={8}>Loading…</td></tr>
            ) : referrers.length === 0 ? (
              <tr><td className="p-4 text-white/40" colSpan={8}>No referrers yet.</td></tr>
            ) : referrers.map((r) => (
              <tr
                key={r.id}
                onClick={() => void openDetail(r.id)}
                className={`border-t border-white/5 cursor-pointer hover:bg-white/5 ${selected === r.id ? "bg-white/5" : ""}`}
              >
                <td className="px-4 py-2">
                  {/* BF_PORTAL_BLOCK_49_v1 -- display fallback chain.
                      When full_name is empty but the referrer has
                      filled in phone/email, show those instead of
                      a generic "(profile pending)" stub. */}
                  <div className="font-medium">
                    {r.full_name && r.full_name !== "(pending)"
                      ? r.full_name
                      : (r as any).email
                        ? (r as any).email
                        : (r as any).phone
                          ? (r as any).phone
                          : <span className="text-white/40 italic">(profile pending)</span>}
                  </div>
                  {!r.profile_completed_at && !r.full_name ? (
                    <div className="text-[10px] text-amber-300">awaiting profile</div>
                  ) : null}
                </td>
                <td className="px-4 py-2">{r.company_name || "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.phone_e164 || "—"}</td>
                <td className="px-4 py-2 text-xs">{r.etransfer_email || "—"}</td>
                <td className="px-4 py-2 text-right">{r.referrals_count ?? 0}</td>
                <td className="px-4 py-2 text-right">{r.matched_count ?? 0}</td>
                <td className="px-4 py-2 text-right">{fmtMoney(r.total_accrued)}</td>
                <td className="px-4 py-2 text-right">{fmtMoney(r.total_paid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <DetailPanel
          detail={detail}
          loading={detailLoading}
          onClose={() => { setSelected(null); setDetail(null); }}
        />
      ) : null}
    </div>
  );
}

function Pill(props: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-card bg-brand-surface p-4">
      <div className="text-xs uppercase tracking-widest text-white/60">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold">{props.value}</div>
    </div>
  );
}

function DetailPanel(props: { detail: Detail | null; loading: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40">
      <div className="w-full max-w-2xl overflow-y-auto bg-brand-surface border-l border-card p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/60">Referrer</div>
            <h3 className="text-xl font-semibold">
              {props.detail?.referrer?.full_name
                || (props.detail?.referrer as any)?.email
                || (props.detail?.referrer as any)?.phone
                || "—"}
            </h3>
            <div className="text-xs text-white/50">
              {props.detail?.referrer?.company_name || ""}
              {props.detail?.referrer?.phone_e164 ? <> · {props.detail.referrer.phone_e164}</> : null}
              {props.detail?.referrer?.email ? <> · {props.detail.referrer.email}</> : null}
            </div>
          </div>
          <button onClick={props.onClose} className="text-white/60 hover:text-white">✕</button>
        </div>

        {props.loading ? <div className="text-white/40 text-sm">Loading…</div> : null}
        {!props.loading && !props.detail ? <div className="text-white/40 text-sm">Detail endpoint not yet available.</div> : null}

        {props.detail ? (
          <div className="space-y-6">
            <Section title={`Referrals (${props.detail.referrals.length})`}>
              {props.detail.referrals.length === 0 ? <Empty>No referrals yet.</Empty> : (
                <ul className="divide-y divide-white/10 text-sm">
                  {props.detail.referrals.map((r) => (
                    <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{r.full_name}</div>
                        <div className="text-xs text-white/50">
                          {r.company_name || "—"}
                          {r.email ? <> · {r.email}</> : null}
                          {r.phone_e164 ? <> · {r.phone_e164}</> : null}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        {r.application_created ? (
                          <span className="rounded bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 px-2 py-0.5">Matched {fmtDate(r.matched_at)}</span>
                        ) : (
                          <span className="rounded bg-white/5 text-white/60 border border-white/15 px-2 py-0.5">{r.sms_sent_at ? "Invited" : "Sent"}</span>
                        )}
                        {r.ref_code ? <div className="mt-1 font-mono text-white/40">/{r.ref_code}</div> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title={`Matched applications (${props.detail.applications.length})`}>
              {props.detail.applications.length === 0 ? <Empty>None yet.</Empty> : (
                <ul className="divide-y divide-white/10 text-sm">
                  {props.detail.applications.map((a) => (
                    <li key={a.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{a.business_name || "—"}</div>
                        <div className="text-xs text-white/50">{a.application_code || a.id}</div>
                      </div>
                      <div className="text-right text-xs text-white/60">
                        <div>{a.stage || a.status || "—"}</div>
                        {a.annual_premium ? <div className="text-white/50">{fmtMoney(a.annual_premium)} premium</div> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title={`Commissions (${props.detail.commissions.length})`}>
              {props.detail.commissions.length === 0 ? <Empty>No commissions yet.</Empty> : (
                <ul className="divide-y divide-white/10 text-sm">
                  {props.detail.commissions.map((c) => (
                    <li key={c.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{c.business_name || "—"}</div>
                        <div className="text-xs text-white/50">
                          {c.status === "paid" && c.paid_at ? `Paid ${fmtDate(c.paid_at)}` :
                           c.status === "payable" ? "Awaiting payout" :
                           c.accrued_at ? `Accrued ${fmtDate(c.accrued_at)}` : "Accrued"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{fmtMoney(c.amount)}</div>
                        <div className="text-[10px] uppercase tracking-wider text-white/40">{c.status}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Section(props: { title: string; children: any }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-white/80 mb-2">{props.title}</h4>
      {props.children}
    </div>
  );
}

function Empty(props: { children: any }) {
  return <div className="text-sm text-white/40">{props.children}</div>;
}
