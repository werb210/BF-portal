import { useEffect } from "react";

export function useConversationStream(conversationId: string | null, onMessage: (msg: any) => void) {
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    const base = import.meta.env.VITE_API_URL || window.location.origin;
    const token = localStorage.getItem("auth_token") || localStorage.getItem("bf_jwt_token") || "";
    const url = `${base}/api/conversations/${conversationId}/stream`;
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let lastSeen: string | null = null;
    try {
      es = new EventSource(`${url}?token=${encodeURIComponent(token)}`);
      es.onmessage = (ev) => { try { onMessage(JSON.parse(ev.data)); } catch {} };
      es.onerror = () => {
        es?.close(); es = null;
        if (pollTimer) return;
        pollTimer = setInterval(async () => {
          if (cancelled) return;
          const since = lastSeen ? `?since=${encodeURIComponent(lastSeen)}` : "";
          const r = await fetch(`${base}/api/conversations/${conversationId}/messages${since}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
          if (!r || !r.ok) return;
          const data = await r.json();
          for (const m of data.messages || []) { onMessage(m); lastSeen = m.created_at; }
        }, 5000);
      };
    } catch {}
    return () => { cancelled = true; if (es) es.close(); if (pollTimer) clearInterval(pollTimer); };
  }, [conversationId, onMessage]);
}
