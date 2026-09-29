// BF_PORTAL_TEAM_NOTIFY_v644
// Always mounted (AppShell). Keeps its own Team socket so new Team messages alert wherever you
// are in the portal: a desktop notification with a sound (or an in-app banner on the iPad app,
// which has no browser notifications), and an unread count in the browser tab title.
// Muted conversations alert only for @mentions; Do Not Disturb alerts for nothing. When the
// portal is closed, BF-Server v643 sends a push instead. Also sets you "Away" after 10 idle
// minutes and back when you return.
import { useEffect, useRef, useState } from "react";
import { api } from "@/api";
import { getAuthToken } from "@/lib/authToken";
import { API_BASE } from "@/config/api";

type Channel = { id: string; kind: string; name: string | null; muted?: boolean; member_ids?: string[] };
type Status = { user_id: string; dnd?: boolean; away?: boolean };
type Incoming = { channel_id: string; message: { id: string; sender_id: string | null; body: string; mentions?: string[] | null; bot?: string | null } };

let viewingChannel: string | null = null;
/** TeamTab reports the conversation on screen, so it does not alert for itself. */
export function setViewingTeamChannel(id: string | null): void { viewingChannel = id; }

export const IDLE_AWAY_MS = 10 * 60 * 1000;

function myUserId(): string | null {
  try {
    const t = getAuthToken();
    if (!t) return null;
    const payload = JSON.parse(atob(t.split(".")[1] ?? ""));
    return (payload?.sub ?? payload?.id ?? null) as string | null;
  } catch { return null; }
}

/** Pure: should this message alert me? */
export function shouldAlert(p: { mine: boolean; muted: boolean; mentioned: boolean; dnd: boolean; onScreen: boolean }): boolean {
  if (p.mine || p.dnd || p.onScreen) return false;
  if (p.muted && !p.mentioned) return false;
  return true;
}

function beep(): void {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.4);
    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 600);
  } catch { /* no audio - fine */ }
}

