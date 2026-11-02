// BF_PORTAL_v870_CRM_DATA_MODEL - Settings > Pipelines (Admins, per business line): the lending
// pipeline's locked stages (probabilities only) and extra pipelines with their own stages, colours, probability and
// outcome (open / won / lost).
import { useCallback, useEffect, useState } from "react";
import { Notice, Section, button, cell, danger, errText, input, muted, quiet } from "@/settingsPack/ui";
import { pipelinesApi, textOn, type Outcome, type Pipeline, type PipelineList } from "./pipelinesApi";

type StageDraft = { id?: string; name: string; color: string; probability: number; outcome: Outcome; deals?: number };
type Draft = { id: string | null; name: string; stages: StageDraft[] };
const PALETTE = ["#1d4ed8", "#0f766e", "#b45309", "#7c3aed", "#15803d", "#b91c1c", "#4b5563"];
const starter = (): StageDraft[] => [
  { name: "New", color: "#1d4ed8", probability: 10, outcome: "open" },
  { name: "In progress", color: "#b45309", probability: 50, outcome: "open" },
  { name: "Won", color: "#15803d", probability: 100, outcome: "won" },
  { name: "Lost", color: "#4b5563", probability: 0, outcome: "lost" },
];

function StageEditor({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const set = (i: number, s: StageDraft) => setDraft({ ...draft, stages: draft.stages.map((x, j) => (j === i ? s : x)) });
  const move = (i: number, d: number) => { const st = [...draft.stages]; const [x] = st.splice(i, 1); st.splice(Math.max(0, Math.min(st.length, i + d)), 0, x!); setDraft({ ...draft, stages: st }); };
  return (
    <div data-testid="pipeline-editor">
      <label htmlFor="pl-name" style={{ fontSize: 13 }}>Pipeline name</label>
      <input id="pl-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={{ ...input, margin: "4px 0 10px", maxWidth: 320 }} />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={cell}>Stage</th><th style={cell}>Colour</th><th style={cell}>Probability %</th><th style={cell}>Counts as</th><th style={cell}></th></tr></thead>
        <tbody>
          {draft.stages.map((s, i) => (
            <tr key={s.id ?? `new-${i}`} data-testid={`stage-row-${i}`}>
              <td style={cell}><input aria-label={`Stage ${i + 1} name`} value={s.name} onChange={(e) => set(i, { ...s, name: e.target.value })} style={input} />{s.deals ? <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{s.deals} deal{s.deals === 1 ? "" : "s"}</div> : null}</td>
              <td style={cell}><input type="color" aria-label={`Stage ${i + 1} colour`} value={s.color} onChange={(e) => set(i, { ...s, color: e.target.value })} /></td>
              <td style={cell}><input type="number" min={0} max={100} aria-label={`Stage ${i + 1} probability`} value={s.probability} onChange={(e) => set(i, { ...s, probability: Number(e.target.value) })} style={{ ...input, width: 80 }} /></td>
              <td style={cell}>
                <select aria-label={`Stage ${i + 1} counts as`} value={s.outcome} onChange={(e) => set(i, { ...s, outcome: e.target.value as Outcome })} style={input}>
                  <option value="open">Open</option><option value="won">Won</option><option value="lost">Lost</option>
                </select>
              </td>
              <td style={{ ...cell, whiteSpace: "nowrap" }}>
                <button type="button" style={quiet} aria-label={`Move stage ${i + 1} up`} onClick={() => move(i, -1)}>Up</button>{" "}
                <button type="button" style={quiet} aria-label={`Move stage ${i + 1} down`} onClick={() => move(i, 1)}>Down</button>{" "}
                <button type="button" style={danger} aria-label={`Remove stage ${i + 1}`} onClick={() => setDraft({ ...draft, stages: draft.stages.filter((_, j) => j !== i) })}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" style={{ ...quiet, marginTop: 8 }} onClick={() => setDraft({ ...draft, stages: [...draft.stages, { name: "", color: PALETTE[draft.stages.length % PALETTE.length]!, probability: 0, outcome: "open" }] })}>Add stage</button>
    </div>
  );
}

export default function PipelinesSettings() {
  const [list, setList] = useState<PipelineList | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [probs, setProbs] = useState<{ [k: string]: number }>({});
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const r = await pipelinesApi.list();
      setList(r);
      setProbs(Object.fromEntries((r.pipelines.find((p) => p.system)?.stages ?? []).map((s) => [s.name, s.probability])));
    } catch (e) { setErr(errText(e, "Could not load pipelines.")); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const lending = list?.pipelines.find((p) => p.system);
  const extra = (list?.pipelines ?? []).filter((p) => !p.system);
  const save = async () => {
    if (!draft) return;
    setErr(null); setOk(null);
    const body = { name: draft.name, stages: draft.stages.map((s) => ({ id: s.id, name: s.name, color: s.color, probability: s.probability, outcome: s.outcome })) };
    try {
      if (draft.id) await pipelinesApi.update(draft.id, body); else await pipelinesApi.create(body);
      setOk("Pipeline saved."); setDraft(null); await load();
    } catch (e) { setErr(errText(e, "Could not save the pipeline.")); }
  };
  const archive = async (p: Pipeline) => {
    if (!window.confirm(`Archive the ${p.name} pipeline? It must be empty.`)) return;
    try { await pipelinesApi.archive(p.id); setOk(`${p.name} archived.`); await load(); } catch (e) { setErr(errText(e, "Could not archive the pipeline.")); }
  };
  const saveProbs = async () => {
    try { await pipelinesApi.lendingProbabilities(probs); setOk("Lending probabilities saved."); await load(); } catch (e) { setErr(errText(e, "Could not save the probabilities.")); }
  };

  return (
    <div data-testid="pipelines-settings">
      <Notice error={err} ok={ok} />
      {lending && (
        <Section id="lending-pipeline" title="Lending pipeline" intro="The built-in stages and their rules stay as they are. You can set each stage's probability for the weighted figures in reports.">
          <table style={{ borderCollapse: "collapse" }}>
            <tbody>
              {lending.stages.map((s) => (
                <tr key={s.id}>
                  <td style={cell}><span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, background: s.color, color: textOn(s.color), fontSize: 12, fontWeight: 700 }}>{s.name}</span> <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>(locked)</span></td>
                  <td style={cell}><input type="number" min={0} max={100} aria-label={`${s.name} probability`} value={probs[s.name] ?? 0} onChange={(e) => setProbs({ ...probs, [s.name]: Number(e.target.value) })} style={{ ...input, width: 80 }} /> %</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" style={{ ...button, marginTop: 8 }} onClick={() => void saveProbs()}>Save probabilities</button>
        </Section>
      )}
      <Section id="extra-pipelines" title="More pipelines" intro="For renewals, equipment leasing or anything that moves through different steps. Each pipeline belongs to the business line chosen in the top bar.">
        {draft ? <>
          <StageEditor draft={draft} setDraft={setDraft} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" style={button} onClick={() => void save()}>Save pipeline</button>
            <button type="button" style={quiet} onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </> : <>
          {extra.length === 0 && <p style={muted}>No other pipelines yet.</p>}
          {extra.map((p) => (
            <div key={p.id} data-testid={`pipeline-${p.id}`} style={{ borderTop: "1px solid var(--ui-border)", padding: "8px 0" }}>
              <strong>{p.name}</strong>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", margin: "6px 0" }}>
                {p.stages.map((s) => <span key={s.id} style={{ padding: "2px 8px", borderRadius: 6, background: s.color, color: textOn(s.color), fontSize: 12, fontWeight: 700 }}>{s.name} {s.probability}%</span>)}
              </div>
              <button type="button" style={quiet} onClick={() => setDraft({ id: p.id, name: p.name, stages: p.stages.map((s) => ({ id: s.id, name: s.name, color: s.color, probability: s.probability, outcome: s.outcome, deals: s.deals })) })}>Edit</button>{" "}
              <button type="button" style={danger} onClick={() => void archive(p)}>Archive</button>
            </div>
          ))}
          {list?.can_create ? <button type="button" style={{ ...button, marginTop: 8 }} onClick={() => setDraft({ id: null, name: "", stages: starter() })}>New pipeline</button>
            : list && <p style={muted}>{`You have the most pipelines this business line can hold (${list.limit ?? 50}). Archive one to add another.`}</p>}
        </>}
      </Section>
    </div>
  );
}
