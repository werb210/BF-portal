// BF_PORTAL_v888_TEAMS_IN_APP - "Join in portal" for a Boreal Teams meeting, with "Open in Teams" next to
// it. Staff join as themselves (their name, marked Boreal Financial) through Azure Communication
// Services, in the browser or the iPad app, without installing Teams. If in-app joining is not switched
// on (or the server refuses), the person is told why and can still open the meeting in Teams.
import { lazy, Suspense, useCallback, useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { requestMeetingTicket, isTeamsJoinUrl, type MeetingRef, type MeetingTicket } from "./teamsMeetingApi";

const TeamsMeetingCall = lazy(() => import("./TeamsMeetingCall"));

type Stage = { kind: "closed" } | { kind: "loading" } | { kind: "call"; ticket: MeetingTicket } | { kind: "error"; message: string; joinUrl: string };

const joinStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, background: "#5b5fc7", color: "#fff", padding: "8px 14px", borderRadius: 8, fontWeight: 600, border: 0, cursor: "pointer", fontSize: 14 };
const teamsLinkStyle: CSSProperties = { marginLeft: 10, fontSize: 13, color: "var(--ui-accent-blue, #2563eb)", textDecoration: "underline" };

export function JoinTeamsButton({ joinUrl, meetingId, calendarEventId, title, compact }: MeetingRef & { title?: string | null; compact?: boolean }): JSX.Element | null {
  const [stage, setStage] = useState<Stage>({ kind: "closed" });
  const close = useCallback(() => setStage({ kind: "closed" }), []);
  if (!isTeamsJoinUrl(joinUrl)) return null;

  const start = async () => {
    setStage({ kind: "loading" });
    const r = await requestMeetingTicket({ joinUrl, meetingId, calendarEventId });
    setStage(r.ok ? { kind: "call", ticket: r.ticket } : { kind: "error", message: r.message, joinUrl: r.joinUrl });
  };

  return (
    <span data-testid="join-teams">
      <button type="button" data-testid="join-teams-in-app" onClick={() => void start()}
        style={compact ? { ...joinStyle, padding: "6px 12px", fontSize: 13 } : joinStyle}>
        Join meeting
      </button>
      <a href={joinUrl} target="_blank" rel="noopener noreferrer" style={teamsLinkStyle} data-testid="join-teams-open-teams">Open in Teams</a>
      {stage.kind !== "closed" ? <MeetingOverlay stage={stage} title={title ?? null} onClose={close} /> : null}
    </span>
  );
}

function MeetingOverlay({ stage, title, onClose }: { stage: Stage; title: string | null; onClose: () => void }): JSX.Element {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  const panel: CSSProperties = { position: "fixed", inset: 0, zIndex: 10000, background: "#11100f", display: "flex", flexDirection: "column",
    paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" };
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title ? "Teams meeting: " + title : "Teams meeting"} style={panel} data-testid="teams-meeting-overlay">
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", color: "#fff" }}>
        <strong style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || "Teams meeting"}</strong>
        <button type="button" onClick={onClose} style={{ background: "transparent", color: "#fff", border: "1px solid #666", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>Close</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {stage.kind === "loading" ? <p style={{ color: "#fff", padding: 24 }}>Getting the meeting ready...</p> : null}
        {stage.kind === "error" ? (
          <div style={{ color: "#fff", padding: 24, maxWidth: 520 }} data-testid="teams-meeting-error">
            <p style={{ marginTop: 0 }}>{stage.message}</p>
            <a href={stage.joinUrl} target="_blank" rel="noopener noreferrer" style={{ ...joinStyle, textDecoration: "none" }}>Open in Teams</a>
          </div>
        ) : null}
        {stage.kind === "call" ? (
          <Suspense fallback={<p style={{ color: "#fff", padding: 24 }}>Loading video...</p>}>
            <TeamsMeetingCall ticket={stage.ticket} onEnded={onClose} />
          </Suspense>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export default JoinTeamsButton;
