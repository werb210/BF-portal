// BF_PORTAL_MEETING_PARTICIPANTS_v737 - add people to a conference by typing a name: results
// come from CRM contacts and staff as you type; pick one to add it. Up to 10 people including
// you. Someone not in the CRM can be added by typing their email.
import { useEffect, useRef, useState } from "react";
import { api } from "@/api";

export type Person = { contactId?: string | null; userId?: string | null; name: string; email?: string | null; phone?: string | null; detail?: string; kind?: "contact" | "staff" };
const NAVY = "#0B1F3A", MUTED = "#51617D";
export const keyOf = (p: Person) => String(p.contactId || p.userId || p.email || p.name).toLowerCase();

export default function PeoplePicker({ value, onChange, max = 9 }: { value: Person[]; onChange: (next: Person[]) => void; max?: number }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const full = value.length >= max;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); return; }
    timer.current = setTimeout(() => {
      api.get<{ people?: Person[] }>("/api/meetings/people?q=" + encodeURIComponent(q.trim()))
        .then((r) => { setResults(Array.isArray(r?.people) ? r.people : []); setOpen(true); })
        .catch(() => setResults([]));
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  const add = (p: Person) => {
    if (full || value.some((v) => keyOf(v) === keyOf(p))) return;
    onChange([...value, p]); setQ(""); setResults([]); setOpen(false);
  };
  const typedEmail = /^[^@ ]+@[^@ ]+[.][^@ ]+$/.test(q.trim()) ? q.trim() : "";

  return (
    <div data-testid="people-picker" style={{ color: NAVY }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
        {value.map((p) => (
          <span key={keyOf(p)} data-testid="person-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: "#EEF2F8", fontSize: 13 }}>
            {p.name}{p.kind === "staff" ? " (staff)" : ""}
            <button type="button" aria-label={"Remove " + p.name} onClick={() => onChange(value.filter((v) => keyOf(v) !== keyOf(p)))} style={{ border: "none", background: "transparent", cursor: "pointer", color: MUTED, fontSize: 14 }}>x</button>
          </span>
        ))}
      </div>
      <div style={{ position: "relative" }}>
        <input aria-label="Add people" placeholder={full ? "Room is full (10 people including you)" : "Add people - type a name, company or email"} disabled={full}
          value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => { if (results.length) setOpen(true); }}
          style={{ width: "100%", padding: "8px 10px", border: "1px solid #E4EAF2", borderRadius: 8, color: NAVY, background: "#fff" }} />
        {open && (results.length > 0 || typedEmail) && (
          <div role="listbox" style={{ position: "absolute", zIndex: 20, left: 0, right: 0, top: "100%", marginTop: 4, background: "#fff", border: "1px solid #E4EAF2", borderRadius: 8, boxShadow: "0 6px 18px rgba(11,31,58,.12)", maxHeight: 260, overflowY: "auto" }}>
            {results.map((p) => (
              <button key={keyOf(p)} type="button" role="option" aria-selected="false" onClick={() => add(p)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: "none", background: "#fff", color: NAVY, cursor: "pointer" }}>
                <strong>{p.name}</strong>{p.detail ? <span style={{ color: MUTED, fontSize: 12 }}> - {p.detail}</span> : null}
              </button>
            ))}
            {typedEmail && !results.some((p) => (p.email ?? "").toLowerCase() === typedEmail.toLowerCase()) && (
              <button type="button" role="option" aria-selected="false" onClick={() => add({ name: typedEmail, email: typedEmail })}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: "none", background: "#fff", color: NAVY, cursor: "pointer" }}>
                Invite <strong>{typedEmail}</strong> (not in the CRM)
              </button>
            )}
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{value.length + 1} of 10 people (including you)</div>
    </div>
  );
}
