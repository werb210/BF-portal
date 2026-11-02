// BF_PORTAL_v864_ACTIVE_CONTRACTS - equipment assets on the contract and insurance certificates (the renewal engine
// makes a task 30 days before a certificate expires, and again if it lapses).
import { useState } from "react";
import { acApi, errorText, type Detail } from "./api";
import { Btn, card, day, ErrorLine, Field, h3, input, money, muted, Pill, table, td, th } from "./ui";

const ASSET_FIELDS: Array<[string, string, string?]> = [
  ["description", "Description"], ["year", "Year", "number"], ["make", "Make"], ["model", "Model"], ["serial_number", "VIN / serial"],
  ["vendor", "Vendor"], ["cost", "Cost", "number"], ["location", "Location"],
];

export default function AssetsInsurance({ d, onChanged }: { d: Detail; onChanged: () => void }) {
  const c = d.contract;
  const [asset, setAsset] = useState<Record<string, string>>({});
  const [ins, setIns] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    setBusy(true); setErr(null);
    try { await fn(); after?.(); onChanged(); } catch (x) { setErr(errorText(x)); } finally { setBusy(false); }
  };
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  return (
    <>
      <ErrorLine text={err} />
      <div style={card}>
        <h3 style={h3}>Equipment</h3>
        {d.assets.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead><tr><th style={th}>Description</th><th style={th}>Year / Make / Model</th><th style={th}>VIN / Serial</th><th style={th}>Vendor</th><th style={th}>Cost</th><th style={th}>Location</th><th style={th} /></tr></thead>
              <tbody>{d.assets.map((a) => (
                <tr key={a.id}>
                  <td style={td}>{a.description}</td><td style={td}>{[a.year, a.make, a.model].filter(Boolean).join(" ") || "-"}</td><td style={td}>{a.serial_number ?? "-"}</td>
                  <td style={td}>{a.vendor ?? "-"}</td><td style={td}>{a.cost ? money(Number(a.cost)) : "-"}</td><td style={td}>{a.location ?? "-"}</td>
                  <td style={td}><Btn disabled={busy} onClick={() => { if (window.confirm("Remove this equipment from the contract?")) void run(() => acApi.removeAsset(c.id, a.id)); }}>Remove</Btn></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div style={muted}>No equipment recorded.</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6, marginTop: 8 }}>
          {ASSET_FIELDS.map(([k, l, t]) => <Field key={k} label={l}><input style={input} type={t ?? "text"} value={asset[k] ?? ""} onChange={(e) => setAsset({ ...asset, [k]: e.target.value })} /></Field>)}
        </div>
        <div style={{ marginTop: 6 }}><Btn disabled={busy || !asset.description} onClick={() => void run(() => acApi.addAsset(c.id, asset), () => setAsset({}))}>Add equipment</Btn></div>
      </div>
      <div style={card}>
        <h3 style={h3}>Insurance certificates</h3>
        {d.insurance.length === 0 ? <div style={muted}>No certificate on file.</div> : d.insurance.map((i) => (
          <div key={i.id} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 13, padding: "4px 0", color: "var(--ui-text)", opacity: i.replaced_at ? 0.6 : 1 }}>
            <strong>{i.insurer}</strong>{i.policy_number ? <span>Policy {i.policy_number}</span> : null}{i.coverage ? <span style={muted}>{i.coverage}</span> : null}
            <span>Expires {day(i.expires_on)}</span>
            {i.replaced_at ? <Pill kind="closed">Replaced</Pill> : i.expires_on && i.expires_on < today ? <Pill kind="default">Expired</Pill> : i.expires_on && i.expires_on <= soon ? <Pill kind="renewal_upcoming">Expiring soon</Pill> : <Pill kind="active">Current</Pill>}
            {i.document_id ? <Btn onClick={() => void acApi.openFile(c.id, i.document_id!).catch((x) => setErr(errorText(x)))}>Certificate</Btn> : null}
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 6, marginTop: 8 }}>
          <Field label="Insurer"><input style={input} value={ins.insurer ?? ""} onChange={(e) => setIns({ ...ins, insurer: e.target.value })} /></Field>
          <Field label="Policy number"><input style={input} value={ins.policy_number ?? ""} onChange={(e) => setIns({ ...ins, policy_number: e.target.value })} /></Field>
          <Field label="Coverage"><input style={input} value={ins.coverage ?? ""} onChange={(e) => setIns({ ...ins, coverage: e.target.value })} /></Field>
          <Field label="Expires"><input style={input} type="date" value={ins.expires_on ?? ""} onChange={(e) => setIns({ ...ins, expires_on: e.target.value })} /></Field>
          <Field label="Certificate file">
            <select style={input} value={ins.document_id ?? ""} onChange={(e) => setIns({ ...ins, document_id: e.target.value })}>
              <option value="">None (upload it above first)</option>
              {d.documents.contract_documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.filename}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ marginTop: 6 }}><Btn disabled={busy || !ins.insurer} onClick={() => void run(() => acApi.addInsurance(c.id, Object.fromEntries(Object.entries(ins).filter(([, v]) => v))), () => setIns({}))}>Record certificate</Btn></div>
      </div>
    </>
  );
}
