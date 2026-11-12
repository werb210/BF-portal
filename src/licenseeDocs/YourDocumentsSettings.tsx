// BF_PORTAL_v938_OUR_TERM_SHEET (ported from Keystone) - Settings > Term sheet templates: upload Boreal's own term sheet template.
// Each field is matched to the file and offer data; the admin checks the matches. Offer tab > Make our term sheet fills it.
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import { Chip, ErrorLine, card, h3, input, label, muted, primaryButton, row, secondaryButton, table, td, th } from "@/brokerTools/ui";
import { downloadFile, postFile, useRun } from "@/brokerTools/useRun";

type Kind = { key: string; label: string };
type DataField = { key: string; label: string };
type Field = { name: string; label: string; type: "text" | "checkbox" | "choice" | "signature"; options?: string[]; mapped_to: string | null; matched_by: string | null };
type Doc = { id: string; kind: string; name: string; file_name: string | null; format: string; fields: Field[]; active: boolean };
type Question = { id: string; document_id: string; key: string; label: string; type: string; options: string[]; required: boolean; active: boolean };
type Payload = { kinds: Kind[]; dataFields: DataField[]; documents: Doc[]; questions: Question[] };

const MATCHED_BY: Record<string, string> = { words: "matched", ai: "suggested", licensee: "set by you" };

