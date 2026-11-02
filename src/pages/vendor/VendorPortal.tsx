// BF_PORTAL_v867_BROKER_TOOLS_VENDORS - the equipment vendor / dealer portal at /vendor: sign up (with the vendor agreement in
// SignNow), log in with a phone code, quote a customer at the point of sale from the lender rate cards (with sales
// tax), give the customer an apply link that carries the vendor, follow each deal, upload its invoice, see fees.
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Navigate, Route, Routes, useNavigate, useSearchParams } from "react-router-dom";
import { api, rawApiFetch } from "@/api";
import { brandName } from "@/brokerTools/brand";
import PartnerHeader from "@/components/partner/PartnerHeader";
import StageTracker from "@/components/partner/StageTracker";
import "@/components/partner/partnerPortal.css";
import { OptionsGrid } from "@/brokerTools/StructuringPanel";
import { PROVINCES, type PaymentOption } from "@/brokerTools/structuring";

export const TOKEN_KEY = "vendor_token";
const auth = () => ({ Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY) ?? ""}` });
const money = (v: unknown) => `$${Number(v ?? 0).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const field: CSSProperties = { minHeight: 40, padding: "0 12px", minWidth: 0, flex: "1 1 200px" };
const say = (e: unknown, fallback: string) => (e instanceof Error && e.message && e.message !== "API_ERROR" ? e.message : fallback);

type Me = { company_name: string; contact_name: string | null; code: string; province: string | null; fee_pct: number | null; fee_flat: number | null; fee_terms: string | null };
type Deal = { application_id: string; business_name: string | null; stage: string | null; requested_amount: string | null; created_at: string; invoices_sent: number; fee_amount: string | null; fee_status: string | null; paid_on: string | null };
type Fee = { id: string; business_name: string | null; fee_amount: string; status: string; paid_on: string | null };

export function feeText(me: Pick<Me, "fee_pct" | "fee_flat">): string {
  return [me.fee_pct ? `${me.fee_pct}% of the funded amount` : null, me.fee_flat ? `${money(me.fee_flat)} per funded deal` : null].filter(Boolean).join(" plus ") || "as agreed";
}

export function VendorSignup() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ company_name: "", contact_name: "", email: "", phone: "", province: "" });
  const [state, setState] = useState<{ vendorId: string; signingUrl: string | null } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ vendorId: string; signingUrl: string | null }>("/api/vendor-portal/signup", { method: "POST", body: JSON.stringify({ ...form, code: params.get("code") ?? undefined }) });
      setState({ vendorId: r.vendorId, signingUrl: r.signingUrl ?? null });
    } catch (e) { setMsg(say(e, "That did not go through. Check the details and try again.")); } finally { setBusy(false); }
  };
  const complete = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ active: boolean }>("/api/vendor-portal/signup/complete", { method: "POST", body: JSON.stringify({ vendorId: state?.vendorId }) });
      setMsg(r.active ? "You're all set. Log in with your mobile number." : "We have not received your signature yet. Finish signing, then try again.");
    } catch (e) { setMsg(say(e, "Could not check your signature. Try again.")); } finally { setBusy(false); }
  };
  return (
    <main className="partner-portal"><div className="pp-page">
      <PartnerHeader title="Vendor Portal - sign up" welcome={`Offer ${brandName()} financing to your customers at the point of sale.`} />
      <section className="pp-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {!state ? (
          <>
            <div className="pp-row">
              <input aria-label="Company" placeholder="Company" style={field} value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              <input aria-label="Your name" placeholder="Your name" style={field} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div className="pp-row">
              <input aria-label="Email" placeholder="Email" type="email" style={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input aria-label="Mobile" placeholder="Mobile (you log in with it)" inputMode="tel" style={field} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <select aria-label="Province" style={field} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
                <option value="">Province</option>{PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="pp-row"><button type="button" className="pp-btn pp-btn--primary" disabled={busy} onClick={() => void submit()}>Continue to the vendor agreement</button></div>
          </>
        ) : state.signingUrl ? (
          <>
            <p style={{ margin: 0 }}>Sign the vendor agreement, then come back here.</p>
            <div className="pp-row">
              <a className="pp-btn pp-btn--primary" href={state.signingUrl} target="_blank" rel="noreferrer">Sign the agreement</a>
              <button type="button" className="pp-btn" disabled={busy} onClick={() => void complete()}>I have signed</button>
              <a className="pp-btn" href="/vendor/login">Log in</a>
            </div>
          </>
        ) : <p style={{ margin: 0 }}>Thanks. {brandName()} will send you the vendor agreement and switch on your account.</p>}
        {msg && <p role="status" style={{ margin: 0 }}>{msg}</p>}
      </section>
    </div></main>
  );
}

