// BF_PORTAL_PRODUCT_QUESTIONS_v292
// Staff side of product questions (BF-Server v288/v289). Shows the questions a
// category change added (Line of Credit with Accord, Equipment), what the client
// has answered, and what is still waiting. Staff can correct an answer the
// client gave, and (BF_PORTAL_BLOCK_v469_STAFF_ANSWERS) answer a question the
// client left blank - e.g. a yes/no they gave over the phone (BF-Server v468).
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { useAuth } from "@/hooks/useAuth";
import { canWrite } from "@/auth/can";

export type StaffQuestion = {
  id: string; key: string; label: string; type: string; section: string; required: boolean;
  options?: string[] | null; ownerIndex: number | null; ownerName: string | null; value: string; applies?: boolean;
};
export type StaffGaps = { set: string | null; setLabel: string | null; missing: string[]; submittedAt: string | null; questions: StaffQuestion[] };

export function waitingMessage(g: StaffGaps | null): string | null {
  if (!g?.set || !g.missing.length) return null;
  return `Waiting on client: ${g.missing.length} ${g.setLabel} question${g.missing.length === 1 ? "" : "s"} still need answers before this can be sent to lenders.`;
}

export function groupTitle(q: StaffQuestion): string {
  if (q.section === "owner") return q.ownerName ? `Owner: ${q.ownerName}` : `Owner ${(q.ownerIndex ?? 0) + 1}`;
  return q.section === "risk" ? "Risk questions" : q.section === "equipment" ? "Equipment" : "Business";
}

export default function ProductQuestionsPanel({ applicationId }: { applicationId: string }) {
  const { user } = useAuth();
  const canEdit = canWrite((user as { role?: string | null } | null)?.role ?? null);
  const [gaps, setGaps] = useState<StaffGaps | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<StaffGaps>(`/api/applications/${encodeURIComponent(applicationId)}/product-questions`);
      setGaps(r ?? null);
    } catch {
      setGaps(null);
    }
  }, [applicationId]);
  useEffect(() => { void load(); }, [load]);

  if (!gaps?.set) return null;
  const visible = gaps.questions.filter((q) => q.applies !== false);
  const waiting = waitingMessage(gaps);

  const save = async (q: StaffQuestion) => {
    setError(null);
    try {
      await api.patch(`/api/applications/${encodeURIComponent(applicationId)}/product-questions`, { answers: { [q.id]: draft } });
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the change.");
    }
  };

  let lastGroup = "";
  return (
    <section data-testid="product-questions-panel" style={{ border: "1px solid var(--ui-border-soft)", borderRadius: 8, padding: 16, margin: "12px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 16 }}>{gaps.setLabel} questions</strong>
        <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>
          {gaps.submittedAt ? `Submitted by client ${new Date(gaps.submittedAt).toLocaleString()}` : "Not yet submitted by client"}
        </span>
      </div>
      {waiting && <div role="status" style={{ marginTop: 8, padding: "8px 10px", borderRadius: 6, background: "#fef3c7", color: "#92400e", fontSize: 13 }}>{waiting}</div>}
      {error && <div role="alert" style={{ marginTop: 8, color: "#b91c1c", fontSize: 13 }}>{error}</div>}
      <div style={{ marginTop: 10 }}>
        {visible.map((q) => {
          const title = groupTitle(q);
          const header = title !== lastGroup ? <div style={{ fontWeight: 600, fontSize: 13, marginTop: 10, color: "var(--ui-text-muted)" }}>{title}</div> : null;
          lastGroup = title;
          const isEditing = editing === q.id;
          return (
            <div key={q.id}>
              {header}
              <div data-question-id={q.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--ui-border-soft)", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 260px", fontSize: 14 }}>{q.label}{q.required ? " *" : ""}</div>
                {isEditing ? (
                  <>
                    {q.options?.length ? (
                      <select aria-label={`Edit ${q.label}`} value={draft} onChange={(e) => setDraft(e.target.value)}>
                        {!draft && <option value="">Choose...</option>}
                        {q.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : q.type === "yesno" ? (
                      <select aria-label={`Edit ${q.label}`} value={draft} onChange={(e) => setDraft(e.target.value)}>
                        {!draft && <option value="">Choose...</option>}
                        <option value="Yes">Yes</option><option value="No">No</option>
                      </select>
                    ) : (
                      <input aria-label={`Edit ${q.label}`} value={draft} onChange={(e) => setDraft(e.target.value)} />
                    )}
                    <button type="button" onClick={() => void save(q)} disabled={!draft.trim()}>Save</button>
                    <button type="button" onClick={() => setEditing(null)}>Cancel</button>
                  </>
                ) : q.value ? (
                  <>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{q.value}</span>
                    {canEdit && <button type="button" aria-label={`Edit ${q.label}`} onClick={() => { setEditing(q.id); setDraft(q.value); }}>Edit</button>}
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 13, color: q.required ? "#92400e" : "var(--ui-text-muted)" }}>{q.required ? "Waiting on client" : "Not answered"}</span>
                    {/* BF_PORTAL_BLOCK_v469_STAFF_ANSWERS - staff can fill in a blank answer. */}
                    {canEdit && <button type="button" aria-label={`Answer ${q.label}`} onClick={() => { setEditing(q.id); setDraft(""); }}>Answer</button>}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
