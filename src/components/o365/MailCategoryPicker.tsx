// BF_PORTAL_O365_UI_v1 - assign Outlook categories to a mail message
// (GET /api/o365/mail/categories, PATCH /api/o365/mail/messages/:id/categories).
import { useEffect, useRef, useState } from "react";
import { api } from "@/api";

type Cat = { displayName: string; color?: string };

// Outlook preset color names -> hex chips (best-effort; unknown -> grey).
const CHIP: Record<string, string> = {
  preset0: "#ef4444", preset1: "#f97316", preset2: "#f59e0b", preset3: "#eab308",
  preset4: "#22c55e", preset5: "#14b8a6", preset6: "#3b82f6", preset7: "#8b5cf6",
  preset8: "#ec4899", preset9: "#78716c",
};

export default function MailCategoryPicker({ messageId }: { messageId: string }) {
  const [open, setOpen] = useState(false);
  const [cats, setCats] = useState<Cat[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api
      .get<{ categories?: Cat[] }>("/api/o365/mail/categories")
      .then((r) => setCats(Array.isArray(r.categories) ? r.categories : []))
      .catch(() => setCats([]));
  }, []);

  // Reset selection when the viewed message changes.
  useEffect(() => { setSelected({}); setNote(null); setOpen(false); }, [messageId]);

  const apply = async () => {
    const chosen = cats.filter((c) => selected[c.displayName]).map((c) => c.displayName);
    try {
      await api.patch(`/api/o365/mail/messages/${encodeURIComponent(messageId)}/categories`, { categories: chosen });
      setNote("Categories updated.");
      setOpen(false);
    } catch {
      setNote("Could not update categories.");
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{ padding: "4px 10px", fontSize: 12, background: "none", color: "#516f90", border: "1px solid #cbd6e2", borderRadius: 4, cursor: "pointer" }}>
        Categorize
      </button>
      {open && (
        <div style={{ position: "absolute", zIndex: 20, marginTop: 4, minWidth: 200, background: "#fff", border: "1px solid #cbd6e2", borderRadius: 6, boxShadow: "0 6px 16px rgba(0,0,0,0.12)", padding: 8 }}>
          {cats.length === 0 ? (
            <div style={{ fontSize: 12, color: "#8093a8", padding: 4 }}>No categories available.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
              {cats.map((c) => (
                <label key={c.displayName} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!selected[c.displayName]} onChange={(e) => setSelected((prev) => ({ ...prev, [c.displayName]: e.target.checked }))} />
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: CHIP[c.color ?? ""] ?? "#94a3b8", flexShrink: 0 }} />
                  {c.displayName}
                </label>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" onClick={() => void apply()} style={{ padding: "4px 12px", fontSize: 12, background: "var(--ui-accent-blue)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>Apply</button>
          </div>
        </div>
      )}
      {note && <span style={{ marginLeft: 8, fontSize: 12, color: "#516f90" }}>{note}</span>}
    </div>
  );
}