export function VendorLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [msg, setMsg] = useState<string | null>(null);
  const e164 = () => { const d = phone.replace(/\D/g, ""); return d.length === 10 ? `+1${d}` : d.length === 11 && d.startsWith("1") ? `+${d}` : null; };
  const send = async () => {
    const p = e164(); if (!p) return setMsg("Enter your 10-digit mobile number.");
    try { await api("/api/auth/otp/start", { method: "POST", body: JSON.stringify({ phone: p, userType: "referrer" }) }); setStep("code"); setMsg(null); }
    catch (e) { setMsg(say(e, "Could not send the code.")); }
  };
  const verify = async () => {
    try {
      const r = await api<{ token: string }>("/api/auth/otp/verify", { method: "POST", body: JSON.stringify({ phone: e164(), code, userType: "referrer" }) });
      sessionStorage.setItem(TOKEN_KEY, r.token);
      navigate("/vendor", { replace: true });
    } catch (e) { setMsg(say(e, "That code did not work.")); }
  };
  return (
    <main className="partner-portal"><div className="pp-page">
      <PartnerHeader title="Vendor Portal" welcome="Log in with your mobile number." />
      <section className="pp-card" style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
        {step === "phone" ? (
          <div className="pp-row">
            <input aria-label="Mobile" placeholder="Mobile number" inputMode="tel" style={field} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button type="button" className="pp-btn pp-btn--primary" onClick={() => void send()}>Text me a code</button>
          </div>
        ) : (
          <div className="pp-row">
            <input aria-label="Code" placeholder="6-digit code" inputMode="numeric" style={field} value={code} onChange={(e) => setCode(e.target.value)} />
            <button type="button" className="pp-btn pp-btn--primary" onClick={() => void verify()}>Log in</button>
          </div>
        )}
        {msg && <p role="alert" className="pp-error" style={{ margin: 0 }}>{msg}</p>}
        <p className="pp-muted" style={{ margin: 0 }}>New vendor? <a href="/vendor/signup">Sign up</a></p>
      </section>
    </div></main>
  );
}

