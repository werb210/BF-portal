// BF_PORTAL_v872_QUOTES - the application's "Quotes" tab (ported from KS-Portal #44, open to all staff). Staff turn
// the lender offers on the file into one quote for the client: each option's payment, fees (with a "sales tax" tick per
// fee, taxed at the quote's province - the business's province by default), funds received, total repaid, total cost of
// borrowing and an estimated APR, worked out by the server. Preview the branded PDF, send it (the client gets a button in the client app and a text or push,
// and the PDF is saved to Documents), and follow it: viewed, accepted (which option, by whom), declined, expired.
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import toast from "react-hot-toast";
import { FREQ_LABEL, QUOTE_STATUS, money, quotesApi, type Fee, type Frequency, type OfferOnFile, type Province, type Quote, type QuoteEvent, type QuoteOption } from "@/quotes/quotesApi";
import { primaryButton, secondaryButton } from "@/dealTools/ui";

const card: CSSProperties = { padding: 16, border: "1px solid var(--ui-border)", borderRadius: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)", marginBottom: 16 };
const muted: CSSProperties = { fontSize: 13, color: "var(--ui-text-muted)", margin: "4px 0 0" };
const input: CSSProperties = { padding: "6px 8px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13, width: "100%", boxSizing: "border-box" };
const label: CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--ui-text)", marginBottom: 3 };
const small: CSSProperties = { ...secondaryButton, padding: "4px 10px", fontSize: 12 };
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
const errText = (e: unknown, fallback: string) => (e as { data?: { message?: string } })?.data?.message || (e instanceof Error && e.message ? e.message : fallback);
const say = (fn: () => void) => { try { fn(); } catch { /* no toaster */ } };

