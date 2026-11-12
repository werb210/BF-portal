// BF_PORTAL_v946_OFFER_STEPS - Offer tab, step 1 "Term sheet" (Todd, Nov 12 2026): "the broker needs to pick the lender's
// term sheet or their template. That template needs to be uploaded by the brokerage in set up."
//   1. Who is the lender? One of the lenders matched to this file, or "No outside lender: we are funding this ourselves".
//   2. How will the client get it? Two choices:
//        The lender's term sheet  - sent as the lender wrote it; the client sees the lender's name.
//        Our term sheet template  - the terms on the brokerage's own template (Settings > Term sheet templates), with our rate
//                                   and fees. The lender is named when there is one; not when we fund it ourselves.
//      The template choice is switched off, with a link to Settings, until the brokerage has uploaded its template.
//   3. The lender's file is read as soon as it is chosen: the figures and the conditions are filled in to check.
// Saving creates the offer, applies our rate and fees, fills the template when chosen, and adds the ticked conditions.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import { getErrorMessage } from "@/utils/errors";
import { fetchLenderEnvelope, uploadLenderTermSheet } from "@/api/lenders";
import { readOfferFile, termSheetFields, type ReadCondition } from "@/offers/offerReaderApi";

type Sheet = "lender" | "template";
type Cond = ReadCondition & { pick: boolean };
type Match = { id: string; lenderName?: string | null; productName?: string | null };

