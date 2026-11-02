// BF_PORTAL_v871_CALL_SCRIPTS - Settings > Call scripts (Admins): build scripts of sections (talking points) and
// questions with answer fields, optionally saved to a custom field (Settings > Properties). Starter intake scripts can
// be added with one click and edited. Ported from KS-Portal #41; scripts belong to the topbar silo.
import { useCallback, useEffect, useState } from "react";
import { Notice, Section, Toggle, button, cell, danger, errText, input, muted, quiet } from "@/settingsPack/ui";
import { callScriptsApi, type Question, type QuestionType, type Script, type ScriptsList, type Section as ScriptSection } from "./callScriptsApi";

const newId = () => Math.random().toString(36).slice(2, 10);
const blankQuestion = (): Question => ({ id: newId(), label: "", type: "text", options: [], required: false, help: "", maps_to: null });
const blankSection = (): ScriptSection => ({ id: newId(), title: "", body: "", questions: [blankQuestion()] });
type Draft = { id: string | null; name: string; description: string; use_for: string; sections: ScriptSection[] };

function Editor({ draft, setDraft, meta, onSave, onCancel, busy }: {
  draft: Draft; setDraft: (d: Draft) => void; meta: ScriptsList; onSave: () => void; onCancel: () => void; busy: boolean;
}) {
  const setSection = (i: number, s: ScriptSection) => setDraft({ ...draft, sections: draft.sections.map((x, j) => (j === i ? s : x)) });
  const move = <T,>(list: T[], i: number, d: number) => { const out = [...list]; const [x] = out.splice(i, 1); out.splice(Math.max(0, Math.min(out.length, i + d)), 0, x!); return out; };
  return (
    <div data-testid="script-editor">
      <label htmlFor="cs-name" style={{ fontSize: 13 }}>Script name</label>
      <input id="cs-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={{ ...input, margin: "4px 0 8px" }} />
      <label htmlFor="cs-desc" style={{ fontSize: 13 }}>When to use it</label>
      <input id="cs-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} style={{ ...input, margin: "4px 0 8px" }} />
      {draft.sections.map((s, si) => (
        <fieldset key={s.id} style={{ border: "1px solid var(--ui-border)", borderRadius: 10, padding: 12, margin: "10px 0" }}>
          <legend style={{ fontSize: 13, fontWeight: 700, color: "var(--ui-text)" }}>Section {si + 1}</legend>
          <label htmlFor={`cs-s${si}-title`} style={{ fontSize: 13 }}>Section title</label>
          <input id={`cs-s${si}-title`} value={s.title} onChange={(e) => setSection(si, { ...s, title: e.target.value })} style={{ ...input, margin: "4px 0 8px" }} />
          <label htmlFor={`cs-s${si}-body`} style={{ fontSize: 13 }}>Talking points</label>
          <textarea id={`cs-s${si}-body`} rows={3} value={s.body} onChange={(e) => setSection(si, { ...s, body: e.target.value })} style={{ ...input, margin: "4px 0 8px" }} />
          {s.questions.map((q, qi) => {
            const setQ = (n: Question) => setSection(si, { ...s, questions: s.questions.map((x, j) => (j === qi ? n : x)) });
            const pfx = `cs-s${si}-q${qi}`;
            const mapValue = q.maps_to ? `${q.maps_to.object}:${q.maps_to.field}` : "";
            return (
              <div key={q.id} style={{ borderTop: "1px dashed var(--ui-border)", paddingTop: 8, marginTop: 8 }} data-testid={pfx}>
                <label htmlFor={`${pfx}-label`} style={{ fontSize: 13 }}>Question {qi + 1}</label>
                <input id={`${pfx}-label`} value={q.label} onChange={(e) => setQ({ ...q, label: e.target.value })} style={{ ...input, margin: "4px 0 6px" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label htmlFor={`${pfx}-type`} style={{ fontSize: 13 }}>Answer type</label>
                    <select id={`${pfx}-type`} value={q.type} onChange={(e) => setQ({ ...q, type: e.target.value as QuestionType })} style={input}>
                      {meta.question_types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`${pfx}-map`} style={{ fontSize: 13 }}>Save answer to field</label>
                    <select id={`${pfx}-map`} value={mapValue} style={input} onChange={(e) => {
                      const [object, field] = e.target.value.split(":");
                      setQ({ ...q, maps_to: field ? { object: object as "contact" | "application", field } : null });
                    }}>
                      <option value="">Don&apos;t save to a field</option>
                      {(["contact", "application"] as const).map((o) => (meta.custom_fields[o] ?? []).length > 0 && (
                        <optgroup key={o} label={o === "contact" ? "Contact fields" : "Application fields"}>
                          {meta.custom_fields[o]!.map((f) => <option key={f.name} value={`${o}:${f.name}`}>{f.label}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
                {(q.type === "single_select" || q.type === "multi_select") && <>
                  <label htmlFor={`${pfx}-opts`} style={{ fontSize: 13 }}>Choices (one per line)</label>
                  <textarea id={`${pfx}-opts`} rows={3} value={q.options.join("\n")} onChange={(e) => setQ({ ...q, options: e.target.value.split("\n") })} style={{ ...input, marginTop: 4 }} />
                </>}
                <label htmlFor={`${pfx}-help`} style={{ fontSize: 13 }}>Hint for the caller (optional)</label>
                <input id={`${pfx}-help`} value={q.help} onChange={(e) => setQ({ ...q, help: e.target.value })} style={{ ...input, marginTop: 4 }} />
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Toggle id={`${pfx}-req`} label="Required to finish" checked={q.required} onChange={(required) => setQ({ ...q, required })} />
                  <button type="button" style={quiet} onClick={() => setSection(si, { ...s, questions: move(s.questions, qi, -1) })} aria-label={`Move question ${qi + 1} up`}>Up</button>
                  <button type="button" style={quiet} onClick={() => setSection(si, { ...s, questions: move(s.questions, qi, 1) })} aria-label={`Move question ${qi + 1} down`}>Down</button>
                  <button type="button" style={danger} onClick={() => setSection(si, { ...s, questions: s.questions.filter((_, j) => j !== qi) })}>Remove question</button>
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button type="button" style={quiet} onClick={() => setSection(si, { ...s, questions: [...s.questions, blankQuestion()] })}>Add question</button>
            <button type="button" style={quiet} onClick={() => setDraft({ ...draft, sections: move(draft.sections, si, -1) })}>Move section up</button>
            <button type="button" style={danger} onClick={() => setDraft({ ...draft, sections: draft.sections.filter((_, j) => j !== si) })}>Remove section</button>
          </div>
        </fieldset>
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" style={quiet} onClick={() => setDraft({ ...draft, sections: [...draft.sections, blankSection()] })}>Add section</button>
        <button type="button" style={button} disabled={busy} onClick={onSave}>Save script</button>
        <button type="button" style={quiet} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function CallScriptsSettings() {
  const [meta, setMeta] = useState<ScriptsList | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setMeta(await callScriptsApi.list(true)); } catch (e) { setErr(errText(e, "Could not load call scripts.")); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const edit = (s: Script | null) => {
    setErr(null); setOk(null);
    setDraft(s ? { id: s.id, name: s.name, description: s.description ?? "", use_for: s.use_for, sections: s.sections }
      : { id: null, name: "", description: "", use_for: "any", sections: [blankSection()] });
  };
  const save = async () => {
    if (!draft) return;
    setBusy(true); setErr(null);
    const body = { name: draft.name, description: draft.description, use_for: draft.use_for,
      sections: draft.sections.map((s) => ({ ...s, questions: s.questions.map((q) => ({ ...q, options: q.options.map((o) => o.trim()).filter(Boolean) })) })) };
    try {
      if (draft.id) await callScriptsApi.update(draft.id, body); else await callScriptsApi.create(body);
      setOk("Script saved."); setDraft(null); await load();
    } catch (e) { setErr(errText(e, "Could not save the script.")); } finally { setBusy(false); }
  };
  const act = async (s: Script, action: "archive" | "unarchive" | "duplicate") => {
    setErr(null); setOk(null);
    try { await callScriptsApi.action(s.id, action); await load(); } catch (e) { setErr(errText(e, "Could not update the script.")); }
  };
  const starters = async () => {
    try {
      const r = await callScriptsApi.starters();
      setOk(r.added.length ? `Added: ${r.added.join(", ")}.` : "The starter scripts are already here.");
      await load();
    } catch (e) { setErr(errText(e, "Could not add the starter scripts.")); }
  };

  return (
    <div data-testid="call-scripts-settings">
      <Section id="call-scripts-admin" title="Call scripts" intro={`Scripts show beside the dialler during a call and on contacts and applications. Staff fill in the answers; finished scripts go on the contact's timeline, and answers can fill your custom fields.${meta?.silo ? ` These are the ${meta.silo} scripts; switch the silo in the top bar for the others.` : ""}`}>
        <Notice error={err} ok={ok} />
        {draft && meta ? <Editor draft={draft} setDraft={setDraft} meta={meta} onSave={() => void save()} onCancel={() => setDraft(null)} busy={busy} /> : <>
          {meta && meta.scripts.length === 0 && <p style={muted}>No scripts yet. Start with the intake scripts and change them to suit you, or build your own.</p>}
          {meta && meta.scripts.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
              <tbody>
                {meta.scripts.map((s) => (
                  <tr key={s.id} data-testid={`script-${s.id}`}>
                    <td style={cell}><strong>{s.name}</strong>{s.archived_at ? " (archived)" : ""}<div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{s.description ?? ""} {s.sections.length} sections, {s.sections.reduce((n, x) => n + x.questions.length, 0)} questions</div></td>
                    <td style={{ ...cell, whiteSpace: "nowrap" }}>
                      {!s.archived_at && <button type="button" style={quiet} onClick={() => edit(s)}>Edit</button>}{" "}
                      <button type="button" style={quiet} onClick={() => void act(s, "duplicate")}>Duplicate</button>{" "}
                      <button type="button" style={s.archived_at ? quiet : danger} onClick={() => void act(s, s.archived_at ? "unarchive" : "archive")}>{s.archived_at ? "Restore" : "Archive"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={button} onClick={() => edit(null)}>New script</button>
            <button type="button" style={quiet} onClick={() => void starters()}>Add starter intake scripts</button>
          </div>
        </>}
      </Section>
    </div>
  );
}
