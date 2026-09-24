// BF_PORTAL_BLOCK_v462_BI_EMPTY_STEP_REPAIR
// BI-Server refuses to enroll contacts into a sequence whose email steps have no
// subject or message ("Open the sequence and pick an email template for each").
// There was no screen to do that for an existing sequence - sequences saved by
// older code (before template links were stored) were stuck. This lists the empty
// email steps with a template picker each, and saves through the step PATCH route,
// which copies the template's subject and message onto the step.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";

type Step = { id: string; position: number; type: string; subject: string | null; body: string | null };
type Template = { id: string; name: string; subject?: string | null };

export function isEmptyEmailStep(s: Step): boolean {
  return s.type === "email" && (!String(s.subject ?? "").trim() || !String(s.body ?? "").trim());
}

const unwrap = <T,>(r: any, key: string): T[] => {
  const v = r?.[key] ?? r?.data?.[key] ?? [];
  return Array.isArray(v) ? v : [];
};

export default function EmptyStepsRepair({ sequenceId, onFixed }: { sequenceId: string; onFixed: () => void }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, t] = await Promise.all([
      api.get<any>(`/api/v1/bi/marketing/sequences/${encodeURIComponent(sequenceId)}/steps`),
      api.get<any>("/api/v1/bi/marketing/templates?channel=email"),
    ]);
    const all = unwrap<Step>(s, "steps").sort((a, b) => Number(a.position) - Number(b.position));
    setSteps(all);
    setTemplates(unwrap<Template>(t, "items"));
    return all;
  }, [sequenceId]);

  useEffect(() => { load().catch((e: any) => setError(e?.message ?? "Could not load the sequence steps.")); }, [load]);

  const empty = steps.filter(isEmptyEmailStep);

  const save = async () => {
    setBusy(true); setError(null);
    try {
      for (const s of empty) {
        const templateId = picked[s.id];
        if (templateId) await api.patch(`/api/v1/bi/marketing/sequences/${encodeURIComponent(sequenceId)}/steps/${encodeURIComponent(s.id)}`, { template_id: templateId });
      }
      const after = await load();
      if (!after.some(isEmptyEmailStep)) onFixed();
      else setError("Some steps still have no subject or message. Pick a template that has both.");
    } catch (e: any) {
      setError(e?.message ?? "Could not save the templates.");
    } finally {
      setBusy(false);
    }
  };

  if (!steps.length && !error) return null;
  return (
    <div data-testid="bi-empty-steps-repair" className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm">
      <p className="font-semibold">Pick an email template for each empty step:</p>
      <div className="mt-2 grid gap-2">
        {empty.map((s) => (
          <label key={s.id} className="flex items-center gap-3">
            <span className="w-16 text-white/70">Step {steps.indexOf(s) + 1}</span>
            <select aria-label={`Template for step ${steps.indexOf(s) + 1}`} value={picked[s.id] ?? ""} onChange={(e) => setPicked((p) => ({ ...p, [s.id]: e.target.value }))} className="bg-brand-surface border border-card rounded-md px-2 py-1 flex-1">
              <option value="">Select an email template</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.subject ? ` - ${t.subject}` : ""}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" disabled={busy || empty.some((s) => !picked[s.id])} onClick={() => void save()} className="px-3 py-1 rounded-md bg-blue-500/30 hover:bg-blue-500/40 disabled:opacity-50">{busy ? "Saving..." : "Save templates"}</button>
        {error && <span className="text-red-300">{error}</span>}
      </div>
    </div>
  );
}
