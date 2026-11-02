// BF_PORTAL_v870_CRM_DATA_MODEL - the board of an extra pipeline (Renewals, Equipment...): its own stages and colours,
// drag a card to another stage, move a deal to another pipeline (or back to Lending), weighted totals per stage.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TeamFilter from "@/teams/TeamFilter";
import { LENDING_ID, money, pipelinesApi, textOn, type BoardCard, type Pipeline } from "./pipelinesApi";

const num = (v: unknown) => { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; };

export default function CustomPipelineBoard({ pipeline, all, onChanged }: { pipeline: Pipeline; all: Pipeline[]; onChanged?: () => void }) {
  const [cards, setCards] = useState<BoardCard[] | null>(null);
  const [teamId, setTeamId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try { setCards((await pipelinesApi.board(pipeline.id, teamId)).cards); setErr(null); } catch { setErr("Could not load this pipeline."); setCards([]); }
  }, [pipeline.id, teamId]);
  useEffect(() => { void load(); }, [load]);

  const move = async (cardId: string, pipelineId: string, stageId: string | null) => {
    const before = cards;
    if (pipelineId === pipeline.id && stageId) setCards((cs) => (cs ?? []).map((c) => (c.id === cardId ? { ...c, stage_id: stageId, stage_entered_at: new Date().toISOString() } : c)));
    else setCards((cs) => (cs ?? []).filter((c) => c.id !== cardId));
    try { await pipelinesApi.move(cardId, pipelineId, stageId); onChanged?.(); } catch { setCards(before); setErr("The deal could not be moved. Please try again."); }
  };

  const others = all.filter((p) => p.id !== pipeline.id && !p.archived_at);
  return (
    <div data-testid="custom-pipeline-board">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <TeamFilter value={teamId} onChange={setTeamId} />
        {err && <span role="alert" style={{ padding: "4px 8px", borderRadius: 6, background: "#fee2e2", color: "#7f1d1d", fontSize: 13 }}>{err}</span>}
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12 }}>
        {pipeline.stages.map((s) => {
          const col = (cards ?? []).filter((c) => c.stage_id === s.id);
          const amount = col.reduce((n, c) => n + num(c.funded_amount ?? c.requested_amount), 0);
          return (
            <section key={s.id} aria-label={s.name} data-testid={`stage-${s.id}`}
              onDragOver={(e) => { e.preventDefault(); setOver(s.id); }} onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); if (dragging) void move(dragging, pipeline.id, s.id); setDragging(null); }}
              style={{ minWidth: 250, maxWidth: 250, flexShrink: 0, borderRadius: 10, outline: over === s.id ? `2px dashed ${s.color}` : "2px dashed transparent", outlineOffset: 4 }}>
              <div style={{ background: s.color, color: textOn(s.color), borderRadius: 8, padding: "6px 10px", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{s.name} ({col.length})</div>
                <div style={{ fontSize: 12 }}>{money(amount)}{s.outcome === "open" ? ` - ${s.probability}% = ${money((amount * s.probability) / 100)}` : s.outcome === "won" ? " won" : " lost"}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {col.map((c) => (
                  <article key={c.id} draggable onDragStart={() => setDragging(c.id)} onDragEnd={() => setDragging(null)} data-testid={`card-${c.id}`}
                    style={{ background: "var(--ui-surface-strong)", color: "var(--ui-text)", border: "1px solid var(--ui-border)", borderRadius: 8, padding: 10, cursor: "grab", opacity: dragging === c.id ? 0.4 : 1 }}>
                    <button type="button" onClick={() => navigate(`/applications/${c.id}`)} style={{ background: "transparent", border: "none", padding: 0, color: "var(--ui-text)", fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left" }}>{c.name}</button>
                    <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{money(num(c.funded_amount ?? c.requested_amount))}{c.contact_name ? ` - ${c.contact_name}` : ""}</div>
                    {(c.owner_first_name || c.owner_last_name) && <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Owner: {[c.owner_first_name, c.owner_last_name].filter(Boolean).join(" ")}</div>}
                    <label style={{ display: "block", fontSize: 12, marginTop: 6, color: "var(--ui-text)" }}>
                      Move to
                      <select aria-label={`Move ${c.name}`} value="" onChange={(e) => { const [pid, sid] = e.target.value.split("|"); if (pid) void move(c.id, pid, sid || null); }}
                        style={{ display: "block", width: "100%", marginTop: 2, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 12 }}>
                        <option value="">Choose a stage or pipeline</option>
                        {pipeline.stages.filter((x) => x.id !== s.id).map((x) => <option key={x.id} value={`${pipeline.id}|${x.id}`}>{x.name}</option>)}
                        {others.map((p) => p.id === LENDING_ID
                          ? <option key={p.id} value={LENDING_ID}>Back to Lending{c.lending_stage ? ` (${c.lending_stage})` : ""}</option>
                          : <option key={p.id} value={`${p.id}|`}>{p.name} pipeline</option>)}
                      </select>
                    </label>
                  </article>
                ))}
                {cards && col.length === 0 && <div style={{ fontSize: 12, color: "var(--ui-text-muted)", textAlign: "center", padding: "18px 8px", border: "1px dashed var(--ui-border)", borderRadius: 8 }}>No deals</div>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