export function QuoteChip({ status }: { status: Quote["status"] }) {
  const s = QUOTE_STATUS[status];
  return <span data-testid={`quote-chip-${status}`} style={{ padding: "2px 9px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: s.bg, color: s.fg, border: "1px solid rgba(0,0,0,0.12)" }}>{s.label}</span>;
}

const blankOption = (): QuoteOption => ({ offer_id: null, lender_name: "", product_name: null, amount: 0, term_months: 12, rate_kind: "interest_rate", rate: null, payment_frequency: "monthly", payment_amount: null, payment_overridden: false, fees: [], recommended: false, notes: null });
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

function OptionEditor({ o, i, onChange, onRemove, currency }: { o: QuoteOption; i: number; onChange: (o: QuoteOption) => void; onRemove: () => void; currency: string }) {
  const set = (patch: Partial<QuoteOption>) => onChange({ ...o, ...patch });
  const setFee = (k: number, patch: Partial<Fee>) => set({ fees: o.fees.map((f, j) => (j === k ? { ...f, ...patch } : f)) });
  const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 };
  return (
    <fieldset data-testid={`quote-option-${i}`} style={{ border: "1px solid var(--ui-border)", borderRadius: 10, padding: 12, margin: "0 0 12px" }}>
      <legend style={{ fontWeight: 700, fontSize: 13, color: "var(--ui-text)" }}>Option {i + 1}{o.offer_id ? " (from a lender offer)" : ""}</legend>
      <div style={grid}>
        <label><span style={label}>Lender</span><input aria-label={`Option ${i + 1} lender`} style={input} value={o.lender_name} onChange={(e) => set({ lender_name: e.target.value })} /></label>
        <label><span style={label}>Product (optional)</span><input style={input} value={o.product_name ?? ""} onChange={(e) => set({ product_name: e.target.value || null })} /></label>
        <label><span style={label}>Amount</span><input aria-label={`Option ${i + 1} amount`} style={input} inputMode="decimal" value={o.amount || ""} onChange={(e) => set({ amount: Number(e.target.value) || 0 })} /></label>
        <label><span style={label}>Term (months)</span><input aria-label={`Option ${i + 1} term`} style={input} inputMode="decimal" value={o.term_months ?? ""} onChange={(e) => set({ term_months: numOrNull(e.target.value) })} /></label>
        <label><span style={label}>Rate type</span>
          <select aria-label={`Option ${i + 1} rate type`} style={input} value={o.rate_kind} onChange={(e) => set({ rate_kind: e.target.value as QuoteOption["rate_kind"] })}>
            <option value="interest_rate">Interest rate (% a year)</option><option value="factor_rate">Factor rate</option>
          </select></label>
        <label><span style={label}>{o.rate_kind === "factor_rate" ? "Factor (e.g. 1.30)" : "Rate (% a year)"}</span><input aria-label={`Option ${i + 1} rate`} style={input} inputMode="decimal" value={o.rate ?? ""} onChange={(e) => set({ rate: numOrNull(e.target.value) })} /></label>
        <label><span style={label}>Payments</span>
          <select style={input} value={o.payment_frequency} onChange={(e) => set({ payment_frequency: e.target.value as Frequency })}>
            {(Object.keys(FREQ_LABEL) as Frequency[]).map((f) => <option key={f} value={f}>{FREQ_LABEL[f]}</option>)}
          </select></label>
        <label><span style={label}>Lender's payment (optional)</span><input aria-label={`Option ${i + 1} lender payment`} style={input} inputMode="decimal" placeholder="Worked out for you" value={o.payment_overridden ? o.payment_amount ?? "" : ""} onChange={(e) => { const v = numOrNull(e.target.value); set({ payment_amount: v, payment_overridden: v !== null && v > 0 }); }} /></label>
      </div>
      <div style={{ marginTop: 10 }}>
        <span style={label}>Fees</span>
        {o.fees.map((f, k) => (
          <div key={k} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
            <input aria-label="Fee name" placeholder="Fee name" style={{ ...input, width: 180 }} value={f.label} onChange={(e) => setFee(k, { label: e.target.value })} />
            <input aria-label="Fee amount" placeholder="Amount" style={{ ...input, width: 110 }} inputMode="decimal" value={f.amount || ""} onChange={(e) => setFee(k, { amount: Number(e.target.value) || 0 })} />
            <label style={{ fontSize: 12, color: "var(--ui-text)" }}><input type="checkbox" checked={f.deducted} onChange={(e) => setFee(k, { deducted: e.target.checked })} /> Taken from the funds</label>
            <label style={{ fontSize: 12, color: "var(--ui-text)" }}><input type="checkbox" checked={f.taxable === true} onChange={(e) => setFee(k, { taxable: e.target.checked })} /> Sales tax applies</label>
            <button type="button" style={small} onClick={() => set({ fees: o.fees.filter((_, j) => j !== k) })}>Remove</button>
          </div>
        ))}
        <button type="button" style={small} onClick={() => set({ fees: [...o.fees, { label: "", amount: 0, deducted: true, taxable: false }] })}>Add a fee</button>
      </div>
      <label style={{ display: "block", marginTop: 10 }}><span style={label}>Note for the client (optional)</span><input style={input} value={o.notes ?? ""} onChange={(e) => set({ notes: e.target.value || null })} /></label>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
        <label style={{ fontSize: 13, color: "var(--ui-text)" }}><input type="checkbox" checked={o.recommended} onChange={(e) => set({ recommended: e.target.checked })} /> Recommended</label>
        <button type="button" style={small} onClick={onRemove}>Remove option</button>
      </div>
      {o.id ? (
        <p style={{ ...muted, color: "var(--ui-text)" }} data-testid={`quote-option-${i}-math`}>
          Payment <strong>{money(o.payment_amount ?? null, currency)}</strong>{o.payment_count ? ` x ${o.payment_count}` : ""}{(o.tax_lines ?? []).map((t) => ` · ${t.label} on fees ${money(t.amount, currency)}`).join("")} · funds received {money(o.net_proceeds ?? null, currency)} · total repaid {money(o.total_repayment ?? null, currency)} · cost of borrowing <strong>{money(o.cost_of_borrowing ?? null, currency)}</strong>{o.estimated_apr !== null && o.estimated_apr !== undefined ? ` · est. APR ${o.estimated_apr.toFixed(2)}%` : ""}
        </p>
      ) : <p style={muted}>Save to see the payment and cost of borrowing.</p>}
    </fieldset>
  );
}

function Editor({ quote, provinces, onSaved }: { quote: Quote; provinces: Province[]; onSaved: (q: Quote) => void }) {
  const [title, setTitle] = useState(quote.title);
  const [province, setProvince] = useState(quote.tax_province ?? "");
  const [message, setMessage] = useState(quote.message ?? "");
  const [expires, setExpires] = useState(quote.expires_on ?? "");
  const [options, setOptions] = useState<QuoteOption[]>(quote.options);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setOptions(quote.options); }, [quote]);
  const save = async (): Promise<Quote | null> => {
    setBusy(true);
    try {
      const r = await quotesApi.save(quote.id, { title, message: message || null, expires_on: expires || null, tax_province: province || null, options });
      onSaved(r.quote);
      say(() => toast.success("Quote saved."));
      return r.quote;
    } catch (e) { say(() => toast.error(errText(e, "Could not save the quote."))); return null; }
    finally { setBusy(false); }
  };
  const send = async () => {
    if (!(await save())) return;
    setBusy(true);
    try { const r = await quotesApi.send(quote.id); onSaved(r.quote); say(() => toast.success("Quote sent to the client.")); }
    catch (e) { say(() => toast.error(errText(e, "Could not send the quote."))); }
    finally { setBusy(false); }
  };
  return (
    <section style={card} data-testid="quote-editor">
      <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Edit quote {quote.quote_number}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <label><span style={label}>Title</span><input style={input} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label><span style={label}>Valid until</span><input aria-label="Valid until" type="date" style={input} value={expires} onChange={(e) => setExpires(e.target.value)} /></label>
        <label><span style={label}>Sales tax on fees</span>
          <select aria-label="Sales tax province" style={input} value={province} onChange={(e) => setProvince(e.target.value)}>
            <option value="">No sales tax</option>
            {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select></label>
      </div>
      <p style={muted}>Only the fees ticked "Sales tax applies" are taxed, at the province's rate in Settings &gt; Deal tools. Interest and factor cost are never taxed.</p>
      <label style={{ display: "block", margin: "10px 0" }}><span style={label}>Message to the client (optional)</span><textarea style={{ ...input, minHeight: 60 }} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
      {options.map((o, i) => (
        <OptionEditor key={o.id ?? `new-${i}`} o={o} i={i} currency={quote.currency} onChange={(n) => setOptions(options.map((x, j) => (j === i ? n : x)))} onRemove={() => setOptions(options.filter((_, j) => j !== i))} />
      ))}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.length < 6 ? <button type="button" style={secondaryButton} onClick={() => setOptions([...options, blankOption()])}>Add an option</button> : null}
        <button type="button" style={secondaryButton} disabled={busy} onClick={() => void save()}>Save draft</button>
        <button type="button" style={primaryButton} disabled={busy || options.length === 0} onClick={() => void send()}>Send to client</button>
      </div>
    </section>
  );
}

