// BF_PORTAL_v870_CRM_DATA_MODEL - on an application: which pipeline the deal is in, and moving it to a stage of another
// pipeline or back to Lending. Shown only once an Admin has added an extra pipeline (nothing changes before that).
import { useEffect, useState } from "react";
import { Notice, Section, button, errText, input } from "@/settingsPack/ui";
import { LENDING_ID, pipelinesApi, usePipelines } from "./pipelinesApi";

export default function PipelineMover({ applicationId }: { applicationId: string }) {
  const [reload, setReload] = useState(0);
  const list = usePipelines(reload);
  const [current, setCurrent] = useState<{ pipeline: string; stage: string | null }>({ pipeline: LENDING_ID, stage: null });
  const hasExtra = Boolean(list && list.pipelines.some((p) => !p.system && !p.archived_at));
  useEffect(() => {
    if (!hasExtra) return;
    void pipelinesApi.where(applicationId).then((r) => setCurrent({ pipeline: r.pipeline_id, stage: r.stage_id })).catch(() => setErr("Could not tell which pipeline this deal is in."));
  }, [applicationId, hasExtra]);
  const [target, setTarget] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const extra = (list?.pipelines ?? []).filter((p) => !p.system && !p.archived_at);
  if (!list || extra.length === 0) return null;
  const inPipeline = list.pipelines.find((p) => p.id === current.pipeline);
  const stageName = inPipeline && !inPipeline.system ? inPipeline.stages.find((s) => s.id === current.stage)?.name : null;
  const go = async () => {
    const [pid, sid] = target.split("|");
    if (!pid) return;
    setErr(null); setOk(null);
    try {
      const r = await pipelinesApi.move(applicationId, pid, sid || null);
      const p = list.pipelines.find((x) => x.id === r.pipeline_id);
      setCurrent({ pipeline: r.pipeline_id, stage: p && !p.system ? (p.stages.find((s) => s.name === r.stage)?.id ?? null) : null });
      setOk(`Moved to ${p?.name ?? "Lending"}: ${r.stage}.`); setTarget(""); setReload((n) => n + 1);
    } catch (e) { setErr(errText(e, "Could not move the deal.")); }
  };
  return (
    <Section id="pipeline-mover" title="Pipeline" intro={`This deal is in the ${inPipeline?.name ?? "Lending"} pipeline${stageName ? `, stage ${stageName}` : ""}.`}>
      <Notice error={err} ok={ok} />
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <select aria-label="Move this deal to" value={target} onChange={(e) => setTarget(e.target.value)} style={{ ...input, maxWidth: 320 }}>
          <option value="">Move this deal to...</option>
          {current.pipeline !== LENDING_ID && <option value={LENDING_ID}>Lending (back where it was)</option>}
          {extra.map((p) => (
            <optgroup key={p.id} label={p.name}>
              {p.stages.filter((s) => !(p.id === current.pipeline && s.id === current.stage)).map((s) => <option key={s.id} value={`${p.id}|${s.id}`}>{p.name}: {s.name}</option>)}
            </optgroup>
          ))}
        </select>
        <button type="button" style={button} disabled={!target} onClick={() => void go()}>Move</button>
      </div>
    </Section>
  );
}
