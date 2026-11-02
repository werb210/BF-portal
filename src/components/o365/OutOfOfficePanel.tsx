// BF_PORTAL_O365_UI_v1 - out-of-office auto-reply editor
// (GET /api/o365/mail/mailbox-settings, PATCH /api/o365/mail/out-of-office).
import { useEffect, useState } from "react";
import { api } from "@/api";
import { localDateIn, viewerZoneName } from "@/lib/permanentTime";

type OofStatus = "disabled" | "alwaysEnabled" | "scheduled";
type MailboxSettings = {
  automaticRepliesSetting?: {
    status?: string;
    internalReplyMessage?: string;
    externalReplyMessage?: string;
    scheduledStartDateTime?: { dateTime?: string };
    scheduledEndDateTime?: { dateTime?: string };
  };
  // BF_PORTAL_v864_OOO_UNTIL - Boreal's own out-of-office window (BF-Server v864).
  borealOutOfOffice?: { from?: string | null; until?: string | null; active?: boolean };
};

export default function OutOfOfficePanel() {
  const [connected, setConnected] = useState(true);
  const [status, setStatus] = useState<OofStatus>("disabled");
  const [internalMsg, setInternalMsg] = useState("");
  const [externalMsg, setExternalMsg] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  // BF_PORTAL_v864_OOO_UNTIL - "Active until": on now, off automatically at the end of this day (your time zone).
  const [activeUntil, setActiveUntil] = useState("");
  const [savedUntil, setSavedUntil] = useState<string | null>(null);
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
        // BF_PORTAL_v864_OOO_UNTIL - an "Active until" save is stored as Outlook "scheduled"; show it as On + the day.
        const boreal = r.borealOutOfOffice;
        const untilIso = boreal?.until ?? null;
        const startedAlready = !boreal?.from || new Date(boreal.from).getTime() <= Date.now();
        if (s === "scheduled" && untilIso && startedAlready && new Date(untilIso).getTime() > Date.now()) {
          setStatus("alwaysEnabled");
          setActiveUntil(localDateIn(new Date(new Date(untilIso).getTime() - 1)));
          setSavedUntil(untilIso);
        } else {
          setStatus(s === "alwaysEnabled" || s === "scheduled" ? s : "disabled");
        }
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
      if (status === "alwaysEnabled" && activeUntil) {
        body.activeUntil = activeUntil;
        body.timeZone = viewerZoneName();
      }
      const res = await api.patch<{ until?: string | null }>("/api/o365/mail/out-of-office", body);
      const until = res && typeof res === "object" ? (res as { until?: string | null }).until ?? null : null;
      setSavedUntil(status === "alwaysEnabled" && activeUntil ? until : null);
      setNote(status === "alwaysEnabled" && activeUntil ? `Saved. Out of office is on and turns off at the end of ${activeUntil}.` : "Saved.");
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "";
      setNote(/already ended|valid date/i.test(msg) ? msg : "Could not save. Make sure Microsoft 365 is connected in this Settings page.");
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
          {status === "alwaysEnabled" && (
            <label style={{ fontSize: 13, color: "#516f90" }}>
              Active until
              <input
                type="date"
                aria-label="Active until"
                value={activeUntil}
                min={localDateIn(new Date())}
                onChange={(e) => setActiveUntil(e.target.value)}
                style={{ display: "block", marginTop: 4, padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd6e2" }}
              />
              <span style={{ display: "block", marginTop: 4, fontSize: 12, color: "#516f90" }}>
                {activeUntil
                  ? `On now. Turns off automatically at the end of ${activeUntil} (${viewerZoneName()}). Calls do not ring you until then.`
                  : "Leave empty to stay on until you switch it off."}
              </span>
              {activeUntil && (
                <button type="button" onClick={() => { setActiveUntil(""); setSavedUntil(null); }} style={{ marginTop: 4, padding: "2px 8px", fontSize: 12, background: "transparent", color: "#33475b", border: "1px solid #cbd6e2", borderRadius: 4, cursor: "pointer" }}>
                  Clear date
                </button>
              )}
              {savedUntil && (
                <span style={{ display: "block", marginTop: 4, fontSize: 12, color: "#33475b" }} data-testid="ooo-saved-until">
                  Saved: ends {new Date(savedUntil).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </span>
              )}
            </label>
          )}
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
