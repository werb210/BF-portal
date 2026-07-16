// BF_PORTAL_O365_UI_v1 - out-of-office auto-reply editor
// (GET /api/o365/mail/mailbox-settings, PATCH /api/o365/mail/out-of-office).
import { useEffect, useState } from "react";
import { api } from "@/api";

type OofStatus = "disabled" | "alwaysEnabled" | "scheduled";
type MailboxSettings = {
  automaticRepliesSetting?: {
    status?: string;
    internalReplyMessage?: string;
    externalReplyMessage?: string;
    scheduledStartDateTime?: { dateTime?: string };
    scheduledEndDateTime?: { dateTime?: string };
  };
};

export default function OutOfOfficePanel() {
  const [connected, setConnected] = useState(true);
  const [status, setStatus] = useState<OofStatus>("disabled");
  const [internalMsg, setInternalMsg] = useState("");
  const [externalMsg, setExternalMsg] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<MailboxSettings>("/api/o365/mail/mailbox-settings")
      .then((r) => {
        if (!alive) return;
        const a = r.automaticRepliesSetting ?? {};
        const s = a.status;
        setStatus(s === "alwaysEnabled" || s === "scheduled" ? s : "disabled");
        setInternalMsg(a.internalReplyMessage ?? "");
        setExternalMsg(a.externalReplyMessage ?? "");
        setStart(a.scheduledStartDateTime?.dateTime?.slice(0, 16) ?? "");
        setEnd(a.scheduledEndDateTime?.dateTime?.slice(0, 16) ?? "");
        setConnected(true);
      })
      .catch(() => { if (alive) setConnected(false); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    setNote(null);
    try {
      const body: Record<string, unknown> = {
        status,
        internalReplyMessage: internalMsg,
        externalReplyMessage: externalMsg,
      };
      if (status === "scheduled" && start && end) {
        body.start = new Date(start).toISOString();
        body.end = new Date(end).toISOString();
      }
      await api.patch("/api/o365/mail/out-of-office", body);
      setNote("Saved.");
    } catch {
      setNote("Could not save. Make sure Microsoft 365 is connected in this Settings page.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <section style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #eaf0f6" }}>
      <h3 style={{ marginTop: 0 }}>Out of office</h3>
      {!connected ? (
        <p style={{ color: "#516f90", fontSize: 13 }}>Connect Microsoft 365 above to manage your automatic replies.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 560 }}>
          <label style={{ fontSize: 13, color: "#516f90" }}>
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OofStatus)}
              style={{ display: "block", marginTop: 4, padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd6e2" }}
            >
              <option value="disabled">Off</option>
              <option value="alwaysEnabled">On</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </label>
          {status === "scheduled" && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <label style={{ fontSize: 13, color: "#516f90" }}>
                Start
                <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} style={{ display: "block", marginTop: 4, padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd6e2" }} />
              </label>
              <label style={{ fontSize: 13, color: "#516f90" }}>
                End
                <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} style={{ display: "block", marginTop: 4, padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd6e2" }} />
              </label>
            </div>
          )}
          <label style={{ fontSize: 13, color: "#516f90" }}>
            Reply to people inside your organization
            <textarea value={internalMsg} onChange={(e) => setInternalMsg(e.target.value)} rows={3} style={{ display: "block", marginTop: 4, width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd6e2" }} />
          </label>
          <label style={{ fontSize: 13, color: "#516f90" }}>
            Reply to people outside your organization
            <textarea value={externalMsg} onChange={(e) => setExternalMsg(e.target.value)} rows={3} style={{ display: "block", marginTop: 4, width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd6e2" }} />
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={() => void save()} disabled={saving} style={{ padding: "8px 16px", background: "var(--ui-accent-blue)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
              {saving ? "Saving..." : "Save out-of-office"}
            </button>
            {note && <span style={{ fontSize: 13, color: "#516f90" }}>{note}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
