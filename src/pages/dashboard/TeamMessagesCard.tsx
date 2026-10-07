// BF_PORTAL_DASH_TEAM_MESSAGES_v758
// Dashboard card: Team conversations with messages you have not read, @mentions first. Clicking a
// row opens that conversation in Communications > Team. Updates the moment a Team message arrives
// (TeamNotifier re-broadcasts it as a window event) and every 30 seconds as a fallback.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { getAuthToken } from "@/lib/authToken";

export const TEAM_MESSAGE_EVENT = "bf:team-message";

export type TeamChannel = {
  id: string;
  kind: string;
  name: string | null;
  muted?: boolean;
  archived_at?: string | null;
  member_ids?: string[];
  unread_count?: number;
  has_mention?: boolean;
  last_message?: { sender_id: string | null; body: string; created_at: string } | null;
};

function myUserId(): string | null {
  try {
    const t = getAuthToken();
    if (!t) return null;
    const payload = JSON.parse(atob(t.split(".")[1] ?? ""));
    return (payload?.sub ?? payload?.id ?? null) as string | null;
  } catch { return null; }
}

/** Unread, not archived; muted conversations only when you were @mentioned. Mentions first, then newest. */
export function unreadConversations(channels: TeamChannel[]): TeamChannel[] {
  return channels
    .filter((c) => !c.archived_at && Number(c.unread_count ?? 0) > 0 && (!c.muted || Boolean(c.has_mention)))
    .sort((a, b) => (Number(Boolean(b.has_mention)) - Number(Boolean(a.has_mention)))
      || String(b.last_message?.created_at ?? "").localeCompare(String(a.last_message?.created_at ?? "")));
}

export function conversationTitle(c: TeamChannel, names: Map<string, string>, me: string | null): string {
  if (c.kind === "dm") {
    const other = (c.member_ids ?? []).map(String).find((id) => id !== me);
    return (other ? names.get(other) : undefined) || c.name || "Direct message";
  }
  return c.name ? "#" + c.name : "Team chat";
}

export function previewText(body: string | null | undefined): string {
  const text = String(body ?? "").replace(/[*_~>#]/g, "").replace(/\s+/g, " ").trim();
  if (!text) return "Sent an attachment";
  return text.length > 90 ? text.slice(0, 89) + "…" : text;
}

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return "";
  const mins = Math.max(0, Math.round((now - t) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return mins + "m";
  if (mins < 24 * 60) return Math.round(mins / 60) + "h";
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const teamLink = (channelId?: string) =>
  "/communications?tab=team" + (channelId ? "&channel=" + encodeURIComponent(channelId) : "");

export default function TeamMessagesCard() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<TeamChannel[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [failed, setFailed] = useState(false);
  const me = myUserId();

  const load = useCallback(() => {
    api.get<{ channels?: TeamChannel[] }>("/api/team/channels")
      .then((r) => { setChannels(r?.channels ?? []); setFailed(false); })
      .catch((err: unknown) => { console.warn("[dash-team] channels failed", err); setFailed(true); });
  }, []);

  useEffect(() => {
    load();
    api.get<{ users?: Array<{ id: string; name: string }> }>("/api/team/users")
      .then((r) => setNames(new Map((r?.users ?? []).map((u) => [String(u.id), u.name]))))
      .catch((err: unknown) => console.warn("[dash-team] users failed", err));
    const timer = setInterval(load, 30000);
    const onMessage = () => load();
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener(TEAM_MESSAGE_EVENT, onMessage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener(TEAM_MESSAGE_EVENT, onMessage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  if (channels === null && !failed) return <div style={{ color: "#51617D" }}>Loading team messages...</div>;
  if (failed && channels === null) {
    return <div role="alert" style={{ color: "#991b1b" }}>Couldn't load team messages. <button type="button" className="ui-button ui-button--secondary" onClick={load}>Retry</button></div>;
  }
  const rows = unreadConversations(channels ?? []);
  return (
    <div data-testid="dash-team-messages">
      {rows.length === 0 ? <div style={{ color: "#51617D", padding: "6px 0" }}>No new team messages.</div> : rows.slice(0, 6).map((c) => (
        <button key={c.id} type="button" data-testid="dash-team-row" onClick={() => navigate(teamLink(c.id))}
          style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 4, width: "100%", textAlign: "left", padding: "9px 4px", border: 0, borderTop: "1px solid #E4EAF2", background: "transparent", color: "#0B1F3A", cursor: "pointer" }}>
          <span style={{ fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.has_mention ? <span title="You were mentioned" style={{ color: "#b45309", marginRight: 6 }}>@</span> : null}
            {conversationTitle(c, names, me)}
          </span>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <small style={{ color: "#51617D" }}>{timeAgo(c.last_message?.created_at)}</small>
            <span aria-label={c.unread_count + " unread"} style={{ minWidth: 22, padding: "1px 7px", borderRadius: 999, background: "#0B1F3A", color: "#fff", fontSize: 12, fontWeight: 700, textAlign: "center" }}>{c.unread_count}</span>
          </span>
          <span style={{ gridColumn: "1 / -1", color: "#51617D", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {(c.kind !== "dm" && c.last_message?.sender_id ? (names.get(String(c.last_message.sender_id)) ?? "Team") + ": " : "") + previewText(c.last_message?.body)}
          </span>
        </button>
      ))}
      {rows.length > 6 ? <div style={{ color: "#51617D", fontSize: 13, paddingTop: 6 }}>+{rows.length - 6} more</div> : null}
      <div style={{ paddingTop: 8 }}>
        <button type="button" className="ui-button ui-button--secondary" onClick={() => navigate(teamLink())}>Open Team chat</button>
      </div>
    </div>
  );
}
