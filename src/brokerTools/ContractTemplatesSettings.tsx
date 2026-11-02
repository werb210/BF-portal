// BF_PORTAL_v867_BROKER_TOOLS_CONTRACTS - Settings > Deal tools > Contract templates: upload Word (.docx) templates with merge fields
// like {{business.legal_name}}. Admins upload and switch templates on and off; staff can look.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { Chip, ErrorLine, card, h3, input, label, muted, primaryButton, row, secondaryButton } from "./ui";
import { downloadFile, postFile, useRun } from "./useRun";

type Template = { id: string; name: string; file_name: string | null; fields: string[]; unknown_fields: string[]; active: boolean };

export default function ContractTemplatesSettings({ isAdmin }: { isAdmin: boolean }) {
  const [list, setList] = useState<Template[] | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [showFields, setShowFields] = useState(false);
  const load = useCallback(async () => { const r = await api.get<{ templates: Template[] }>("/api/deal-desk/contract-templates").catch(() => null); setList(r?.templates ?? []); }, []);
  const { busy, err, msg, run } = useRun(load);
  useEffect(() => { void load(); void api.get<{ fields: Record<string, string> }>("/api/deal-desk/merge-fields").then((r) => setFields(r?.fields ?? {})).catch(() => undefined); }, [load]);
  const upload = () => run(async () => { if (!file) throw new Error("Choose the Word file."); await postFile("/api/deal-desk/contract-templates", file, { name }); setFile(null); setName(""); }, "Template added.");

  return (
    <section style={card} data-testid="contract-templates-settings">
      <h3 style={h3}>Contract templates</h3>
      <p style={muted}>Word (.docx) files with merge fields in double braces, e.g. {"{{business.legal_name}}"} or {"{{structure.payment}}"}. A field the deal cannot fill is typed in when the contract is made.</p>
      <button type="button" style={{ ...secondaryButton, marginTop: 6 }} onClick={() => setShowFields((v) => !v)}>{showFields ? "Hide merge fields" : "Show merge fields"}</button>
      {showFields && (
        <ul style={{ fontSize: 13, columns: 2, margin: "8px 0", paddingLeft: 18 }} data-testid="merge-field-list">
          {Object.entries(fields).map(([k, v]) => <li key={k}><code>{`{{${k}}}`}</code> {v}</li>)}
        </ul>
      )}
      {list === null ? <p style={muted}>Loading...</p> : list.length === 0 ? <p style={muted}>No templates yet.</p> : list.map((t) => (
        <div key={t.id} style={{ borderTop: "1px solid var(--ui-border)", paddingTop: 8, marginTop: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong style={{ fontSize: 14 }}>{t.name}</strong>
            <Chip tone={t.active ? "green" : "grey"}>{t.active ? "Active" : "Off"}</Chip>
            <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>{t.fields.length} merge field{t.fields.length === 1 ? "" : "s"}</span>
          </div>
          {t.unknown_fields.length > 0 && <p style={muted}>Typed in on each deal: {t.unknown_fields.join(", ")}</p>}
          <div style={{ ...row, marginTop: 6 }}>
            <button type="button" style={secondaryButton} disabled={busy} onClick={() => void run(() => downloadFile(`/api/deal-desk/contract-templates/${t.id}/file`, t.file_name ?? `${t.name}.docx`))}>Download</button>
            {isAdmin && <button type="button" style={secondaryButton} disabled={busy} onClick={() => void run(() => api.patch(`/api/deal-desk/contract-templates/${t.id}`, { active: !t.active }))}>{t.active ? "Turn off" : "Turn on"}</button>}
          </div>
        </div>
      ))}
      {isAdmin && (
        <div style={{ ...row, marginTop: 12 }}>
          <label style={label}>Name<input style={input} value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label style={label}>Word file<input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ ...input, padding: 4 }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
          <button type="button" style={primaryButton} disabled={busy || !file} onClick={() => void upload()}>Upload template</button>
        </div>
      )}
      <ErrorLine text={err} />
      {msg && <p role="status" style={{ ...muted, color: "var(--ui-text)" }}>{msg}</p>}
    </section>
  );
}
