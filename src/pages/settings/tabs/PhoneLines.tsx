// BF_PORTAL_PHONE_LINES_v689 - Settings -> Phone lines: give each staff member their own direct number.
// Calls to a direct number ring only that person (then their voicemail); calls to any other Boreal
// number go to the receptionist. Staff outbound calls show their own direct number.
import { useEffect, useState } from "react";
import { api } from "@/api";

type Line = { id: string; name: string; email: string | null; direct_number: string | null };

export default function PhoneLines(): JSX.Element {
  const [lines, setLines] = useState<Line[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<Record<string, string>>({});
  const load = () => void api.get<{ users?: Line[] }>("/api/voice/direct-numbers")
    .then((r) => { const u = r?.users ?? []; setLines(u); setDraft(Object.fromEntries(u.map((l) => [l.id, l.direct_number ?? ""]))); })
    .catch(() => setLines([]));
  useEffect(load, []);

  async function save(id: string) {
    setMsg((m) => ({ ...m, [id]: "Saving..." }));
    try {
      await api.put("/api/voice/direct-numbers/" + id, { direct_number: draft[id] ?? "" });
      setMsg((m) => ({ ...m, [id]: "Saved" }));
      load();
    } catch (e) {
      const d = (e as { details?: { message?: string; error?: string } })?.details;
      setMsg((m) => ({ ...m, [id]: d?.message || d?.error || "Couldn't save (admins only)." }));
    }
  }

  const input = { padding: "7px 9px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13, background: "var(--ui-surface-strong)", color: "var(--ui-text)", width: 180 } as const;
  return (
    <div style={{ maxWidth: 760 }}>
      <h2 style={{ fontSize: 18, marginBottom: 4 }}>Phone lines</h2>
      <p style={{ fontSize: 13, color: "var(--ui-text-muted)", marginBottom: 16 }}>
        Give each person their own direct number. Calls to it ring only them, then go to their voicemail. Calls to the main
        line go to the receptionist. Buy the number in Twilio and point its voice webhook at the same address as the main line first.
      </p>
      {lines === null ? <div style={{ fontSize: 13 }}>Loading...</div> : lines.map((l) => (
        <div key={l.id} data-testid="phone-line" style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--ui-border)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{l.name || l.email || l.id}</div>
            <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{l.email}</div>
          </div>
          <input aria-label={"Direct number for " + (l.name || l.email || "")} placeholder="No direct number" value={draft[l.id] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [l.id]: e.target.value }))} style={input} />
          <button type="button" onClick={() => void save(l.id)} style={{ padding: "6px 12px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-text)", cursor: "pointer", fontSize: 13 }}>Save</button>
          <span style={{ fontSize: 12, color: "var(--ui-text-muted)", width: 170 }}>{msg[l.id] ?? ""}</span>
        </div>
      ))}
    </div>
  );
}