export function VendorHome() {
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [q, setQ] = useState({ customer_name: "", customer_email: "", customer_phone: "", equipment_description: "", amount: "", province: "", terms: "36, 48, 60" });
  const [quote, setQuote] = useState<{ options: PaymentOption[]; apply_link: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const m = await api<{ vendor: Me }>("/api/vendor-portal/me", { headers: auth() });
      setMe(m.vendor);
      setQ((x) => ({ ...x, province: x.province || m.vendor.province || "" }));
      setDeals((await api<{ deals: Deal[] }>("/api/vendor-portal/deals", { headers: auth() })).deals ?? []);
      setFees((await api<{ fees: Fee[] }>("/api/vendor-portal/fees", { headers: auth() })).fees ?? []);
    } catch (e) { setDeals([]); setMsg(say(e, "Could not load your portal. If you have not signed the vendor agreement yet, finish signing first.")); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const makeQuote = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ quote: { options: PaymentOption[] }; apply_link: string }>("/api/vendor-portal/quote", { method: "POST", headers: auth(), body: JSON.stringify({ ...q, province: q.province || null }) });
      setQuote({ options: r.quote.options, apply_link: r.apply_link });
    } catch (e) { setMsg(say(e, "Could not make the quote.")); } finally { setBusy(false); }
  };
  const uploadInvoice = async (d: Deal, f: File | undefined) => {
    if (!f) return;
    const fd = new FormData(); fd.append("file", f);
    const res = await rawApiFetch(`/api/vendor-portal/deals/${d.application_id}/invoice`, { method: "POST", body: fd, headers: auth() });
    const j = (await res.json().catch(() => ({}))) as { message?: string };
    setMsg(res.ok ? `Invoice sent for ${d.business_name ?? "the deal"}.` : j.message ?? "Upload failed.");
    if (res.ok) void load();
  };
  const signOut = () => { sessionStorage.removeItem(TOKEN_KEY); navigate("/vendor/login"); };
  const copy = (t: string) => { void navigator.clipboard?.writeText(t).then(() => setMsg("Apply link copied.")).catch(() => setMsg(t)); };

  return (
    <main className="partner-portal"><div className="pp-page">
      <PartnerHeader title={`Vendor Portal${me ? ` - ${me.company_name}` : ""}`} welcome={me?.contact_name ? `Welcome ${me.contact_name.split(/\s+/)[0]}` : null}
        actions={<button type="button" className="pp-btn" onClick={signOut}>Log out</button>} />
      {msg && <p role="status" className="pp-card" style={{ margin: "0 0 12px" }}>{msg}</p>}
      <section className="pp-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 className="pp-title">Quote a customer</h2>
        <p className="pp-muted" style={{ margin: 0 }}>Monthly payments from our lenders' rate cards, with sales tax. Estimates before credit approval - not an offer of credit.</p>
        <div className="pp-row">
          <input aria-label="Customer" placeholder="Customer business" style={field} value={q.customer_name} onChange={(e) => setQ({ ...q, customer_name: e.target.value })} />
          <input aria-label="Customer email" placeholder="Customer email" style={field} value={q.customer_email} onChange={(e) => setQ({ ...q, customer_email: e.target.value })} />
          <input aria-label="Customer mobile" placeholder="Customer mobile" style={field} value={q.customer_phone} onChange={(e) => setQ({ ...q, customer_phone: e.target.value })} />
        </div>
        <div className="pp-row">
          <input aria-label="Equipment" placeholder="Equipment" style={field} value={q.equipment_description} onChange={(e) => setQ({ ...q, equipment_description: e.target.value })} />
          <input aria-label="Price before tax" placeholder="Price before tax" inputMode="decimal" style={field} value={q.amount} onChange={(e) => setQ({ ...q, amount: e.target.value })} />
          <select aria-label="Customer province" style={field} value={q.province} onChange={(e) => setQ({ ...q, province: e.target.value })}>
            <option value="">Province</option>{PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input aria-label="Terms" placeholder="Terms in months" style={field} value={q.terms} onChange={(e) => setQ({ ...q, terms: e.target.value })} />
          <button type="button" className="pp-btn pp-btn--primary" disabled={busy} onClick={() => void makeQuote()}>{busy ? "Working..." : "Show payments"}</button>
        </div>
        {quote && (
          <div data-testid="vendor-quote" style={{ background: "var(--ui-surface-strong, #ffffff)", color: "var(--ui-text, #0f172a)", borderRadius: 8, padding: 8 }}>
            <OptionsGrid options={quote.options} />
            <div className="pp-row" style={{ marginTop: 8 }}>
              <span style={{ overflowWrap: "anywhere", fontSize: 13 }}>{quote.apply_link}</span>
              <button type="button" className="pp-btn" onClick={() => copy(quote.apply_link)}>Copy the customer's apply link</button>
            </div>
          </div>
        )}
      </section>
      <section className="pp-card">
        <h2 className="pp-title" style={{ marginBottom: 4 }}>Your deals</h2>
        {deals === null ? <p className="pp-muted">Loading...</p> : deals.length === 0 ? <p className="pp-muted">No deals yet. Send customers your apply link.</p> : deals.map((d) => (
          <article key={d.application_id} className="pp-card pp-card--inset" data-testid="vendor-deal" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div className="pp-subtitle" style={{ overflowWrap: "anywhere" }}>{d.business_name ?? "Customer"}{d.requested_amount ? ` - ${money(d.requested_amount)}` : ""}</div>
              {d.fee_amount && <div style={{ fontSize: 13 }}><span className="pp-muted">Your fee: </span>{money(d.fee_amount)} {d.fee_status === "paid" ? `paid ${d.paid_on ?? ""}` : "expected"}</div>}
            </div>
            <StageTracker stage={d.stage} label={`Stage for ${d.business_name ?? "the deal"}`} />
            <div className="pp-row" style={{ marginTop: 10 }}>
              <label className="pp-muted" style={{ fontSize: 13 }}>{d.invoices_sent ? `${d.invoices_sent} invoice${d.invoices_sent === 1 ? "" : "s"} sent. ` : ""}Upload the invoice
                <input type="file" accept="application/pdf,image/*" aria-label={`Invoice for ${d.business_name ?? "the deal"}`} style={{ marginLeft: 8 }} onChange={(e) => void uploadInvoice(d, e.target.files?.[0])} />
              </label>
            </div>
          </article>
        ))}
      </section>
      <section className="pp-card">
        <h2 className="pp-title" style={{ marginBottom: 4 }}>Your fees</h2>
        <p className="pp-muted" style={{ margin: "0 0 8px" }}>{me ? `You earn ${feeText(me)}.${me.fee_terms ? ` ${me.fee_terms}` : ""}` : ""}</p>
        {fees.length === 0 ? <p className="pp-muted">No fees yet.</p> : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>{fees.map((f) => <li key={f.id}>{f.business_name ?? "Deal"}: {money(f.fee_amount)} - {f.status === "paid" ? `paid ${f.paid_on ?? ""}` : f.status}</li>)}</ul>
        )}
      </section>
    </div></main>
  );
}

export default function VendorPortalRoutes() {
  const signedIn = Boolean(sessionStorage.getItem(TOKEN_KEY));
  return (
    <Routes>
      <Route path="signup" element={<VendorSignup />} />
      <Route path="login" element={<VendorLogin />} />
      <Route path="/" element={signedIn ? <VendorHome /> : <Navigate to="/vendor/login" replace />} />
      <Route path="*" element={<Navigate to="/vendor" replace />} />
    </Routes>
  );
}