const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 12 };
const lab: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--ui-text-muted)" };
const inp: CSSProperties = { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 14 };
const btn: CSSProperties = { padding: "9px 16px", borderRadius: 8, border: "1px solid #1e3a8a", background: "#1e3a8a", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" };
const plain: CSSProperties = { ...btn, background: "var(--ui-surface)", color: "var(--ui-text)", borderColor: "var(--ui-border)" };
const OURS = "__ours__";
const OWNER_LABEL: Record<Cond["owner"], string> = { client: "Client", lender: "Lender", staff: "Us" };

const EMPTY = { amount: "", rate: "", term: "", payment: "", expiry: "", clientRate: "", brokerFee: "", setupFee: "", proceedsFee: "", lenderCommission: "" };

function Choice({ on, disabled, title, text, onPick, testId, children }: { on: boolean; disabled?: boolean; title: string; text: string; onPick: () => void; testId: string; children?: React.ReactNode }) {
  return (
    <div style={{ flex: "1 1 260px", border: on ? "2px solid #1e3a8a" : "1px solid var(--ui-border)", borderRadius: 11, padding: on ? "10px 12px" : "11px 13px", background: on ? "rgba(30,58,138,0.06)" : "var(--ui-surface)", opacity: disabled ? 0.6 : 1 }}>
      <label style={{ display: "flex", gap: 9, alignItems: "flex-start", cursor: disabled ? "not-allowed" : "pointer" }}>
        <input type="radio" name="issue-sheet" checked={on} disabled={disabled} onChange={onPick} data-testid={testId} style={{ marginTop: 3 }} />
        <span><strong style={{ display: "block", fontSize: 14 }}>{title}</strong><span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>{text}</span></span>
      </label>
      {children}
    </div>
  );
}

export default function IssueTermSheet({ applicationId, onSaved, onCancel }: { applicationId: string; onSaved: () => void; onCancel?: () => void }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [hasTemplate, setHasTemplate] = useState<boolean | null>(null);
  const [lender, setLender] = useState<string>("");
  const [sheet, setSheet] = useState<Sheet>("lender");
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
    // Has the brokerage uploaded its term sheet template? (Settings > Term sheet templates)
    api.get<{ documents?: Array<{ kind?: string; active?: boolean }> }>("/api/licensee-documents")
      .then((r) => { if (!cancelled) setHasTemplate((r?.documents ?? []).some((d) => d.kind === "term_sheet" && d.active !== false)); })
      .catch(() => { if (!cancelled) setHasTemplate(false); });
    return () => { cancelled = true; };
  }, [applicationId]);

  const self = lender === OURS; // no outside lender: only our template applies
  const useTemplate = self || sheet === "template";
  const mode: "lender" | "template" | "ours" = self ? "ours" : useTemplate ? "template" : "lender";
  const lenderName = useMemo(() => matches.find((m) => m.id === lender)?.lenderName ?? "", [matches, lender]);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function pick(chosen: File | null) {
    setFile(chosen); setMsg(null);
    if (!chosen) return;
    setReading(true);
    try {
      const r = await readOfferFile(applicationId, chosen);
      if (r?.read) {
        const t = termSheetFields(r.read);
        setF((x) => ({ ...x, amount: t.amount || x.amount, rate: t.rate || x.rate, term: t.term || x.term, payment: t.payment || x.payment, expiry: t.expiry || x.expiry }));
        setConds((r.read.conditions ?? []).map((c) => ({ ...c, pick: true })));
        setMsg({ ok: true, text: "Read. Check the figures and the conditions, then save." });
      }
    } catch (e) {
      setMsg({ ok: false, text: getErrorMessage(e, "The term sheet could not be read. Type the figures in.") });
    } finally { setReading(false); }
  }

  function addCond() {
    const t = newCond.trim();
    if (!t) return;
    setConds((c) => [...c, { title: t, description: null, owner: "client", requires_document: false, pick: true }]);
    setNewCond("");
  }

  async function save() {
    if (!lender) { setMsg({ ok: false, text: "Choose the lender." }); return; }
    if (useTemplate && hasTemplate === false) { setMsg({ ok: false, text: "Upload your term sheet template in Settings > Term sheet templates first." }); return; }
    if (!self && !file) { setMsg({ ok: false, text: "Choose the lender's term sheet file." }); return; }
    if (self && (!f.amount.trim() || !f.clientRate.trim())) { setMsg({ ok: false, text: "Enter the amount and our rate." }); return; }
    setBusy(true); setMsg(null);
    try {
      let offerId: string | null = null;
      if (!self) {
        const up = await uploadLenderTermSheet(applicationId, lender, file!, { amount: f.amount, rate_factor: f.rate, term: f.term, payment_frequency: f.payment, expiry_date: f.expiry });
        offerId = (up as { offer_id?: string } | null)?.offer_id ?? null;
      } else {
        const created = await api.post<{ offer?: { id?: string }; id?: string }>("/api/offers", {
          applicationId, lender: "Our term sheet", amount: f.amount, rate: f.rate || f.clientRate, term: f.term, payment_frequency: f.payment, expiry_date: f.expiry || undefined,
        });
        offerId = (created as any)?.offer?.id ?? (created as any)?.id ?? null;
      }
      if (!offerId) throw new Error("The offer was not saved.");
      if (useTemplate || f.brokerFee || f.setupFee || f.proceedsFee || f.lenderCommission) {
        await api.patch(`/api/offers/${encodeURIComponent(offerId)}/pricing`, {
          term_sheet_mode: mode, client_rate: useTemplate ? f.clientRate || null : null,
          broker_fee: f.brokerFee || null, setup_fee: f.setupFee || null, proceeds_fee: f.proceedsFee || null, lender_commission: f.lenderCommission || null,
        });
      }
      let made = true;
      if (useTemplate) made = await api.post(`/api/licensee-documents/offers/${encodeURIComponent(offerId)}/term-sheet`, {}).then(() => true).catch(() => false);
      const picked = conds.filter((c) => c.pick).map(({ pick: _p, ...c }) => c);
      if (picked.length) await api.post(`/api/broker-tools/applications/${encodeURIComponent(applicationId)}/conditions/confirm`, { offer_id: offerId, conditions: picked });
      if (!made) setMsg({ ok: false, text: "Saved, but your template could not be filled in. Check it in Settings > Term sheet templates, then press Change on the term sheet and save again." });
      setFile(null); setF(EMPTY); setConds([]); setLender("");
      onSaved();
    } catch (e) {
      setMsg({ ok: false, text: getErrorMessage(e, "The term sheet could not be saved. Try again.") });
    } finally { setBusy(false); }
  }

  return (
    <div data-testid="issue-term-sheet">
      <label style={{ ...lab, maxWidth: 420 }}>Who is the lender?
        <select aria-label="Lender" value={lender} onChange={(e) => { setLender(e.target.value); setMsg(null); }} style={inp} data-testid="issue-lender">
          <option value="">Choose…</option>
          {matches.map((m) => <option key={m.id} value={m.id}>{m.lenderName ?? "Lender"}{m.productName ? ` - ${m.productName}` : ""}</option>)}
          <option value={OURS}>No outside lender: we are funding this ourselves</option>
        </select>
      </label>

      {lender ? (
        <>
          <div style={{ ...lab, marginTop: 14 }}>How will the client get it?</div>
          <div role="radiogroup" aria-label="How the client gets it" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
            <Choice on={!useTemplate} disabled={self} onPick={() => setSheet("lender")} testId="issue-sheet-lender" title="The lender's term sheet"
              text={self ? "Not available: there is no outside lender." : `Sent as ${lenderName || "the lender"} wrote it. The client sees the lender's name.`} />
            <Choice on={useTemplate} disabled={hasTemplate === false && !self} onPick={() => setSheet("template")} testId="issue-sheet-template" title="Our term sheet template"
              text={self ? "Our layout, our rate and fees. No lender is named." : "Our layout, our rate and fees. The lender is named."}>
              {hasTemplate === false ? (
                <p data-testid="issue-no-template" style={{ margin: "8px 0 0 26px", fontSize: 13, color: "#92400e" }}>
                  Your brokerage has not uploaded its template yet. <Link to="/settings/your-documents" style={{ color: "#1e3a8a", fontWeight: 600 }}>Upload it in Settings &gt; Term sheet templates</Link>.
                </p>
              ) : null}
            </Choice>
          </div>

          {!self ? (
            <div style={{ border: "1.5px dashed var(--ui-border)", borderRadius: 11, padding: 14, marginTop: 12 }}>
              <label style={lab}>The lender's term sheet (PDF, Word or a photo). It is read as soon as you choose it.
                <input type="file" aria-label="The lender's term sheet" accept=".pdf,.docx,.doc,image/*" onChange={(e) => void pick(e.target.files?.[0] ?? null)} data-testid="issue-file" />
              </label>
              {reading ? <p style={{ fontSize: 13, margin: "8px 0 0" }}>Reading the term sheet…</p> : null}
            </div>
          ) : null}

          <div style={grid}>
            <label style={lab}>Amount ($)<input aria-label="Amount" style={inp} value={f.amount} onChange={set("amount")} /></label>
            <label style={lab}>{self ? "Our cost of funds (optional)" : "Lender's rate or factor"}<input aria-label={self ? "Lender's rate" : "Rate"} style={inp} value={f.rate} onChange={set("rate")} /></label>
            {useTemplate ? <label style={lab}>Our rate to the client<input aria-label="Our rate" style={inp} value={f.clientRate} onChange={set("clientRate")} placeholder={self ? "e.g. 13.4 or 1.3" : "blank = the lender's rate"} /></label> : null}
            <label style={lab}>Term<input aria-label="Term" style={inp} value={f.term} onChange={set("term")} placeholder="e.g. 36 months" /></label>
            <label style={lab}>Payments
              <select aria-label="Payments" style={inp} value={f.payment} onChange={set("payment")}>
                <option value="">—</option><option>Monthly</option><option>Bi-weekly</option><option>Weekly</option><option>Daily</option>
              </select>
            </label>
            <label style={lab}>Offer expires<input aria-label="Expires" type="date" style={inp} value={f.expiry} onChange={set("expiry")} /></label>
          </div>
          <div style={grid}>
            <label style={lab}>Our broker fee ($)<input aria-label="Broker fee" style={inp} value={f.brokerFee} onChange={set("brokerFee")} /></label>
            <label style={lab}>Set-up fee ($)<input aria-label="Set-up fee" style={inp} value={f.setupFee} onChange={set("setupFee")} /></label>
            <label style={lab}>Fee taken from the funds ($)<input aria-label="Fee from proceeds" style={inp} value={f.proceedsFee} onChange={set("proceedsFee")} /></label>
            {!self ? <label style={lab}>Lender pays us ($)<input aria-label="Lender commission" style={inp} value={f.lenderCommission} onChange={set("lenderCommission")} /></label> : null}
          </div>
          <p style={{ fontSize: 12, color: "var(--ui-text-muted)", margin: "6px 0 0" }}>Leave a fee blank if it does not apply. What you earn on the deal is worked out when you save.</p>

          <div style={{ marginTop: 16 }}>
            <strong style={{ fontSize: 14 }}>Conditions before funding</strong>
            <p style={{ fontSize: 13, color: "var(--ui-text-muted)", margin: "2px 0 6px" }}>
              {conds.length ? `${conds.length} found. Untick any that do not apply.` : self ? "Add what the client must provide before you fund." : "None read yet. They appear here when the lender's term sheet is read."}
            </p>
            {conds.map((c, i) => (
              <div key={`${c.title}-${i}`} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, padding: "7px 2px", borderBottom: "1px solid var(--ui-border)" }}>
                <input type="checkbox" aria-label={c.title} checked={c.pick} onChange={() => setConds((x) => x.map((y, j) => (j === i ? { ...y, pick: !y.pick } : y)))} />
                <span style={{ flex: 1 }}>{c.title}</span>
                <select aria-label={`Who: ${c.title}`} value={c.owner} onChange={(e) => setConds((x) => x.map((y, j) => (j === i ? { ...y, owner: e.target.value as Cond["owner"] } : y)))} style={{ ...inp, padding: "4px 6px", fontSize: 13 }}>
                  {(Object.keys(OWNER_LABEL) as Array<Cond["owner"]>).map((k) => <option key={k} value={k}>{OWNER_LABEL[k]}</option>)}
                </select>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input aria-label="Add a condition" style={{ ...inp, flex: 1 }} value={newCond} onChange={(e) => setNewCond(e.target.value)} placeholder="Add a condition, e.g. Void cheque" onKeyDown={(e) => { if (e.key === "Enter") addCond(); }} />
              <button type="button" onClick={addCond} style={plain}>Add</button>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" style={btn} disabled={busy || reading} onClick={() => void save()} data-testid="issue-save">{busy ? "Saving…" : "Save the term sheet"}</button>
            {onCancel ? <button type="button" style={plain} onClick={onCancel}>Cancel</button> : null}
          </div>
        </>
      ) : onCancel ? <div style={{ marginTop: 12 }}><button type="button" style={plain} onClick={onCancel}>Cancel</button></div> : null}
      {msg ? <p role={msg.ok ? "status" : "alert"} style={{ fontSize: 13, marginTop: 8, color: msg.ok ? "#166534" : "#b91c1c" }}>{msg.text}</p> : null}
    </div>
  );
}