function QuoteSummary({ q, onChanged, onEdit }: { q: Quote; onChanged: () => void; onEdit: (q: Quote) => void }) {
  const [events, setEvents] = useState<QuoteEvent[] | null>(null);
  const accepted = q.options.find((o) => o.id === q.accepted_option_id);
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); say(() => toast.success(ok)); onChanged(); } catch (e) { say(() => toast.error(errText(e, "That did not work."))); }
  };
  const preview = async () => {
    try { const blob = await quotesApi.pdf(q.id); const url = URL.createObjectURL(blob); window.open(url, "_blank", "noopener"); setTimeout(() => URL.revokeObjectURL(url), 60_000); }
    catch (e) { say(() => toast.error(errText(e, "Could not open the PDF."))); }
  };
  return (
    <li data-testid={`quote-${q.id}`} style={{ padding: "12px 0", borderTop: "1px solid var(--ui-border)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <strong>{q.quote_number}</strong><QuoteChip status={q.status} />
        <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>
          {q.options.length} option(s){q.expires_on ? ` · valid until ${q.expires_on}` : ""}{q.sent_at ? ` · sent ${when(q.sent_at)}` : ""}
          {q.view_count ? ` · viewed ${q.view_count} time(s), last ${when(q.last_viewed_at)}` : q.sent_at ? " · not opened yet" : ""}
        </span>
      </div>
      {accepted ? <p style={{ ...muted, color: "var(--ui-text)" }}>Accepted <strong>{accepted.lender_name}</strong> ({money(accepted.amount, q.currency)}) by {q.accepted_name} on {when(q.accepted_at)}. {accepted.offer_id ? "Confirm the acceptance on the Lenders tab to send the lender's documents for signing." : ""}</p> : null}
      {q.status === "declined" ? <p style={muted}>Declined {when(q.declined_at)}{q.decline_reason ? `: ${q.decline_reason}` : "."}</p> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {q.status === "draft" ? <button type="button" style={small} onClick={() => onEdit(q)}>Edit</button> : null}
        <button type="button" style={small} onClick={() => void preview()}>{q.status === "draft" ? "Preview PDF" : "PDF"}</button>
        {q.status !== "draft" ? <button type="button" style={small} onClick={() => void act(() => quotesApi.duplicate(q.id), "Copied to a new draft.")}>Duplicate</button> : null}
        {["draft", "sent", "viewed"].includes(q.status) ? <button type="button" style={small} onClick={() => void act(() => quotesApi.withdraw(q.id), "Quote withdrawn.")}>Withdraw</button> : null}
        <button type="button" style={small} onClick={() => void quotesApi.get(q.id).then((r) => setEvents(r.events)).catch(() => setEvents([]))}>History</button>
      </div>
      {events ? (
        <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--ui-text)" }}>
          {events.map((e, i) => <li key={i}>{when(e.at)}: {e.kind}{e.actor === "client" ? " by the client" : ""}</li>)}
        </ul>
      ) : null}
    </li>
  );
}

export default function QuotesTab({ applicationId }: { applicationId: string }) {
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [offers, setOffers] = useState<OfferOnFile[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const r = await quotesApi.list(applicationId); setQuotes(r.quotes); setOffers(r.offers); setProvinces(r.provinces ?? []); setErr(null); }
    catch (e) { setErr(errText(e, "Could not load quotes.")); setQuotes([]); }
  }, [applicationId]);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    try { const r = await quotesApi.create(applicationId, picked); setEditing(r.quote); setPicked([]); await load(); }
    catch (e) { say(() => toast.error(errText(e, "Could not start a quote."))); }
  };

  return (
    <div style={{ padding: 20 }} data-testid="quotes-tab">
      <section style={card}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>New quote</h3>
        <p style={muted}>Pick the lender offers to compare. Each becomes an option you can adjust (fees, payment, notes) before sending.</p>
        {offers.length === 0 ? <p style={muted}>No lender offers on this file yet. You can still start a blank quote and type the options in.</p> : (
          <ul style={{ listStyle: "none", padding: 0, margin: "8px 0" }}>
            {offers.map((o) => (
              <li key={o.id} style={{ fontSize: 13, color: "var(--ui-text)", padding: "3px 0" }}>
                <label><input type="checkbox" checked={picked.includes(o.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, o.id] : picked.filter((x) => x !== o.id))} />{" "}
                  <strong>{o.lender_name}</strong> {o.amount ? money(o.amount) : ""} {o.rate_factor ? `· ${o.rate_factor}` : ""} {o.term ? `· ${o.term}` : ""} {o.payment_frequency ? `· ${o.payment_frequency}` : ""}</label>
              </li>
            ))}
          </ul>
        )}
        <button type="button" style={primaryButton} onClick={() => void create()}>{picked.length ? `Start a quote from ${picked.length} offer(s)` : "Start a blank quote"}</button>
      </section>
      {editing && editing.status === "draft" ? <Editor quote={editing} provinces={provinces} onSaved={(q) => { setEditing(q.status === "draft" ? q : null); void load(); }} /> : null}
      <section style={card}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Quotes on this file</h3>
        {err ? <p role="alert" style={{ ...muted, color: "#b91c1c" }}>{err}</p> : null}
        {!quotes ? <p style={muted}>Loading…</p> : quotes.length === 0 ? <p style={muted}>No quotes yet.</p> : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {quotes.map((q) => <QuoteSummary key={q.id} q={q} onChanged={() => void load()} onEdit={setEditing} />)}
          </ul>
        )}
      </section>
    </div>
  );
}