export default function TeamNotifier() {
  const [banner, setBanner] = useState<{ title: string; body: string; channel: string } | null>(null);
  const channels = useRef<Map<string, Channel>>(new Map());
  const names = useRef<Map<string, string>>(new Map());
  const myDnd = useRef(false);
  const unseen = useRef(0);
  const baseTitle = useRef<string>(typeof document !== "undefined" ? document.title : "");
  const me = myUserId();

  useEffect(() => {
    if (!me) return;
    const loadChannels = () => void api<{ channels?: Channel[] }>("/api/team/channels")
      .then((r) => { channels.current = new Map((r?.channels ?? []).map((c) => [c.id, c])); }).catch(() => undefined);
    const loadUsers = () => void api<{ users?: Array<{ id: string; name: string }> }>("/api/team/users")
      .then((r) => { names.current = new Map((r?.users ?? []).map((u) => [u.id, u.name])); }).catch(() => undefined);
    const loadStatus = () => void api<{ statuses?: Status[] }>("/api/team/statuses")
      .then((r) => { myDnd.current = Boolean((r?.statuses ?? []).find((s) => s.user_id === me)?.dnd); }).catch(() => undefined);
    loadChannels(); loadUsers(); loadStatus();
    const refresh = setInterval(() => { loadChannels(); loadStatus(); }, 60000);

    const open = (channel: string) => {
      window.focus();
      window.location.assign("/communications?tab=team&channel=" + encodeURIComponent(channel));
    };
    const alertFor = (d: Incoming) => {
      const ch = channels.current.get(d.channel_id);
      const mentioned = (d.message.mentions ?? []).map(String).includes(me);
      const onScreen = viewingChannel === d.channel_id && document.visibilityState === "visible";
      if (!shouldAlert({ mine: d.message.sender_id === me, muted: Boolean(ch?.muted), mentioned, dnd: myDnd.current, onScreen })) return;
      const sender = d.message.bot || (names.current.get(String(d.message.sender_id)) ?? "Team"); // BF_PORTAL_TEAM_PHASE_C_v672
      const where = ch?.kind === "dm" || !ch ? sender : ch.name ? "#" + ch.name : "Team chat";
      const title = mentioned ? sender + " mentioned you" : where;
      const body = (where !== sender ? sender + ": " : "") + (String(d.message.body ?? "").slice(0, 140) || "Sent an attachment");
      beep();
      if (document.visibilityState !== "visible") {
        unseen.current += 1;
        document.title = "(" + unseen.current + ") " + baseTitle.current;
      }
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          const n = new Notification(title, { body, tag: d.channel_id });
          n.onclick = () => { n.close(); open(d.channel_id); };
          return;
        } catch { /* fall through to the banner */ }
      }
      setBanner({ title, body, channel: d.channel_id });
      setTimeout(() => setBanner((b) => (b && b.channel === d.channel_id ? null : b)), 6000);
    };

    const token = getAuthToken();
    let ws: WebSocket | null = null; let closed = false; let retry = 0; let timer: ReturnType<typeof setTimeout> | null = null;
    const connect = () => {
      if (closed || !token) return;
      try { ws = new WebSocket(API_BASE.replace(/^http/, "ws") + "/api/team/ws?token=" + encodeURIComponent(token)); } catch { schedule(); return; }
      ws.onopen = () => { retry = 0; };
      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(typeof ev.data === "string" ? ev.data : "{}");
          if (d?.type === "message" && d.message) alertFor(d as Incoming);
          else if (d?.type === "channel") loadChannels();
          else if (d?.type === "status" && d.status?.user_id === me) myDnd.current = Boolean(d.status.dnd);
          else if (d?.type === "reminder" && d.channel_id) { beep(); setBanner({ title: "Reminder", body: String(d.body ?? ""), channel: String(d.channel_id) }); } // BF_PORTAL_TEAM_PHASE_C_v672
        } catch { /* ignore */ }
      };
      ws.onerror = () => { try { ws?.close(); } catch { /* ignore */ } };
      ws.onclose = () => schedule();
    };
    const schedule = () => {
      if (closed || timer) return;
      retry += 1;
      timer = setTimeout(() => { timer = null; connect(); }, Math.min(30000, 1000 * 2 ** Math.min(retry, 5)));
    };
    connect();

    // Idle -> Away after 10 minutes; any activity -> back.
    let lastActive = Date.now(); let away = false;
    const setAway = (v: boolean) => { if (away === v) return; away = v; void api.put("/api/team/status", { away: v }).catch(() => undefined); };
    const active = () => { lastActive = Date.now(); if (away) setAway(false); };
    const onVisible = () => {
      if (document.visibilityState === "visible") { unseen.current = 0; document.title = baseTitle.current; active(); }
    };
    const events = ["mousemove", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, active, { passive: true }));
    document.addEventListener("visibilitychange", onVisible);
    const idle = setInterval(() => { if (Date.now() - lastActive > IDLE_AWAY_MS) setAway(true); }, 60000);
    setAway(false);

    return () => {
      closed = true; if (timer) clearTimeout(timer); try { ws?.close(); } catch { /* ignore */ }
      clearInterval(refresh); clearInterval(idle);
      events.forEach((e) => window.removeEventListener(e, active));
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [me]);

  if (!banner) return null;
  return (
    <div role="status" data-testid="team-notify-banner" onClick={() => { const c = banner.channel; setBanner(null); window.location.assign("/communications?tab=team&channel=" + encodeURIComponent(c)); }}
      style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, maxWidth: 360, background: "#0B1F3A", color: "#fff", borderRadius: 12, padding: "12px 14px", boxShadow: "0 10px 30px rgba(0,0,0,0.25)", cursor: "pointer" }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{banner.title}</div>
      <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>{banner.body}</div>
    </div>
  );
}
