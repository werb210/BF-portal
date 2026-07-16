// BF_PORTAL_O365_UI_v1 - find-a-time free/busy grid (GET /api/calendar/schedule).
import { useState } from "react";
import { api } from "@/api";

type ScheduleEntry = { scheduleId?: string; availabilityView?: string };

// Graph availabilityView digits: 0 free, 1 tentative, 2 busy, 3 out-of-office, 4 working-elsewhere.
const SLOT_COLORS: Record<string, string> = {
  "0": "#22c55e",
  "1": "#fbbf24",
  "2": "#ef4444",
  "3": "#a855f7",
  "4": "#38bdf8",
};

export default function FindATimePanel() {
  const [emails, setEmails] = useState("");
  const [rows, setRows] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const run = async () => {
    const list = emails.split(",").map((e) => e.trim()).filter(Boolean);
    if (!list.length) return;
    setLoading(true);
    setNote(null);
    try {
      const r = await api.get<{ data?: { schedules?: ScheduleEntry[]; connected?: boolean } }>(
        `/api/calendar/schedule?emails=${encodeURIComponent(list.join(","))}`
      );
      const data = r.data ?? {};
      if (data.connected === false) setNote("Connect Microsoft 365 in Settings to check availability.");
      const schedules = Array.isArray(data.schedules) ? data.schedules : [];
      setRows(schedules);
      if (data.connected !== false && schedules.length === 0) setNote("No availability returned for those addresses.");
    } catch {
      setNote("Could not fetch availability.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 16, padding: 16, border: "1px solid var(--ui-border, #eaf0f6)", borderRadius: 8 }}>
      <h3 style={{ marginTop: 0, fontSize: 15 }}>Find a time</h3>
      <p style={{ color: "var(--ui-text-muted)", fontSize: 12, marginTop: 0 }}>Enter teammate email addresses (comma-separated) to see today&apos;s free/busy.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void run(); }}
          placeholder="alice@boreal.financial, bob@boreal.financial"
          style={{ flex: 1, padding: "6px 10px", borderRadius: 4, border: "1px solid #cbd6e2" }}
        />
        <button type="button" onClick={() => void run()} disabled={loading} style={{ padding: "6px 14px", background: "var(--ui-accent-blue)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
          {loading ? "Checking..." : "Check"}
        </button>
      </div>
      {note && <p style={{ color: "var(--ui-text-muted)", fontSize: 12 }}>{note}</p>}
      {rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((row, idx) => {
            const view = row.availabilityView ?? "";
            return (
              <div key={row.scheduleId ?? `row-${idx}`}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{row.scheduleId ?? "Unknown"}</div>
                <div style={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {view.split("").map((ch, i) => (
                    <span key={`${idx}-${i}`} title={`Slot ${i + 1}`} style={{ width: 8, height: 16, background: SLOT_COLORS[ch] ?? "#e2e8f0", borderRadius: 1 }} />
                  ))}
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--ui-text-muted)", marginTop: 4 }}>
            <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#22c55e", marginRight: 3 }} />Free</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#fbbf24", marginRight: 3 }} />Tentative</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#ef4444", marginRight: 3 }} />Busy</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#a855f7", marginRight: 3 }} />Out of office</span>
          </div>
        </div>
      )}
    </div>
  );
}
