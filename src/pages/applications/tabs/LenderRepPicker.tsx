// BF_PORTAL_v960_LENDER_REPS - who at the lender is handling this file. Once the lender replies, pick their rep (or add
// a new one: name, position, email, direct phone). From then on everything sent to that lender for this file - the
// package again, the signed term sheet, the answered question form - goes to that rep only.
import { useState, type CSSProperties, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";

export type LenderRep = { id: string; lender_id: string; name: string; position: string | null; email: string; phone: string | null; phone_extension?: string | null };
export type FileLender = { lender_id: string; lender_name: string; rep_id: string | null; reps: LenderRep[] };
type Reply = { ok?: boolean; lenders?: FileLender[]; errors?: Record<string, string>; message?: string };

export const fileLenderRepsKey = (applicationId: string) => ["applications", applicationId, "lender-reps"] as const;
const ADD = "__add__";

const input: CSSProperties = { padding: "7px 9px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13, background: "var(--ui-surface-strong)", color: "var(--ui-text)", minHeight: 36, boxSizing: "border-box" };
const btn: CSSProperties = { padding: "7px 12px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-text)", cursor: "pointer", fontSize: 13, minHeight: 36 };
const small: CSSProperties = { fontSize: 12, color: "var(--ui-text-muted)" };

export const repLabel = (r: LenderRep) => `${r.name}${r.position ? `, ${r.position}` : ""}`;

function errorOf(e: unknown): { errors: Record<string, string>; message: string } {
  const d = (e as { details?: Reply })?.details;
  return { errors: d?.errors ?? {}, message: d?.message || Object.values(d?.errors ?? {})[0] || "That could not be saved. Please try again." };
}

export default function LenderRepPicker({ applicationId, lenderId, lenderName }: { applicationId: string; lenderId: string; lenderName: string }) {
  const qc = useQueryClient();
  const key = fileLenderRepsKey(applicationId);
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => ((await api.get<Reply>(`/api/portal/applications/${encodeURIComponent(applicationId)}/lender-reps`)) as Reply)?.lenders ?? [],
    staleTime: 30_000,
  });
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", position: "", email: "", phone: "", phone_extension: "" });

  const mine = (data ?? []).find((l) => l.lender_id === lenderId);
  if (!data || !mine) return null;
  const current = mine.reps.find((r) => r.id === mine.rep_id) ?? null;
  const take = (r: Reply | undefined) => { if (r?.lenders) qc.setQueryData(key, r.lenders); else void qc.invalidateQueries({ queryKey: key }); };

  async function choose(value: string) {
    setMsg(null);
    if (value === ADD) { setAdding(true); return; }
    setAdding(false); setBusy(true);
    try {
      take((await api.put<Reply>(`/api/portal/applications/${encodeURIComponent(applicationId)}/lenders/${encodeURIComponent(lenderId)}/rep`, { rep_id: value || null })) as Reply);
      setMsg(value ? "Saved. Everything for this file now goes to this rep only." : `Saved. This file goes to ${lenderName}'s usual address again.`);
    } catch (e) {
      setMsg(errorOf(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      take((await api.post<Reply>(`/api/portal/lenders/${encodeURIComponent(lenderId)}/reps`, { ...form, application_id: applicationId })) as Reply);
      setAdding(false);
      setForm({ name: "", position: "", email: "", phone: "", phone_extension: "" });
      setMsg("Saved. Everything for this file now goes to this rep only.");
    } catch (err) {
      setMsg(errorOf(err).message);
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const selectId = `lender-rep-${lenderId}`;

  return (
    <div data-testid={`lender-rep-${lenderId}`} style={{ marginTop: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <label htmlFor={selectId} style={{ fontSize: 13, color: "var(--ui-text)", fontWeight: 600 }}>Rep handling this file</label>
        <select id={selectId} style={input} disabled={busy} value={adding ? ADD : mine.rep_id ?? ""} onChange={(e) => void choose(e.target.value)}>
          <option value="">No one yet ({lenderName}&apos;s usual address)</option>
          {mine.reps.map((r) => <option key={r.id} value={r.id}>{repLabel(r)}</option>)}
          <option value={ADD}>Add a new rep...</option>
        </select>
        {current && !adding ? (
          <span style={small}>
            <a href={`mailto:${current.email}`} style={{ color: "inherit" }}>{current.email}</a>
            {current.phone ? <> {" · "} <a href={`tel:${current.phone}`} style={{ color: "inherit" }}>{current.phone}</a>{current.phone_extension ? ` ext. ${current.phone_extension}` : ""}</> : null}
          </span>
        ) : null}
      </div>
      {adding ? (
        <form onSubmit={add} noValidate style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 8 }}>
          <input aria-label="Rep's name" placeholder="Name" style={{ ...input, flex: "1 1 150px" }} value={form.name} onChange={set("name")} />
          <input aria-label="Rep's position" placeholder="Position" style={{ ...input, flex: "1 1 130px" }} value={form.position} onChange={set("position")} />
          <input aria-label="Rep's email" placeholder="Email" type="email" style={{ ...input, flex: "1 1 190px" }} value={form.email} onChange={set("email")} />
          <input aria-label="Rep's direct phone" placeholder="Direct phone" type="tel" style={{ ...input, flex: "1 1 140px" }} value={form.phone} onChange={set("phone")} />
          <input aria-label="Rep's extension" placeholder="Ext." inputMode="numeric" style={{ ...input, flex: "0 1 80px", width: 80 }} value={form.phone_extension} onChange={set("phone_extension")} />
          <button type="submit" style={btn} disabled={busy}>{busy ? "Saving..." : "Save rep"}</button>
          <button type="button" style={btn} onClick={() => { setAdding(false); setMsg(null); }}>Cancel</button>
        </form>
      ) : null}
      {msg ? <div role="status" style={{ ...small, marginTop: 6, color: "var(--ui-text)" }}>{msg}</div> : null}
    </div>
  );
}