export default function YourDocumentsSettings({ isAdmin }: { isAdmin: boolean }) {
  const [data, setData] = useState<Payload | null>(null);
  const [kind, setKind] = useState("term_sheet");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(async () => { const r = await api.get<Payload>("/api/licensee-documents").catch(() => null); setData(r ?? { kinds: [], dataFields: [], documents: [], questions: [] }); }, []);
  const { busy, err, msg, run } = useRun(load);
  useEffect(() => { void load(); }, [load]);
  const kindLabel = useMemo(() => Object.fromEntries((data?.kinds ?? []).map((k) => [k.key, k.label])), [data]);

  const upload = () => run(async () => {
    if (!file) throw new Error("Choose the file.");
    const r = await postFile<{ document: Doc }>("/api/licensee-documents", file, { kind, name });
    setFile(null); setName(""); setOpen(r.document.id);
  }, "Uploaded. Check the matches below.");

  if (!data) return <p style={muted}>Loading…</p>;
  return (
    <div data-testid="your-documents">
      <section style={card}>
        <h3 style={h3}>Our term sheet</h3>
        <p style={muted}>
          Upload our own term sheet, for deals we buy and sell on to a lender. We read every field and match it to the file and the
          offer (business, amount, our rate, term, payment, set-up fee, fee from proceeds). On an offer, &quot;Make our term sheet&quot; fills
          it in, and the client signs ours instead of the lender&apos;s, with no lender name. Upload a fillable PDF, or a Word file with
          fields written like {"{{business_name}}"}.
        </p>
        {isAdmin ? (
          <div style={{ ...row, marginTop: 12 }}>
            <label style={label}>What it is
              <select style={input} value={kind} onChange={(e) => setKind(e.target.value)} data-testid="doc-kind">
                {data.kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
              </select>
            </label>
            <label style={{ ...label, flex: 1, minWidth: 180 }}>Name (optional)
              <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Boreal term sheet" />
            </label>
            <label style={label}>File
              <input type="file" accept=".pdf,.docx,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} data-testid="doc-file" />
            </label>
            <button type="button" style={primaryButton} disabled={busy || !file} onClick={() => void upload()} data-testid="doc-upload">{busy ? "Reading…" : "Upload"}</button>
          </div>
        ) : <p style={muted}>An admin uploads and changes these.</p>}
        <ErrorLine text={err} />
        {msg ? <p role="status" style={{ ...muted, color: "var(--ui-text)" }}>{msg}</p> : null}
      </section>

      {data.documents.length === 0 ? <p style={muted}>No term sheet uploaded yet.</p> : null}
      {data.documents.map((d) => (
        <DocCard key={d.id} doc={d} kindLabel={kindLabel[d.kind] ?? d.kind} dataFields={data.dataFields} questions={data.questions.filter((q) => q.document_id === d.id)}
          isAdmin={isAdmin} open={open === d.id} onToggle={() => setOpen(open === d.id ? null : d.id)} reload={load} />
      ))}
    </div>
  );
}

function DocCard({ doc, kindLabel, dataFields, questions, isAdmin, open, onToggle, reload }: {
  doc: Doc; kindLabel: string; dataFields: DataField[]; questions: Question[]; isAdmin: boolean; open: boolean; onToggle: () => void; reload: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const { busy, err, msg, run } = useRun(reload);
  const fillable = doc.fields.filter((f) => f.type !== "signature");
  const matched = fillable.filter((f) => f.mapped_to).length;
  const extra = questions.filter((q) => q.active).length;
  const dirty = Object.keys(draft).length > 0;
  const save = () => run(async () => {
    await api.put(`/api/licensee-documents/${doc.id}/fields`, { fields: Object.entries(draft).map(([name, v]) => ({ name, mapped_to: v || null })) });
    setDraft({});
  }, "Saved. Fields left unmatched are asked in the client's application.");

  return (
    <section style={card} data-testid={`doc-${doc.id}`}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <h3 style={{ ...h3, margin: 0 }}>{doc.name}</h3>
        <Chip tone="grey">{kindLabel}</Chip>
        {doc.active ? <Chip tone="green">In use</Chip> : <Chip tone="grey">Not in use</Chip>}
        <span style={{ ...muted, margin: 0 }}>{matched} of {fillable.length} fields matched · {extra} extra question{extra === 1 ? "" : "s"} for the client</span>
        <span style={{ flex: 1 }} />
        <button type="button" style={secondaryButton} onClick={onToggle}>{open ? "Close" : "Check matches"}</button>
        <button type="button" style={secondaryButton} onClick={() => void run(() => downloadFile(`/api/licensee-documents/${doc.id}/file`, doc.file_name ?? "document"))}>Download</button>
        {isAdmin ? (
          <button type="button" style={secondaryButton} disabled={busy} onClick={() => void run(() => api.patch(`/api/licensee-documents/${doc.id}`, { active: !doc.active }), doc.active ? "Switched off. The standard document is used." : "In use.")}>
            {doc.active ? "Stop using" : "Use this"}
          </button>
        ) : null}
      </div>
      <ErrorLine text={err} />
      {msg ? <p role="status" style={{ ...muted, color: "var(--ui-text)" }}>{msg}</p> : null}
      {open ? (
        <>
          <div className="table-scroll" style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={table}>
              <caption style={{ textAlign: "left", ...muted, marginBottom: 6 }}>Each field on your document, and what fills it.</caption>
              <thead><tr><th style={th}>Field on your document</th><th style={th}>Filled with</th><th style={th}></th></tr></thead>
              <tbody>
                {doc.fields.map((f) => {
                  const value = draft[f.name] ?? f.mapped_to ?? "";
                  return (
                    <tr key={f.name}>
                      <td style={td}>{f.label}{f.label !== f.name ? <div style={{ ...muted, fontSize: 11 }}>{f.name}</div> : null}</td>
                      <td style={td}>
                        {f.type === "signature" ? <span style={muted}>Client signs here</span> : isAdmin ? (
                          <select aria-label={`What fills ${f.label}`} style={{ ...input, width: "100%" }} value={value} onChange={(e) => setDraft((d) => ({ ...d, [f.name]: e.target.value }))}>
                            <option value="">Ask the client (extra question)</option>
                            {dataFields.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                          </select>
                        ) : (dataFields.find((k) => k.key === f.mapped_to)?.label ?? "Asked in the application")}
                      </td>
                      <td style={td}>{f.type !== "signature" && !draft[f.name] && f.matched_by ? <span style={muted}>{MATCHED_BY[f.matched_by] ?? ""}</span> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {isAdmin ? <div style={{ ...row, marginTop: 10 }}><button type="button" style={primaryButton} disabled={busy || !dirty} onClick={() => void save()}>Save matches</button></div> : null}
          {questions.length ? <ExtraQuestions questions={questions} isAdmin={isAdmin} reload={reload} /> : null}
        </>
      ) : null}
    </section>
  );
}

const TYPE_LABEL: Record<string, string> = { text: "Text", yesno: "Yes / no", choice: "Pick one", date: "Date", number: "Number" };

function ExtraQuestions({ questions, isAdmin, reload }: { questions: Question[]; isAdmin: boolean; reload: () => Promise<void> }) {
  const { busy, err, run } = useRun(reload);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const patch = (q: Question, body: Record<string, unknown>) => run(() => api.patch(`/api/licensee-documents/questions/${q.id}`, body));
  return (
    <div style={{ marginTop: 16 }}>
      <h4 style={{ margin: "0 0 6px", fontSize: 15 }}>Extra questions in the client&apos;s application</h4>
      <p style={muted}>These are asked on the review step, because your document needs them and the standard application does not ask them.</p>
      <ErrorLine text={err} />
      {questions.map((q) => (
        <div key={q.id} style={{ ...row, alignItems: "center", marginTop: 8, opacity: q.active ? 1 : 0.6 }}>
          {isAdmin ? (
            <input aria-label="Question wording" style={{ ...input, flex: 1, minWidth: 200 }} value={edit[q.id] ?? q.label}
              onChange={(e) => setEdit((x) => ({ ...x, [q.id]: e.target.value }))}
              onBlur={() => { const v = (edit[q.id] ?? q.label).trim(); if (v && v !== q.label) void patch(q, { label: v }); }} />
          ) : <span style={{ flex: 1 }}>{q.label}</span>}
          <span style={muted}>{TYPE_LABEL[q.type] ?? q.type}</span>
          {isAdmin ? (
            <>
              <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={q.required} disabled={busy} onChange={(e) => void patch(q, { required: e.target.checked })} />Required</label>
              <button type="button" style={secondaryButton} disabled={busy} onClick={() => void patch(q, { active: !q.active })}>{q.active ? "Don't ask" : "Ask"}</button>
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}
