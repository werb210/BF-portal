// BF_PORTAL_BLOCK_v311_QUICK_CALL_v1 — three pinned staff quick-call buttons
// shown under the number field. Each button rings that staff member's portal
// browser (VOIP, via startInternalCall). "Edit" turns the row into per-slot
// staff pickers; picks persist server-side. Avatar from profile image, else initials.
import { useEffect, useState } from "react";
import { dialerApi, type QuickCallData, type QuickCallStaff } from "../api";
import { startInternalCall } from "../actions";

const SLOTS = 3;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "?";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? first;
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}

export default function QuickCallRow() {
  const [data, setData] = useState<QuickCallData | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r: any = await dialerApi.quickCallGet();
        const d: QuickCallData = r?.data ?? r;
        if (alive && d) setData({ staff: d.staff ?? [], slots: (d.slots ?? []).slice(0, SLOTS) });
      } catch {
        /* dialer is still usable without quick-call */
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!data) return null;

  const slotIds: (string | null)[] = Array.from({ length: SLOTS }, (_, i) => data.slots[i] ?? null);
  const staffById = (id: string | null): QuickCallStaff | null => (id ? data.staff.find((s) => s.userId === id) ?? null : null);

  const save = (next: (string | null)[]) => {
    const slots = next.filter((x): x is string => !!x);
    setData((d) => (d ? { ...d, slots } : d));
    void dialerApi.quickCallSave(slots).catch(() => { /* keep optimistic */ });
  };

  const assign = (i: number, userId: string) => {
    const next = [...slotIds];
    next[i] = userId || null;
    save(next);
  };

  const call = (s: QuickCallStaff) => {
    if (!s.identity || !s.online) return;
    void startInternalCall(s.identity, { contactName: s.name });
  };

  return (
    <div style={{ padding: "2px 24px 8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Quick call</span>
        <button
          onClick={() => setEditing((e) => !e)}
          style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 11, cursor: "pointer", padding: "2px 4px" }}
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${SLOTS}, 1fr)`, gap: 12, justifyItems: "center" }}>
        {slotIds.map((id, i) => {
          const s = staffById(id);
          if (editing) {
            return (
              <select
                key={i}
                value={id ?? ""}
                onChange={(e) => assign(i, e.target.value)}
                style={{ width: "100%", fontSize: 11, padding: "6px 4px", borderRadius: 8, background: "rgba(255,255,255,0.06)", color: "var(--ui-text-soft)", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                <option value="">— empty —</option>
                {data.staff.map((st) => (
                  <option key={st.userId} value={st.userId}>{st.name}</option>
                ))}
              </select>
            );
          }
          if (!s) {
            return (
              <button
                key={i}
                onClick={() => setEditing(true)}
                title="Assign a staff member"
                style={{ width: 48, height: 48, borderRadius: "50%", border: "1.5px dashed rgba(255,255,255,0.3)", background: "transparent", color: "rgba(255,255,255,0.45)", fontSize: 22, cursor: "pointer" }}
              >
                +
              </button>
            );
          }
          const callable = !!s.identity && s.online;
          return (
            <button
              key={i}
              onClick={() => call(s)}
              disabled={!callable}
              title={callable ? `Call ${s.name}` : `${s.name} (offline)`}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: callable ? "pointer" : "not-allowed", opacity: callable ? 1 : 0.5, padding: 0 }}
            >
              <span
                style={{
                  position: "relative", width: 48, height: 48, borderRadius: "50%", overflow: "hidden", display: "grid", placeItems: "center",
                  background: s.avatarUrl ? "transparent" : "linear-gradient(135deg, hsl(210 65% 55%), hsl(250 75% 45%))",
                  color: "white", fontWeight: 600, fontSize: 16, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
                }}
              >
                {s.avatarUrl
                  ? <img src={s.avatarUrl} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : initialsOf(s.name)}
                <span style={{ position: "absolute", right: 1, bottom: 1, width: 11, height: 11, borderRadius: "50%", background: s.online ? "#10b981" : "#6b7280", border: "2px solid #0b1320" }} />
              </span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.name.split(/\s+/)[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
