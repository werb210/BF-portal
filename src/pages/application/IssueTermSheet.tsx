// BF_PORTAL_v943_ISSUE_TERM_SHEET - Offer tab, "Give the client a term sheet" (Todd, Nov 11 2026): "offer tab should be
// simple. Either broker uploads the term sheets directly to the client or they upload the term sheet from the lender into
// a template term sheet, or they create a term sheet (where the broker buys the deal). then we should see the conditions
// either OCR from the lender supplied term sheet or created when the broker buys a deal."
//   1. Pick the lender (the lenders matched to this file), or "We buy the deal".
//   2. Lender: upload its term sheet - it is read straight away and the terms and conditions are filled in to check.
//      Send it as it is (lender named), or put the lender's terms on our template with our fees (lender named).
//   3. We buy the deal: type the terms, our rate, our fees and the conditions; our term sheet, no lender name.
// Saving creates the offer, applies the pricing, makes our term sheet when needed, and adds the ticked conditions.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { api } from "@/api";
import { getErrorMessage } from "@/utils/errors";
import { fetchLenderEnvelope, uploadLenderTermSheet } from "@/api/lenders";
import { readOfferFile, termSheetFields, type ReadCondition } from "@/offers/offerReaderApi";

type Way = "lender" | "template" | "ours";
type Cond = ReadCondition & { pick: boolean };
type Match = { id: string; lenderName?: string | null; productName?: string | null };

