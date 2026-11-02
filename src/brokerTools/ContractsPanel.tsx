// BF_PORTAL_v867_BROKER_TOOLS_CONTRACTS - Deal desk > Contracts: pick a Word template, check the values it fills (type over any),
// add the signers, make the .docx and PDF, and send it for e-signature. Signed copies are filed on the application.
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import { Chip, ErrorLine, card, dangerButton, h3, input, label, muted, primaryButton, row, secondaryButton, type Tone } from "./ui";
import { downloadFile, useRun } from "./useRun";

type Template = { id: string; name: string; fields: string[]; unknown_fields: string[]; active: boolean };
type Signer = { name: string; email: string };
export type Contract = { id: string; name: string; status: "generated" | "sent" | "signed" | "cancelled"; missing: string[]; signers: (Signer & { role: string })[]; sent_at: string | null; signed_at: string | null; error: string | null; created_at: string };

const TONE: Record<Contract["status"], Tone> = { generated: "blue", sent: "amber", signed: "green", cancelled: "grey" };
const LABEL: Record<Contract["status"], string> = { generated: "Ready to send", sent: "Out for signature", signed: "Signed", cancelled: "Cancelled" };

/** The template's fields with no value from the deal: staff type these in. */
export function fieldsToFill(t: Template | undefined, values: Record<string, string>, typed: Record<string, string>): string[] {
  return t ? t.fields.filter((f) => !(values[f] ?? "").trim() || f in typed) : [];
}

export default function ContractsPanel({ applicationId }: { applicationId: string }) {
  const base = `/api/deal-desk/applications/${encodeURIComponent(applicationId)}/contracts`;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [tid, setTid] = useState("");
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [signers, setSigners] = useState<Signer[]>([{ name: "", email: "" }]);
  const load = useCallback(async () => {
    const r = await api.get<{ contracts: Contract[]; values: Record<string, string> }>(base).catch(() => null);
    setContracts(Array.isArray(r?.contracts) ? r!.contracts : []);
    if (r?.values) { setValues(r.values); setSigners((s) => (s.length === 1 && !s[0]!.name && !s[0]!.email ? [{ name: r.values["client.full_name"] ?? "", email: r.values["client.email"] ?? "" }] : s)); }
  }, [base]);
  const { busy, err, msg, run } = useRun(load);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void api.get<{ templates: Template[] }>("/api/deal-desk/contract-templates").then((r) => { const t = (r?.templates ?? []).filter((x) => x.active); setTemplates(t); setTid((v) => v || t[0]?.id || ""); }).catch(() => setTemplates([])); }, []);
  const template = useMemo(() => templates.find((t) => t.id === tid), [templates, tid]);
  const toFill = fieldsToFill(template, values, typed);

  const generate = () => run(() => api.post(base, { template_id: tid, values: typed, signers: signers.filter((s) => s.name || s.email) }), "Contract made. Check it, then send it for signature.");
  const act = (c: Contract, what: "send" | "refresh" | "cancel", ok: string) => run(() => api.post(`${base}/${c.id}/${what}`, {}), ok);
  const get = (c: Contract, kind: "docx" | "pdf" | "signed") => run(() => downloadFile(`${base}/${c.id}/${kind}`, `${c.name}.${kind === "docx" ? "docx" : "pdf"}`));

  return (
    <section style={card} data-testid="contracts-panel">
      <h3 style={h3}>Contracts</h3>
      <p style={muted}>Fill a Word template with this deal's details, then send the PDF for e-signature. Templates are set up in Settings &gt; Deal tools.</p>
      {templates.length === 0 ? <p style={muted}>No contract templates yet.</p> : (
        <>
          <div style={{ ...row, marginTop: 8 }}>
            <label style={label}>Template
              <select style={input} value={tid} onChange={(e) => { setTid(e.target.value); setTyped({}); }}>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          </div>
          {template && (
            <div style={{ marginTop: 8 }} data-testid="contract-values">
              <p style={muted}>{template.fields.length - toFill.length} of {template.fields.length} fields filled from the deal.{toFill.length ? " Type the rest:" : ""}</p>
              <div style={row}>
                {toFill.map((f) => (
                  <label key={f} style={label}>{f}<input aria-label={`Value for ${f}`} style={input} value={typed[f] ?? values[f] ?? ""} onChange={(e) => setTyped((x) => ({ ...x, [f]: e.target.value }))} /></label>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            {signers.map((s, i) => (
              <div key={i} style={{ ...row, marginTop: 4 }}>
                <label style={label}>Signer {i + 1} name<input style={input} value={s.name} onChange={(e) => setSigners(signers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></label>
                <label style={label}>Email<input type="email" style={input} value={s.email} onChange={(e) => setSigners(signers.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))} /></label>
                {signers.length > 1 && <button type="button" style={dangerButton} onClick={() => setSigners(signers.filter((_, j) => j !== i))}>Remove</button>}
              </div>
            ))}
            <div style={{ ...row, marginTop: 8 }}>
              <button type="button" style={secondaryButton} onClick={() => setSigners([...signers, { name: "", email: "" }])}>Add signer</button>
              <button type="button" style={primaryButton} disabled={busy || !tid} onClick={() => void generate()}>Make contract</button>
            </div>
          </div>
        </>
      )}
      <ErrorLine text={err} />
      {msg && <p role="status" style={{ ...muted, color: "var(--ui-text)" }}>{msg}</p>}
      {contracts && contracts.map((c) => (
        <div key={c.id} data-testid={`contract-${c.id}`} style={{ borderTop: "1px solid var(--ui-border)", paddingTop: 10, marginTop: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong style={{ fontSize: 14, overflowWrap: "anywhere" }}>{c.name}</strong>
            <Chip tone={TONE[c.status]}>{LABEL[c.status]}</Chip>
            <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>{c.signers.map((s) => s.name).join(", ")}</span>
          </div>
          {c.missing.length > 0 && <p style={{ ...muted, color: "var(--ui-text-danger)" }}>Left blank: {c.missing.join(", ")}</p>}
          {c.error && <p style={{ ...muted, color: "var(--ui-text-danger)" }}>Last send failed: {c.error}</p>}
          <div style={{ ...row, marginTop: 6 }}>
            <button type="button" style={secondaryButton} disabled={busy} onClick={() => void get(c, "docx")}>Word</button>
            <button type="button" style={secondaryButton} disabled={busy} onClick={() => void get(c, "pdf")}>PDF</button>
            {c.status === "signed" && <button type="button" style={secondaryButton} disabled={busy} onClick={() => void get(c, "signed")}>Signed PDF</button>}
            {c.status === "generated" && <button type="button" style={primaryButton} disabled={busy} onClick={() => { if (window.confirm(`Send to ${c.signers.map((s) => s.email).join(", ") || "the signers"} for signature?`)) void act(c, "send", "Sent for signature."); }}>Send for signature</button>}
            {c.status === "sent" && <button type="button" style={secondaryButton} disabled={busy} onClick={() => void act(c, "refresh", "Checked.")}>Check signatures</button>}
            {(c.status === "generated" || c.status === "sent") && <button type="button" style={dangerButton} disabled={busy} onClick={() => { if (window.confirm("Cancel this contract?")) void act(c, "cancel", "Cancelled."); }}>Cancel</button>}
          </div>
        </div>
      ))}
    </section>
  );
}
