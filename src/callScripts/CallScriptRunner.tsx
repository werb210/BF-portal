// BF_PORTAL_v871_CALL_SCRIPTS - fill in a call script for a contact / application (and the live call). Answers are
// saved as you go ("Save") and "Finish" puts the summary on the contact's timeline and fills mapped custom fields.
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Notice, button, errText, input, muted, quiet } from "@/settingsPack/ui";
import { answerText, callScriptsApi, type Question, type Run, type RunTarget, type Script } from "./callScriptsApi";

type Props = RunTarget & { compact?: boolean; onFinished?: (run: Run) => void };
type Answers = { [id: string]: unknown };

const label: CSSProperties = { display: "block", fontSize: 14, fontWeight: 600, margin: "10px 0 4px", color: "var(--ui-text)" };

function QuestionField({ q, value, onChange }: { q: Question; value: unknown; onChange: (v: unknown) => void }) {
  const id = `csq-${q.id}`;
  const text = (props: Record<string, unknown> = {}) => <input id={id} value={value === undefined ? "" : String(value)} onChange={(e) => onChange(e.target.value)} style={input} {...props} />;
  let field;
  if (q.type === "long_text") field = <textarea id={id} rows={3} value={value === undefined ? "" : String(value)} onChange={(e) => onChange(e.target.value)} style={input} />;
  else if (q.type === "number" || q.type === "money") field = text({ inputMode: "decimal" });
  else if (q.type === "date") field = text({ type: "date" });
  else if (q.type === "yes_no") {
    field = (
      <select id={id} value={value === true ? "yes" : value === false ? "no" : ""} onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value === "yes")} style={input}>
        <option value="">Not answered</option><option value="yes">Yes</option><option value="no">No</option>
      </select>
    );
  } else if (q.type === "single_select") {
    field = (
      <select id={id} value={value === undefined ? "" : String(value)} onChange={(e) => onChange(e.target.value || undefined)} style={input}>
        <option value="">Not answered</option>{q.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else if (q.type === "multi_select") {
    const picked = Array.isArray(value) ? (value as string[]) : [];
    field = (
      <div role="group" aria-labelledby={`${id}-l`}>
        {q.options.map((o) => (
          <label key={o} style={{ display: "inline-flex", gap: 6, alignItems: "center", marginRight: 12, fontSize: 13 }}>
            <input type="checkbox" checked={picked.includes(o)} onChange={(e) => onChange(e.target.checked ? [...picked, o] : picked.filter((x) => x !== o))} />{o}
          </label>
        ))}
      </div>
    );
  } else field = text();
  return (
    <div data-testid={`question-${q.id}`}>
      <label htmlFor={id} id={`${id}-l`} style={label}>{q.label}{q.required ? " (required)" : ""}</label>
      {q.help && <p style={{ ...muted, margin: "0 0 4px" }}>{q.help}</p>}
      {field}
      {q.maps_to && <p style={{ ...muted, margin: "2px 0 0", fontSize: 12 }}>Saved to the {q.maps_to.object}&apos;s &quot;{q.maps_to.field}&quot; field when you finish.</p>}
    </div>
  );
}

export default function CallScriptRunner({ contact_id, application_id, call_sid, compact, onFinished }: Props) {
  const [scripts, setScripts] = useState<Script[] | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [past, setPast] = useState<Run[]>([]);
  const [showPast, setShowPast] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hasRecord = Boolean(contact_id || application_id);

  const loadPast = useCallback(async () => {
    if (!hasRecord) { setPast([]); return; }
    try { setPast((await callScriptsApi.runs({ contact_id, application_id })).runs); } catch { setPast([]); }
  }, [contact_id, application_id, hasRecord]);

  useEffect(() => {
    void callScriptsApi.list().then((r) => setScripts(r.scripts)).catch((e) => setErr(errText(e, "Could not load call scripts.")));
    void loadPast();
  }, [loadPast]);

  const pick = (id: string) => {
    setScript(scripts?.find((s) => s.id === id) ?? null); setRun(null); setAnswers({}); setOk(null); setErr(null);
  };

  const submit = async (finish: boolean) => {
    if (!script) return;
    setBusy(true); setErr(null); setOk(null);
    try {
      const r = run ? await callScriptsApi.save(run.id, answers, finish)
        : await callScriptsApi.start({ script_id: script.id, contact_id, application_id, call_sid, answers, finish });
      if (finish) {
        const fieldsNote = r.run.field_errors.length ? ` Some answers could not be saved to fields: ${r.run.field_errors.map((e) => e.error).join(" ")}` : "";
        setOk(`Finished. The answers are on the timeline.${r.run.field_updates.length ? ` ${r.run.field_updates.length} custom field${r.run.field_updates.length === 1 ? "" : "s"} updated.` : ""}`);
        if (fieldsNote) setErr(fieldsNote.trim());
        setRun(null); setAnswers({}); setScript(null);
        onFinished?.(r.run);
        await loadPast();
      } else { setRun(r.run); setOk("Saved."); }
    } catch (e) { setErr(errText(e, "Could not save the answers.")); } finally { setBusy(false); }
  };

  if (scripts && scripts.length === 0) return <p style={muted}>No call scripts yet. An Admin can add them in Settings &gt; Call scripts.</p>;
  return (
    <div data-testid="call-script-runner" style={{ color: "var(--ui-text)" }}>
      <label htmlFor="cs-pick" style={{ ...label, marginTop: 0 }}>Call script</label>
      <select id="cs-pick" value={script?.id ?? ""} onChange={(e) => pick(e.target.value)} style={input}>
        <option value="">Choose a script</option>
        {(scripts ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <Notice error={err} ok={ok} />
      {!hasRecord && script && <p style={muted}>This call is not linked to a contact, so answers are kept with the script only. Open the contact to save them to its timeline.</p>}
      {script && script.sections.map((s) => (
        <section key={s.id} style={{ marginTop: 12, paddingTop: 8, borderTop: "1px solid var(--ui-border)" }} aria-label={s.title}>
          <h4 style={{ margin: "0 0 4px", fontSize: compact ? 14 : 15, color: "var(--ui-text)" }}>{s.title}</h4>
          {s.body && <p style={{ ...muted, whiteSpace: "pre-wrap", margin: "0 0 4px", color: "var(--ui-text)" }}>{s.body}</p>}
          {s.questions.map((q) => <QuestionField key={q.id} q={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />)}
        </section>
      ))}
      {script && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button type="button" style={quiet} disabled={busy} onClick={() => void submit(false)}>Save</button>
          <button type="button" style={button} disabled={busy} onClick={() => void submit(true)}>Finish</button>
        </div>
      )}
      {!compact && past.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <h4 style={{ margin: "0 0 6px", fontSize: 14, color: "var(--ui-text)" }}>Past scripts</h4>
          {past.map((r) => (
            <div key={r.id} style={{ borderTop: "1px solid var(--ui-border)", padding: "6px 0" }} data-testid={`run-${r.id}`}>
              <button type="button" style={{ ...quiet, border: "none", padding: 0, background: "transparent" }} onClick={() => setShowPast(showPast === r.id ? null : r.id)}>
                {r.script_name} - {new Date(r.completed_at ?? r.created_at).toLocaleString()}{r.user_name ? ` - ${r.user_name}` : ""}{r.status === "in_progress" ? " (not finished)" : ""}
              </button>
              {showPast === r.id && r.sections.flatMap((s) => s.questions).filter((q) => r.answers[q.id] !== undefined).map((q) => (
                <div key={q.id} style={{ fontSize: 13 }}><strong>{q.label}:</strong> {answerText(q, r.answers[q.id])}</div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