const card: CSSProperties = { padding: 16, border: "1px solid var(--ui-border)", borderRadius: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)", marginBottom: 16 };
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginTop: 10 };
const lab: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--ui-text-muted)" };
const inp: CSSProperties = { padding: "7px 9px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13 };
const btn: CSSProperties = { padding: "8px 14px", borderRadius: 8, border: "1px solid #1e3a8a", background: "#1e3a8a", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" };
const OURS = "__ours__";

const EMPTY = { amount: "", rate: "", term: "", payment: "", expiry: "", clientRate: "", brokerFee: "", setupFee: "", proceedsFee: "" };

export default function IssueTermSheet({ applicationId, onSaved }: { applicationId: string; onSaved: () => void }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [lender, setLender] = useState<string>("");
  const [way, setWay] = useState<Way>("lender");
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [conds, setConds] = useState<Cond[]>([]);
  const [newCond, setNewCond] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLenderEnvelope(applicationId).then((e: any) => { if (!cancelled) setMatches(Array.isArray(e?.matches) ? e.matches : []); }).catch(() => setMatches([]));
    return () => { cancelled = true; };
  }, [applicationId]);

  const buying = lender === OURS;
  const effectiveWay: Way = buying ? "ours" : way;
  const lenderName = useMemo(() => matches.find((m) => m.id === lender)?.lenderName ?? "", [matches, lender]);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function pick(file: File | null) {
    setFile(file); setMsg(null);
    if (!file) return;
    setReading(true);
    try {
      const r = await readOfferFile(applicationId, file);
      if (r?.read) {
        const t = termSheetFields(r.read);
        setF((x) => ({ ...x, amount: t.amount || x.amount, rate: t.rate || x.rate, term: t.term || x.term, payment: t.payment || x.payment, expiry: t.expiry || x.expiry }));
        setConds((r.read.conditions ?? []).map((c) => ({ ...c, pick: true })));
        setMsg({ ok: true, text: "Read from the term sheet. Check the terms and the conditions, then save." });
      }
    } catch (e) {
      setMsg({ ok: false, text: getErrorMessage(e, "The term sheet could not be read. Type the terms in.") });
    } finally { setReading(false); }
  }

  function addCond() {
    const t = newCond.trim();
    if (!t) return;
    setConds((c) => [...c, { title: t, description: null, owner: "client", requires_document: false, pick: true }]);
    setNewCond("");
  }

  async function save() {
    if (!lender) { setMsg({ ok: false, text: "Choose the lender, or We buy the deal." }); return; }
    if (!buying && !file) { setMsg({ ok: false, text: "Upload the lender's term sheet." }); return; }
    if (buying && (!f.amount.trim() || !f.clientRate.trim())) { setMsg({ ok: false, text: "Enter the amount and our rate." }); return; }
    setBusy(true); setMsg(null);
    try {
      let offerId: string | null = null;
      if (!buying) {
        const up = await uploadLenderTermSheet(applicationId, lender, file!, { amount: f.amount, rate_factor: f.rate, term: f.term, payment_frequency: f.payment, expiry_date: f.expiry });
        offerId = (up as { offer_id?: string } | null)?.offer_id ?? null;
      } else {
        const created = await api.post<{ offer?: { id?: string }; id?: string }>("/api/offers", {
          applicationId, lender: "Our term sheet", amount: f.amount, rate: f.rate || f.clientRate, term: f.term, payment_frequency: f.payment, expiry_date: f.expiry || undefined,
        });
        offerId = (created as any)?.offer?.id ?? (created as any)?.id ?? null;
      }
      if (!offerId) throw new Error("The offer was not saved.");
      if (effectiveWay !== "lender" || f.brokerFee || f.setupFee || f.proceedsFee) {
        await api.patch(`/api/offers/${encodeURIComponent(offerId)}/pricing`, {
          term_sheet_mode: effectiveWay, client_rate: effectiveWay === "ours" ? f.clientRate : null,
          broker_fee: f.brokerFee || null, setup_fee: f.setupFee || null, proceeds_fee: f.proceedsFee || null,
        });
      }
      let made = true;
      if (effectiveWay !== "lender") {
        made = await api.post(`/api/licensee-documents/offers/${encodeURIComponent(offerId)}/term-sheet`, {}).then(() => true).catch(() => false);
      }
      const picked = conds.filter((c) => c.pick).map(({ pick: _p, ...c }) => c);
      if (picked.length) {
        await api.post(`/api/broker-tools/applications/${encodeURIComponent(applicationId)}/conditions/confirm`, { offer_id: offerId, conditions: picked });
      }
      setMsg({ ok: true, text: made
        ? `Saved${picked.length ? ` with ${picked.length} condition${picked.length === 1 ? "" : "s"}` : ""}. Send it to the client for signature below.`
        : "Saved, but our term sheet could not be made: upload the template in Settings > Our term sheet, then press Make our term sheet on the offer." });
      setFile(null); setF(EMPTY); setConds([]); setLender("");
      onSaved();
    } catch (e) {
      setMsg({ ok: false, text: getErrorMessage(e, "The term sheet could not be saved. Try again.") });
    } finally { setBusy(false); }
  }

  return (
    <section style={card} data-testid="issue-term-sheet">
      <h3 style={{ margin: 0, fontSize: 16 }}>Give the client a term sheet</h3>
      <div style={grid}>
        <label style={lab}>Lender
          <select aria-label="Lender" value={lender} onChange={(e) => { setLender(e.target.value); setMsg(null); }} style={inp} data-testid="issue-lender">
            <option value="">Choose…</option>
            {matches.map((m) => <option key={m.id} value={m.id}>{m.lenderName ?? "Lender"}{m.productName ? ` - ${m.productName}` : ""}</option>)}
            <option value={OURS}>We buy the deal (our term sheet, no lender name)</option>
          </select>
        </label>
      </div>

      {lender && !buying ? (
        <div role="radiogroup" aria-label="How the client gets it" style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 12, fontSize: 13 }}>
          <label><input type="radio" name="issue-way" checked={way === "lender"} onChange={() => setWay("lender")} /> Send the lender's term sheet as it is</label>
          <label><input type="radio" name="issue-way" data-testid="issue-way-template" checked={way === "template"} onChange={() => setWay("template")} /> Put the lender's terms on our term sheet, with our fees</label>
        </div>
      ) : null}

      {lender && !buying ? (
        <label style={{ ...lab, marginTop: 12 }}>The lender's term sheet (read as soon as you choose it)
          <input type="file" aria-label="The lender's term sheet" accept=".pdf,.docx,.doc,image/*" onChange={(e) => void pick(e.target.files?.[0] ?? null)} data-testid="issue-file" />
        </label>
      ) : null}
      {reading ? <p style={{ fontSize: 13 }}>Reading the term sheet…</p> : null}

      {lender ? (
        <>
          <div style={grid}>
            <label style={lab}>Amount ($)<input aria-label="Amount" style={inp} value={f.amount} onChange={set("amount")} /></label>
            {buying
              ? <label style={lab}>Our rate to the client<input aria-label="Our rate" style={inp} value={f.clientRate} onChange={set("clientRate")} placeholder="e.g. 7 or 1.3" /></label>
              : <label style={lab}>Rate / factor<input aria-label="Rate" style={inp} value={f.rate} onChange={set("rate")} /></label>}
            {buying ? <label style={lab}>Lender's rate (internal, optional)<input aria-label="Lender's rate" style={inp} value={f.rate} onChange={set("rate")} placeholder="for the rate difference" /></label> : null}
            <label style={lab}>Term<input aria-label="Term" style={inp} value={f.term} onChange={set("term")} placeholder="e.g. 36 months" /></label>
            <label style={lab}>Payments
              <select aria-label="Payments" style={inp} value={f.payment} onChange={set("payment")}>
                <option value="">—</option><option>Monthly</option><option>Bi-weekly</option><option>Weekly</option><option>Daily</option>
              </select>
            </label>
            <label style={lab}>Expires<input aria-label="Expires" type="date" style={inp} value={f.expiry} onChange={set("expiry")} /></label>
            {effectiveWay !== "lender" ? <>
              <label style={lab}>Broker fee ($)<input aria-label="Broker fee" style={inp} value={f.brokerFee} onChange={set("brokerFee")} /></label>
              <label style={lab}>Set-up fee ($)<input aria-label="Set-up fee" style={inp} value={f.setupFee} onChange={set("setupFee")} /></label>
              <label style={lab}>Fee from proceeds ($)<input aria-label="Fee from proceeds" style={inp} value={f.proceedsFee} onChange={set("proceedsFee")} /></label>
            </> : null}
          </div>

          <div style={{ marginTop: 14 }}>
            <strong style={{ fontSize: 13 }}>Conditions {buying ? "(ours)" : "read from the term sheet"}</strong>
            <p style={{ fontSize: 12, color: "var(--ui-text-muted)", margin: "2px 0 6px" }}>Ticked conditions are added to the file. Client conditions show in the client portal.</p>
            {conds.length === 0 ? <p style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>None yet.</p> : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
                {conds.map((c, i) => (
                  <li key={`${c.title}-${i}`} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                    <input type="checkbox" aria-label={c.title} checked={c.pick} onChange={() => setConds((x) => x.map((y, j) => (j === i ? { ...y, pick: !y.pick } : y)))} />
                    <span style={{ flex: 1 }}>{c.title}</span>
                    <select aria-label={`Who: ${c.title}`} value={c.owner} onChange={(e) => setConds((x) => x.map((y, j) => (j === i ? { ...y, owner: e.target.value as Cond["owner"] } : y)))} style={{ ...inp, padding: "3px 6px" }}>
                      <option value="client">Client</option><option value="lender">Lender</option><option value="staff">Us</option>
                    </select>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <input aria-label="Add a condition" style={{ ...inp, flex: 1 }} value={newCond} onChange={(e) => setNewCond(e.target.value)} placeholder="Add a condition, e.g. Void cheque" onKeyDown={(e) => { if (e.key === "Enter") addCond(); }} />
              <button type="button" onClick={addCond} style={{ ...btn, background: "var(--ui-surface)", color: "var(--ui-text)", borderColor: "var(--ui-border)" }}>Add</button>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" style={btn} disabled={busy || reading} onClick={() => void save()} data-testid="issue-save">
              {busy ? "Saving…" : effectiveWay === "lender" ? `Save ${lenderName || "the lender"}'s term sheet` : effectiveWay === "template" ? "Save on our term sheet" : "Make our term sheet"}
            </button>
          </div>
        </>
      ) : null}
      {msg ? <p role={msg.ok ? "status" : "alert"} style={{ fontSize: 13, marginTop: 8, color: msg.ok ? "#166534" : "#b91c1c" }}>{msg.text}</p> : null}
    </section>
  );
}
