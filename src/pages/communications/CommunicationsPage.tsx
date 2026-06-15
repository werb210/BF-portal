import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api";
import { getAuthToken } from "@/lib/authToken"; // BF_PORTAL_BLOCK_v752_TEAM_TAB
import { API_BASE } from "@/config/api"; // BF_PORTAL_BLOCK_v752_TEAM_TAB
import { withO365Refresh } from "@/api/o365Interceptor";
import { ApiError } from "@/api/http";
import toast from "react-hot-toast"; // BF_PORTAL_COMMS_SMS_ERROR_TOAST_v1
import SecondaryButton from "@/components/forms/SecondaryButton";
import { apiBlob } from "@/utils/api"; // BF_PORTAL_VOICEMAIL_AUDIO_v1

// BF_PORTAL_VOICEMAIL_AUDIO_v1 — Twilio recording URLs need auth, so fetch the
// audio through the server proxy as an authenticated blob, then play it.
function VoicemailAudio({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // BF_PORTAL_VOICEMAIL_AUTOLOAD_v1 — load the audio on mount so the player
  // shows without a click. No autoPlay (that would blast every VM at once).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const blob = await apiBlob(`/api/crm/voicemails/${id}/audio`);
        if (!cancelled) setUrl(URL.createObjectURL(blob));
      } catch { if (!cancelled) setFailed(true); }
    })();
    return () => { cancelled = true; };
  }, [id]);
  if (url) return <audio controls preload="auto" src={url} style={{ width: "100%", maxWidth: 420 }} />;
  return <span style={{ fontSize: 12, color: "#94a3b8" }}>{failed ? "Voicemail unavailable" : "Loading voicemail\u2026"}</span>;
}
import CommunicationsThread from "@/pages/communications/components/CommunicationsThread";
// BF_PORTAL_BLOCK_v312_COMPOSER_PULLDOWNS_v1
import ComposerPulldowns from "@/components/communications/ComposerPulldowns";
import O365ComposeModal from "@/components/communications/O365ComposeModal";

type Tab = "messages" | "sms" | "inbox" | "issues" | "maya" | "team" | "voicemail"; // BF_PORTAL_BLOCK_v830_VOICEMAIL_TAB

const TABS: { id: Tab; label: string }[] = [
  { id: "messages", label: "Messages" },
  { id: "sms", label: "SMS" },
  { id: "inbox", label: "Inbox" },
  { id: "voicemail", label: "Voicemail" }, // BF_PORTAL_BLOCK_v830_VOICEMAIL_TAB
  { id: "issues", label: "Issues" },
  { id: "maya", label: "Maya" }, // BF_PORTAL_BLOCK_v763_MAYA_TAB
  { id: "team", label: "Team" }, // BF_PORTAL_BLOCK_v752_TEAM_TAB
];

type Contact = {
  id: string;
  name: string;
  phone: string | null;
  phone_e164?: string | null;
  mobile?: string | null;
  contactId?: string | null;
};

// BF_PORTAL_BLOCK_v305_SMS_EMPTY_STATE_DEFENSIVE_FILTER_v1 — accept
// any phone-like column. Some CRM endpoints return `phone`, others
// return `phone_e164` (BI silo) or `mobile`. Trim before truthy check
// so whitespace-only strings don't slip through.
function hasUsablePhone(c: Contact): boolean {
  const cand = (c.phone ?? c.phone_e164 ?? c.mobile ?? "").trim();
  return cand.length > 0;
}
type Message = {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  created_at: string;
  staff_name?: string | null;
};
type Issue = {
  id: string;
  title: string;
  description: string;
  screenshot_url: string | null;
  created_at: string;
  status: string;
};

function isBadRequest(error: unknown) {
  return error instanceof ApiError && error.status === 400;
}

// ── Initials avatar ────────────────────────────────────────────────────────
function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const colors = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: size * 0.36,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// ── SMS Tab — iPhone Messages style ──────────────────────────────────────────
function SmsTab({ forcedContact, onContactSelected }: { forcedContact?: Contact | null; onContactSelected?: (c: Contact) => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [threads, setThreads] = useState<Record<string, Message[]>>({});
  const [selected, setSelected] = useState<Contact | null>(null);
  const [threadMessages, setThreadMessages] = useState<Array<{
    id: string;
    direction: "inbound" | "outbound";
    body: string;
    created_at: string;
    from_number?: string;
    to_number?: string;
  }>>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  // BF_PORTAL_BLOCK_v801_MULTISEND — pick multiple contacts, send the same SMS to each 1:1 via /broadcast.
  const [multi, setMulti] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bcBody, setBcBody] = useState("");
  const [bcSending, setBcSending] = useState(false);
  const [bcResult, setBcResult] = useState<string | null>(null);
  const [newThreadPhone, setNewThreadPhone] = useState("");
  const [showNewThread, setShowNewThread] = useState(false);
  const [hasSentMessages, setHasSentMessages] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  function onScrollContainer() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 80;
  }
  const mergeMessages = useCallback((existing: Message[], incoming: Message[]) => {
    const byId = new Map<string, Message>();
    [...existing, ...incoming].forEach((message) => {
      if (message?.id) byId.set(message.id, message);
    });
    return Array.from(byId.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, []);

  const [contactMeta, setContactMeta] = useState<Record<string, { unread: number; latest: string }>>({});
  const fetchSmsConversations = useCallback(async () => {
    try {
      const r = await api<{
        conversations?: Array<{
          thread_key?: string;
          contact_id?: string;
          display_name?: string;
          phone?: string | null;
          last_at?: string;
          last_body?: string;
          unread_count?: number;
        }>;
      }>("/api/communications/sms", { params: { mode: "all" } });
      const convo = Array.isArray(r.conversations) ? r.conversations : [];
      const meta: Record<string, { unread: number; latest: string }> = {};
      for (const row of convo) {
        const id = row.thread_key ?? row.contact_id ?? "";
        if (!id) continue;
        meta[id] = { unread: Number(row.unread_count ?? 0), latest: row.last_at ?? "" };
      }
      setContactMeta(meta);
      return convo;
    } catch {
      return [];
    }
  }, []);
  useEffect(() => {
    const tick = setInterval(() => { void fetchSmsConversations(); }, 5000);
    return () => clearInterval(tick);
  }, [fetchSmsConversations]);
  useEffect(() => {
    api<{ conversations?: Array<{ thread_key?: string; contact_id?: string; display_name?: string; phone?: string | null; last_at?: string; last_body?: string; unread_count?: number }> }>("/api/communications/sms", { params: { mode: "all" } })
      .then(async (r) => {
        const convo = Array.isArray(r.conversations) ? r.conversations : [];
        const meta: Record<string, { unread: number; latest: string }> = {};
        for (const row of convo) {
          const id = row.thread_key ?? row.contact_id ?? "";
          if (!id) continue;
          meta[id] = { unread: Number(row.unread_count ?? 0), latest: row.last_at ?? "" };
        }
        setContactMeta(meta);
        const mapped = convo.map((row) => ({
          id: row.thread_key ?? row.contact_id ?? "",
          name: row.display_name ?? row.phone ?? "Unknown",
          phone: row.phone ?? null,
          latest: row.last_at ?? "",
        })).filter((c) => c.id);
        if (mapped.length > 0) {
          mapped.sort((a, b) => {
            const ta = a.latest ? new Date(a.latest).getTime() : 0;
            const tb = b.latest ? new Date(b.latest).getTime() : 0;
            const tas = Number.isNaN(ta) ? 0 : ta;
            const tbs = Number.isNaN(tb) ? 0 : tb;
            return tbs - tas;
          });
          setContacts(mapped as Contact[]);
          if (!selected && mapped[0]) {
            setSelected(mapped[0] as Contact);
          }
          setHasSentMessages(true);
        } else {
          // BF_PORTAL_BLOCK_57R_CAL_DOCS_DELETE_REFERRER_COMMS_v2
          // Pre-fix: when /api/communications/sms returned 0 conversations
          // AND no fallback `contacts` array, sidebar showed "No contacts.
          // Add contacts in CRM first." even when CRM had rows. Now: pull
          // CRM contacts (phone-bearing) as the baseline.
          const fallback = (r as { contacts?: Contact[] }).contacts;
          if (Array.isArray(fallback) && fallback.length > 0) {
            setContacts(fallback);
            setHasSentMessages(true);
          } else {
            try {
              const crm = await api<{ items?: Contact[] } | Contact[]>("/api/crm/contacts", { params: { pageSize: 500 } });
              const list: Contact[] = Array.isArray(crm) ? (crm as Contact[]) : ((crm as { items?: Contact[] }).items ?? []);
              const withPhone = list.filter((c) => c?.id && hasUsablePhone(c));
              setContacts(withPhone);
              setHasSentMessages(false);
            } catch {
              setContacts([]);
              setHasSentMessages(false);
            }
          }
        }
      })
      .catch((error) => {
        if (isBadRequest(error)) return;
      })
  }, []);

  useEffect(() => {
    if (!selected) {
      setThreadMessages([]);
      return;
    }
    setContactMeta((prev) => {
      const id = String(selected.id ?? "");
      const existing = id ? prev[id] : undefined;
      if (!existing) return prev;
      return { ...prev, [id]: { unread: 0, latest: existing.latest } };
    });
    let cancelled = false;
    (async () => {
      try {
        const r = await api<{ messages?: Message[]; data?: Message[] } | Message[]>(
          "/api/communications/sms/thread",
          { params: { contactId: String(selected.id ?? "") } },
        );
        const list = Array.isArray(r) ? r : (r?.messages ?? r?.data ?? []);
        if (!cancelled) setThreadMessages(list);
      } catch {
        if (!cancelled) setThreadMessages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  const loadMessages = useCallback((contactId: string, phone?: string | null) => {
    const params: Record<string, string> = {};
    if (contactId) params.contactId = contactId;
    else if (phone) params.phone = phone;

    Promise.resolve(
      api<{ messages?: Message[]; data?: Message[] } | Message[]>("/api/communications/sms/thread", { params })
    )
      .then(async (r) => {
        const msgs = Array.isArray(r) ? r : (r?.messages ?? r?.data ?? []);
        setThreads((prev) => {
          const merged = mergeMessages(prev[contactId] ?? [], msgs);
          if (selected?.id === contactId) setThreadMessages(merged);
          return {
            ...prev,
            [contactId]: merged,
          };
        });
      })
      .catch((error) => {
        if (isBadRequest(error)) return;
        setThreads((prev) => ({
          ...prev,
          [contactId]: [],
        }));
        if (selected?.id === contactId) setThreadMessages([]);
      });
  }, [mergeMessages, selected?.id]);

  useEffect(() => {
    if (!selected) return;
    // BF_PORTAL_BLOCK_v639_UNREAD_CLEAR_v1 — clear server-side read_at on open so
    // the nav badge and per-thread tags drop (SMS rows included via BF-Server
    // v689). Without this the SMS tab only cleared the count client-side.
    if (selected.id) {
      void Promise.resolve(api.post("/api/communications/messages/mark-read", { contactId: selected.id, phone: selected.phone ?? undefined })).catch(() => undefined);
    }
    loadMessages(selected.id, selected.phone);
    pollRef.current = setInterval(() => loadMessages(selected.id, selected.phone), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selected, loadMessages]);

  useLayoutEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    // Defer to the next frame: at layout-effect time the freshly rendered
    // bubbles' height may not be final yet, so scrollHeight is stale.
    const raf = requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    return () => cancelAnimationFrame(raf);
  }, [threadMessages, selected?.id]);

  // When switching threads or first opening, force stick to bottom so the
  // user lands on the latest message — not somewhere up the history.
  useEffect(() => {
    if (selected?.id) stickToBottomRef.current = true;
  }, [selected?.id]);

  async function send() {
    const selectedContact = selected;
    const selectedPhone = selectedContact?.phone ?? selectedContact?.phone_e164 ?? selectedContact?.mobile ?? null;
    if (!draft.trim() || !selectedContact || !selectedPhone || sending) return;
    setSending(true);
    const pendingBody = draft.trim();
    const tmpId = `tmp-${Date.now()}`;
    try {
      stickToBottomRef.current = true;
      setThreadMessages((prev) => [...prev, {
        id: tmpId,
        body: pendingBody,
        direction: "outbound",
        created_at: new Date().toISOString(),
      }]);
      await api.post("/api/communications/sms", {
        // BF_PORTAL_BLOCK_v320_COMMS_SMS_SEND_URL_v1
        // Pre-fix this POSTed to /api/sms/send, which BF-Server src/app.ts:136
        // mounts as a stub returning HTTP 501 not_implemented ("SMS send
        // endpoint not yet wired"). Outbound SMS from the staff Communications
        // page never actually sent — the optimistic UI update painted the
        // message in the thread, the POST 501'd, the catch block swallowed
        // anything except isBadRequest, and 5s later the poll refresh from
        // /api/communications/sms/thread wiped the optimistic message because
        // it was never persisted. The real Twilio send endpoint is
        // /api/communications/sms (BF-Server src/routes/communications.ts:131)
        // which sends via Twilio AND persists to communications_messages so
        // the thread view stays consistent. Same v277 pattern as v300/v311
        // (UI calling wrong URL prefix).
        to: selectedPhone,
        body: pendingBody,
        contactId: selectedContact.id,
      });
      setDraft("");
      loadMessages(selectedContact.id, selectedPhone);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (error) {
      // BF_PORTAL_COMMS_SMS_ERROR_TOAST_v1 — surface the real send failure.
      // The server nests its reason under { error: { message, twilioCode } },
      // which the http layer stashes on ApiError.details. Remove the optimistic
      // bubble so the thread doesn't imply success, restore the draft, and toast.
      setThreadMessages((prev) => prev.filter((m) => m.id !== tmpId));
      setDraft(pendingBody);
      if (isBadRequest(error)) {
        toast.error("Message couldn't be sent. Please check the number and try again.");
        return;
      }
      const details: any = (error as ApiError)?.details;
      const serverMsg: string | undefined =
        details?.error?.message ?? details?.message ?? (error as Error)?.message;
      const twilioCode = details?.error?.twilioCode ?? details?.error?.code ?? null;
      toast.error(
        `SMS failed: ${serverMsg || "Unknown error"}${twilioCode ? ` (Twilio ${twilioCode})` : ""}`,
      );
    } finally {
      setSending(false);
    }
  }

  function lastMessage(contactId: string) {
    const msgs = threads[contactId] ?? [];
    return msgs[msgs.length - 1];
  }

  function timeLabel(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  }

  const sendBroadcast = async () => {
    const ids = Array.from(picked);
    if (!ids.length || !bcBody.trim() || bcSending) return;
    setBcSending(true); setBcResult(null);
    try {
      const r: any = await api.post("/api/communications/broadcast", { contactIds: ids, body: bcBody.trim(), channel: "sms" });
      const sent = Number(r?.sent ?? r?.data?.sent ?? ids.length);
      setBcResult(`Sent to ${sent} contact(s).`);
      setBcBody(""); setPicked(new Set());
    } catch {
      setBcResult("Send failed. Please try again.");
    } finally {
      setBcSending(false);
    }
  };

  const filtered = contacts
    .filter((c) => {
      const q = search.toLowerCase();
      return c.name?.toLowerCase().includes(q) || c.phone?.includes(q);
    })
    .sort((a, b) => {
      const ma = contactMeta[String(a.id ?? "")];
      const mb = contactMeta[String(b.id ?? "")];
      const ta = ma?.latest ? new Date(ma.latest).getTime() : 0;
      const tb = mb?.latest ? new Date(mb.latest).getTime() : 0;
      const tas = Number.isNaN(ta) ? 0 : ta;
      const tbs = Number.isNaN(tb) ? 0 : tb;
      return tbs - tas;
    });

  const messages = selected ? threadMessages : [];


  useEffect(() => {
    if (forcedContact?.id) setSelected(forcedContact);
  }, [forcedContact?.id]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", flex: 1, minHeight: 0, height: "100%", overflow: "hidden", background: "#f5f5f7" }}>
      {/* ── Left — conversation list ── */}
      <div
        style={{
          width: 320,
          borderRight: "1px solid #e0e0e5",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          height: "100%",
          minHeight: 0,
        }}
      >
        {/* Search + New */}
        <div style={{ padding: "12px 12px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 17, color: "#000", flex: 1 }}>Messages</span>
            <button
              onClick={() => { setMulti((m) => !m); setPicked(new Set()); setBcResult(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#007aff", padding: "0 8px", fontWeight: 600 }}
            >
              {multi ? "Cancel" : "Select"}
            </button>
            <button
              onClick={() => setShowNewThread(true)}
              title="New Message"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#007aff", padding: 0 }}
            >
              ✏️
            </button>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            style={{
              width: "100%",
              padding: "7px 12px",
              borderRadius: 10,
              border: "none",
              background: "#f0f0f5",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              color: "#000",
            }}
          />
        </div>

        {multi && (
          <div style={{ padding: "0 12px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <label style={{ fontSize: 13, color: "#007aff", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every((c) => picked.has(String(c.id)))}
                  onChange={(e) => setPicked(e.target.checked ? new Set(filtered.map((c) => String(c.id))) : new Set())}
                />
                Select all ({filtered.length})
              </label>
              <span style={{ marginLeft: "auto", fontSize: 13, color: "#8e8e93" }}>{picked.size} selected</span>
            </div>
            {picked.size > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <textarea
                  value={bcBody}
                  onChange={(e) => setBcBody(e.target.value)}
                  placeholder={`Message ${picked.size} contact(s) individually…`}
                  rows={2}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d1d6", fontSize: 14, boxSizing: "border-box", resize: "vertical", color: "#000" }}
                />
                <button
                  disabled={!bcBody.trim() || bcSending}
                  onClick={() => void sendBroadcast()}
                  style={{ alignSelf: "flex-end", padding: "7px 16px", background: bcBody.trim() && !bcSending ? "#007aff" : "#b5d3ff", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: bcBody.trim() && !bcSending ? "pointer" : "not-allowed" }}
                >
                  {bcSending ? "Sending…" : `Send to ${picked.size}`}
                </button>
              </div>
            )}
            {bcResult && <div style={{ fontSize: 12, color: "#16a34a", marginTop: 4 }}>{bcResult}</div>}
          </div>
        )}

        {/* New thread input */}
        {showNewThread && (
          <div style={{ padding: "8px 12px", background: "#f8f8f8", borderBottom: "1px solid #e0e0e5" }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Enter phone number</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={newThreadPhone}
                onChange={(e) => setNewThreadPhone(e.target.value)}
                placeholder="+1 (555) 555-5555"
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 13,
                  color: "#000",
                  outline: "none",
                }}
              />
              <button
                onClick={() => {
                  if (!newThreadPhone.trim()) return;
                  const digits = newThreadPhone.replace(/\D/g, "");
                  const fake: Contact = { id: `new-${digits}`, name: newThreadPhone, phone: newThreadPhone };
                  setSelected(fake);
                  setShowNewThread(false);
                  setNewThreadPhone("");
                }}
                style={{
                  padding: "6px 12px",
                  background: "#007aff",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Start
              </button>
              <button
                onClick={() => setShowNewThread(false)}
                style={{
                  padding: "6px 10px",
                  background: "#e5e5ea",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: "pointer",
                  color: "#000",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Thread list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "20px 16px", textAlign: "center", color: "#8e8e93", fontSize: 14 }}>
              {contacts.length === 0 ? "No CRM contacts with phone numbers yet. Add a contact with a phone in CRM to start an SMS thread." : (hasSentMessages ? "No conversations match this filter." : "No conversations yet - click a contact to start one.")}
            </div>
          )}
          {filtered.map((c) => {
            const last = lastMessage(c.id);
            const isSelected = selected?.id === c.id;
            const meta = contactMeta[String(c.id ?? "")];
            const unread = Number(meta?.unread ?? 0);
            const hasUnread = unread > 0 && !isSelected;
            return (
              <div
                key={c.id}
                onClick={() => {
                  setSelected(c);
                  onContactSelected?.(c);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 16px",
                  cursor: "pointer",
                  background: isSelected ? "#e8f0fe" : (hasUnread ? "#eff6ff" : "transparent"),
                  // BF_PORTAL_BLOCK_v639_UNREAD_CLEAR_v1 — subtle left accent for
                  // unread instead of a heavy 4-sided box (which read as an error).
                  borderLeft: hasUnread ? "3px solid #2563eb" : "3px solid transparent",
                  borderBottom: "1px solid #f0f0f5",
                  transition: "background 0.2s ease-out, border-color 0.2s ease-out",
                  position: "relative",
                }}
              >
                {multi && (
                  <input
                    type="checkbox"
                    checked={picked.has(String(c.id))}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => { e.stopPropagation(); setPicked((prev) => { const n = new Set(prev); const k = String(c.id); if (n.has(k)) n.delete(k); else n.add(k); return n; }); }}
                    style={{ flexShrink: 0, width: 18, height: 18 }}
                    aria-label="Select contact"
                  />
                )}
                <Avatar name={c.name} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontWeight: hasUnread ? 700 : 600, fontSize: 15, color: "#000" }}>{c.name}</span>
                    {last && <span style={{ fontSize: 11, color: hasUnread ? "#2563eb" : "#8e8e93", flexShrink: 0, fontWeight: hasUnread ? 600 : 400 }}>{timeLabel(last.created_at)}</span>}
                  </div>
                  {last ? (
                    <div
                      style={{
                        fontSize: 13,
                        color: hasUnread ? "#1e293b" : "#8e8e93",
                        fontWeight: hasUnread ? 500 : 400,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {last.direction === "outbound" ? "You: " : ""}
                      {last.body}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "#c7c7cc" }}>{c.phone}</div>
                  )}
                </div>
                {hasUnread && (
                  <div style={{ position: "absolute", top: 6, right: 8, minWidth: 18, height: 18, borderRadius: 9, background: "#2563eb", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }} aria-label={`${unread} unread`}>
                    {unread > 99 ? "99+" : unread}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right — thread ── */}
      <div style={{ display: "flex", flexDirection: "column", background: "#fff", minWidth: 0, minHeight: 0, height: "100%", overflow: "hidden" }}>
        {!selected ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#8e8e93",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 40 }}>💬</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#000" }}>No conversation selected</div>
            <div style={{ fontSize: 14 }}>Choose from the list or start a new message</div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid #f0f0f5",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#f5f5f7",
                color: "#000",
                flexShrink: 0,
              }}
            >
              <Avatar name={selected.name} size={36} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#000" }}>{selected.name}</div>
                {selected.phone && <div style={{ fontSize: 12, color: "#3c3c43" }}>{selected.phone}</div>}
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollContainerRef}
              onScroll={onScrollContainer}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                background: "#fff",
                minHeight: 0,
              }}
            >
              <CommunicationsThread
                messages={messages.map((m) => ({
                  id: m.id,
                  body: m.body,
                  direction: m.direction,
                  authorRole: m.direction === "outbound" ? "self" : "other",
                  authorName: m.direction === "outbound" ? "You" : selected.name,
                  created_at: m.created_at,
                }))}
                emptyText="No messages yet. Send the first one."
              />
              <div ref={bottomRef} />
            </div>

            <ComposerPulldowns channel="sms" onInsertText={(text) => setDraft((previous) => previous + (previous && !previous.endsWith(" ") ? " " : "") + text)} />
            {/* Compose — padding-right keeps send button clear of floating dialer */}
            <div
              style={{
                padding: "8px 16px 12px 16px",
                paddingRight: 88,
                borderTop: "1px solid #f0f0f5",
                display: "flex",
                alignItems: "flex-end",
                gap: 10,
                background: "#fff",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  flex: 1,
                  border: "1px solid #d1d5db",
                  borderRadius: 20,
                  padding: "6px 14px",
                  background: "#f9f9f9",
                }}
              >
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="iMessage"
                  rows={1}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: 15,
                    resize: "none",
                    color: "#000",
                    fontFamily: "inherit",
                    lineHeight: 1.4,
                    maxHeight: 100,
                    overflow: "auto",
                  }}
                />
              </div>
              <button
                onClick={() => void send()}
                disabled={!draft.trim() || sending}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: "none",
                  background: draft.trim() ? "#007aff" : "#e5e5ea",
                  color: "#fff",
                  fontSize: 18,
                  cursor: draft.trim() ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
              >
                ↑
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Messages tab ──────────────────────────────────────────────────────────────
// BF_PORTAL_BLOCK_v607_MESSAGES_TAB_REBUILD_v1
// Left panel: every CRM contact in the active silo (v636 ?mode=all).
// Thread: /api/communications/messages/thread/:applicationId — richer
// payload with ctaLabel/ctaAction.
// Send: /api/communications/messages/send — server (v636) fires the
// offline-fallback SMS when the user hasn't polled the mini-portal in 60s.
type MessagesListRow = {
  thread_key: string | null;
  contact_id: string | null;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  last_at: string | null;
  last_body: string | null;
  unread_count: number | null;
};

type MsgRow = {
  id: string;
  body: string;
  senderType?: "client" | "staff";
  senderName?: string | null;
  createdAt?: string;
  source?: "client" | "staff";
  ctaLabel?: string | null;
  ctaAction?: string | null;
  attachments?: Array<{ name: string; contentType?: string | null; dataUrl: string }> | null;
};

function MessagesTab({ onStartConversation }: { onStartConversation: (contact: Contact) => void }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");

  type Row = {
    contactId: string;
    name: string;
    phone: string | null;
    lastAt: string | null;
    lastBody: string | null;
    unread: number;
  };
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  // BF_PORTAL_BLOCK_v637_INAPP_MSG_ALERTS_v1 — stick the Messages thread to bottom.
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // BF_PORTAL_BLOCK_v802_MULTISEND_MESSAGES — pick multiple contacts and send the same in-app message to each 1:1 via /broadcast.
  const [multi, setMulti] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bcBody, setBcBody] = useState("");
  const [bcSending, setBcSending] = useState(false);
  const [bcResult, setBcResult] = useState<string | null>(null);

  // BF_PORTAL_BLOCK_v621_MESSAGES_TAB_FALLBACK_v1 — when messages-list returns
  // empty, fall back to /api/crm/contacts so the left list isn't blank even
  // before any messages have been exchanged with a contact.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api<{ conversations?: MessagesListRow[] }>("/api/communications/messages-list", { params: { mode: "all" } });
        if (cancelled) return;
        const list = Array.isArray(r.conversations) ? r.conversations : [];
        let mapped: Row[] = list
          .filter((c) => c.contact_id || c.thread_key)
          .map((c) => ({
            contactId: (c.contact_id ?? c.thread_key) as string,
            name: c.display_name ?? c.phone ?? "Unknown",
            phone: c.phone,
            lastAt: c.last_at,
            lastBody: c.last_body,
            unread: Number(c.unread_count ?? 0),
          }));
        mapped.sort((a, b) => {
          const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
          const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
          return tb - ta;
        });
        if (mapped.length === 0) {
          try {
            const crm = await api<{ items?: Array<{ id: string; name?: string | null; phone?: string | null; email?: string | null }> } | Array<{ id: string; name?: string | null; phone?: string | null; email?: string | null }>>("/api/crm/contacts", { params: { pageSize: 500 } });
            const items = Array.isArray(crm) ? crm : (crm as { items?: Array<{ id: string; name?: string | null; phone?: string | null; email?: string | null }> }).items ?? [];
            mapped = items.map((c) => ({
              contactId: c.id,
              name: c.name ?? c.email ?? c.phone ?? "Unknown",
              phone: c.phone ?? null,
              lastAt: null,
              lastBody: null,
              unread: 0,
            }));
          } catch { /* ignore */ }
        }
        if (cancelled) return;
        setRows(mapped);
        if (!selected && mapped[0]) setSelected(mapped[0]);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Re-fetch on selection change so the unread count + last preview update
    // after a send. The ESLint exhaustive-deps lint reports `selected` here;
    // intentional — we re-fetch the list after every selection-driven send.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.contactId]);

  // BF_PORTAL_BLOCK_v637_INAPP_MSG_ALERTS_v1 — poll the thread list so brand-new
  // inbound conversations appear without a manual remount.
  useEffect(() => {
    const tick = setInterval(async () => {
      try {
        const r = await api<{ conversations?: MessagesListRow[] }>("/api/communications/messages-list", { params: { mode: "all" } });
        const list = Array.isArray(r.conversations) ? r.conversations : [];
        const mapped: Row[] = list
          .filter((c) => c.contact_id || c.thread_key)
          .map((c) => ({
            contactId: (c.contact_id ?? c.thread_key) as string,
            name: c.display_name ?? c.phone ?? "Unknown",
            phone: c.phone,
            lastAt: c.last_at,
            lastBody: c.last_body,
            unread: Number(c.unread_count ?? 0),
          }))
          .sort((a, b) => (b.lastAt ? new Date(b.lastAt).getTime() : 0) - (a.lastAt ? new Date(a.lastAt).getTime() : 0));
        if (mapped.length > 0) setRows(mapped);
      } catch { /* ignore */ }
    }, 8000);
    return () => clearInterval(tick);
  }, []);

  // ── On selection: resolve latest application_id ──────────────────────────
  useEffect(() => {
    if (!selected?.contactId) {
      setApplicationId(null);
      setMessages([]);
      return;
    }
    let cancelled = false;
    api<Array<{ id: string }>>(`/api/crm/contacts/${encodeURIComponent(selected.contactId)}/applications`)
      .then((apps) => {
        if (cancelled) return;
        const latest = Array.isArray(apps) ? apps[0]?.id ?? null : null;
        setApplicationId(latest);
      })
      .catch(() => {
        if (!cancelled) setApplicationId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.contactId]);

  // ── Thread load + poll ──────────────────────────────────────────────────
  // BF_PORTAL_BLOCK_v626_COMMS_REALTIME_v1 — adds:
  //   • Typing indicator state (whether the OTHER side is typing)
  //   • read-receipt mark on view (inbound→read_at NOW)
  //   • Typing emit on draft change (debounced 1.5s)
  // Thread loader stays contact-keyed (v624).
  const [otherTyping, setOtherTyping] = useState(false);
  useLayoutEffect(() => {
    const node = threadEndRef.current;
    if (!node) return;
    const raf = requestAnimationFrame(() => node.scrollIntoView({ block: "end" }));
    return () => cancelAnimationFrame(raf);
  }, [messages, selected?.contactId]);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadThread = useCallback((contactId: string) => {
    if (!contactId) {
      setMessages([]);
      return;
    }
    api<MsgRow[]>(`/api/communications/messages/thread`, { params: { contactId } })
      .then((r) => {
        setMessages(Array.isArray(r) ? r : []);
      })
      .catch(() => setMessages([]));
  }, []);

  // Mark inbound messages read whenever the staff opens / scrolls a thread.
  const markRead = useCallback((contactId: string) => {
    if (!contactId) return;
    api.post('/api/communications/messages/mark-read', { contactId }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    const cid = selected?.contactId ?? null;
    if (!cid) {
      setMessages([]);
      setOtherTyping(false);
      return;
    }
    setLoadingThread(true);
    loadThread(cid);
    markRead(cid);
    setLoadingThread(false);
    pollRef.current = setInterval(() => {
      loadThread(cid);
      api<{ typing: boolean; label: string | null }>(`/api/communications/messages/typing`, { params: { contactId: cid, side: 'client' } })
        .then((r) => setOtherTyping(Boolean(r?.typing)))
        .catch(() => undefined);
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [selected?.contactId, loadThread, markRead]);

  useEffect(() => {
    const cid = selected?.contactId ?? null;
    if (!cid || !draft) return;
    api.post('/api/communications/messages/typing', { contactId: cid, side: 'staff' }).catch(() => undefined);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => { typingTimer.current = null; }, 1500);
    return () => { if (typingTimer.current) { clearTimeout(typingTimer.current); typingTimer.current = null; } };
  }, [draft, selected?.contactId]);

  // ── Send ────────────────────────────────────────────────────────────────
  async function send() {
    const cid = selected?.contactId ?? null;
    if (!cid || !draft.trim() || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    try {
      const optimisticId = `local-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          body: text,
          senderType: "staff",
          senderName: "You",
          createdAt: new Date().toISOString(),
          source: "staff",
        },
      ]);
      // BF_PORTAL_BLOCK_v624_COMMS_AND_CALENDAR_v1 — POST is now contactId
      // first; applicationId optional (sent if a current app is resolved).
      await api.post("/api/communications/messages/send", { contactId: cid, applicationId: applicationId ?? undefined, body: text });
      await loadThread(cid);
    } catch (err) {
      console.error("[messages tab] send failed", err);
    } finally {
      setSending(false);
    }
  }

  const sendBroadcast = async () => {
    const ids = Array.from(picked);
    const text = bcBody.trim();
    if (!ids.length || !text || bcSending) return;
    setBcSending(true);
    setBcResult(null);
    try {
      const r: any = await api.post("/api/communications/broadcast", { contactIds: ids, body: text, channel: "message" });
      const sent = Number(r?.sent ?? r?.data?.sent ?? ids.length);
      setBcResult(`Sent to ${sent} contact(s).`);
      setBcBody("");
      setPicked(new Set());
      setMulti(false);
    } catch {
      setBcResult("Send failed. Please try again.");
    } finally {
      setBcSending(false);
    }
  };

  function fmtAt(at: string | null): string {
    if (!at) return "";
    try {
      const d = new Date(at);
      if (Number.isNaN(d.getTime())) return "";
      const diffH = (Date.now() - d.getTime()) / 36e5;
      if (diffH < 24) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", flex: 1, minHeight: 0 }}>
      <div style={{ borderRight: "1px solid #e2e8f0", padding: 12, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ margin: 0 }}>Messages</h3>
            <button
              type="button"
              onClick={() => {
                setMulti((m) => !m);
                setPicked(new Set());
                setBcResult(null);
              }}
              style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0 }}
            >
              {multi ? "Cancel" : "Select"}
            </button>
          </div>
          {/* BF_PORTAL_BLOCK_v638_MESSAGES_USABILITY_v1 — clear the unread backlog
              (the "stuck 16"). Marks every unread thread read server-side; the
              nav badge self-heals on the next watcher poll. */}
          {rows.some((r) => Number(r.unread) > 0) && (
            <button
              type="button"
              onClick={async () => {
                const ids = rows.filter((r) => Number(r.unread) > 0).map((r) => r.contactId).filter(Boolean);
                await Promise.all(ids.map((id) => api.post("/api/communications/messages/mark-read", { contactId: id }).catch(() => undefined)));
                setRows((prev) => prev.map((r) => ({ ...r, unread: 0 })));
              }}
              style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0 }}
            >
              Mark all read
            </button>
          )}
        </div>
        {multi && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#2563eb", cursor: "pointer", marginBottom: 6 }}>
              <input
                type="checkbox"
                checked={rows.length > 0 && rows.every((r) => picked.has(r.contactId))}
                onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.contactId)) : new Set())}
              />
              Select all ({rows.length}) · {picked.size} selected
            </label>
            {picked.size > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <textarea
                  value={bcBody}
                  onChange={(e) => setBcBody(e.target.value)}
                  placeholder={`Message ${picked.size} contact(s) individually…`}
                  rows={2}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box", resize: "vertical", color: "#000" }}
                />
                <button
                  type="button"
                  disabled={!bcBody.trim() || bcSending}
                  onClick={() => void sendBroadcast()}
                  style={{ alignSelf: "flex-end", padding: "6px 14px", background: bcBody.trim() && !bcSending ? "#2563eb" : "#93c5fd", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: bcBody.trim() && !bcSending ? "pointer" : "not-allowed" }}
                >
                  {bcSending ? "Sending…" : `Send to ${picked.size}`}
                </button>
              </div>
            )}
            {bcResult && <div style={{ fontSize: 12, color: bcResult.startsWith("Sent") ? "#16a34a" : "#dc2626", marginTop: 4 }}>{bcResult}</div>}
          </div>
        )}
        {rows.map((c) => (
          <div key={c.contactId} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {multi && (
              <input
                type="checkbox"
                checked={picked.has(c.contactId)}
                onChange={() => setPicked((prev) => {
                  const next = new Set(prev);
                  if (next.has(c.contactId)) next.delete(c.contactId);
                  else next.add(c.contactId);
                  return next;
                })}
                style={{ flexShrink: 0, width: 16, height: 16 }}
                aria-label={`Select ${c.name}`}
              />
            )}
            <button
              type="button"
              onClick={() => setSelected(c)}
              style={{
                width: "100%",
                textAlign: "left",
                // BF_PORTAL_BLOCK_v624_COMMS_AND_CALENDAR_v1 — unread contacts
                // get a bold left border (no numeric badge per Todd's #9).
                borderLeft: c.unread > 0 ? "4px solid #2563eb" : "4px solid transparent",
                border: 0,
                // BF_PORTAL_BLOCK_v638_MESSAGES_USABILITY_v1 — require a real contactId
                // on both sides so null-id rows (e.g. duplicates) do not all highlight.
                background: (!!selected?.contactId && selected?.contactId === c.contactId) ? "#f0f9ff" : "transparent",
                padding: "10px 8px",
                borderBottom: "1px solid #eef2f7",
                cursor: "pointer",
                color: "#000",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                fontWeight: c.unread > 0 ? 700 : 400,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: c.unread > 0 ? 700 : 600, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtAt(c.lastAt)}</div>
              </div>
              {c.lastBody && (
                <div style={{ fontSize: 12, color: c.unread > 0 ? "#1e293b" : "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.lastBody}
                </div>
              )}
            </button>
          </div>
        ))}
        {rows.length === 0 && <div style={{ color: "#8e8e93", padding: 12 }}>No contacts in this silo yet.</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, height: "100%", overflow: "hidden", background: "#fff" }}>
        {!selected && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#8e8e93", flex: 1 }}>Choose a contact.</div>}
        {selected && (
          <>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f5", background: "#f5f5f7" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#000" }}>{selected.name}</div>
              {selected.phone && <div style={{ fontSize: 12, color: "#3c3c43" }}>{selected.phone}</div>}
              {!applicationId && (
                <div style={{ fontSize: 11, color: "#b45309", marginTop: 4 }}>
                  No active application linked to this contact yet — messages can still be sent.
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", minHeight: 0 }}>
              {loadingThread ? (
                <div style={{ color: "#8e8e93" }}>Loading…</div>
              ) : (
                <CommunicationsThread
                  messages={messages.map((m) => ({
                    id: m.id,
                    body: m.body,
                    authorRole: (m.senderType === "staff" || m.source === "staff") ? "self" : "other",
                    authorName: m.senderType === "staff" ? (m.senderName ?? "You") : selected.name,
                    created_at: m.createdAt ?? null,
                    attachments: m.attachments ?? undefined,
                  }))}
                  emptyText="No messages yet — say hello."
                />
              )}
              {otherTyping && (
                <div style={{ fontSize: 12, color: "#64748b", padding: "4px 0", fontStyle: "italic" }}>
                  {selected.name} is typing…
                </div>
              )}
              <div ref={threadEndRef} />
            </div>
            {/* BF_PORTAL_BLOCK_v638_MESSAGES_USABILITY_v1 — composer shows for any
                selected contact; send() already posts contactId-first with
                applicationId optional, so staff can message people who have no
                application yet. */}
            {selected && (
              <>
                <ComposerPulldowns channel="message" onInsertText={(text) => setDraft((previous) => previous + (previous && !previous.endsWith(" ") ? " " : "") + text)} />
                <div style={{ borderTop: "1px solid #e2e8f0", padding: "10px 16px", paddingRight: 88, display: "flex", gap: 8, background: "#fff" }}>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    rows={2}
                    placeholder="Message the client…  (⌘/Ctrl+Enter to send.  Insert form links like #networth, #debt, #upload.)"
                    style={{ flex: 1, resize: "none", border: "1px solid #d1d5db", borderRadius: 8, padding: 10, fontSize: 14, color: "#000", background: "#fff" }}
                  />
                  <button
                    onClick={() => void send()}
                    disabled={!draft.trim() || sending}
                    style={{
                      alignSelf: "flex-end",
                      background: draft.trim() && !sending ? "#2563eb" : "#94a3b8",
                      color: "#fff",
                      border: 0,
                      borderRadius: 8,
                      padding: "10px 18px",
                      fontWeight: 600,
                      cursor: draft.trim() && !sending ? "pointer" : "not-allowed",
                    }}
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "grid", placeItems: "center", zIndex: 70 }}>
          <div style={{ width: "min(560px, 92vw)", background: "#fff", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>New SMS</h3>
            <label style={{ display: "block", marginBottom: 8 }}>Phone<textarea value={to} onChange={(e) => setTo(e.target.value)} rows={2} style={{ background: "#fff", color: "#000", border: "1px solid #d1d5db", padding: 10, borderRadius: 8, fontSize: 14, width: "100%", minHeight: 80 }} /></label>
            <label style={{ display: "block", marginBottom: 8 }}>Message<textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} style={{ background: "#fff", color: "#000", border: "1px solid #d1d5db", padding: 10, borderRadius: 8, fontSize: 14, width: "100%", minHeight: 80 }} /></label>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={async () => {
                if (!to.trim() || !body.trim()) return;
                await api.post("/api/communications/sms", { to: to.trim(), body: body.trim() });
                const c: Contact = { id: `new-${to.replace(/\D/g,"")}`, name: to.trim(), phone: to.trim() };
                onStartConversation(c);
                setOpen(false);
                setTo("");
                setBody("");
              }} style={{ background: "#0d9b6c", color: "#fff", border: 0, borderRadius: 8, padding: "8px 12px" }}>Send SMS</button>
              <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inbox tab ─────────────────────────────────────────────────────────────────
function InboxTab() {
  const [composeOpen, setComposeOpen] = useState(false);
  // v702: reply prefill (to / "Re:" subject / quoted body) for the open email.
  const [replyCtx, setReplyCtx] = useState<{ to: string; subject: string; body: string }>({
    to: "",
    subject: "",
    body: "",
  });

  const [mailboxes, setMailboxes] = useState<{ mine: { address: string; display_name: string } | null; shared: { address: string; display_name: string }[] }>({ mine: null, shared: [] });
  const [active, setActive] = useState<string>("");
  const [messages, setMessages] = useState<Array<{ id: string; subject: string; bodyPreview?: string; from?: { emailAddress?: { address: string; name?: string } }; receivedDateTime?: string; isRead?: boolean; flag?: { flagStatus?: string }; conversationId?: string }>>([]); // BF_PORTAL_BLOCK_v833_INBOX_SEARCH_FOLDERS_THREAD
  const [selectedId, setSelectedId] = useState<string>("");
  const [selected, setSelected] = useState<{ subject: string; from?: { emailAddress?: { address: string; name?: string } }; toRecipients?: Array<{ emailAddress?: { address?: string } }>; ccRecipients?: Array<{ emailAddress?: { address?: string } }>; body?: { content: string; contentType: "html" | "text" }; receivedDateTime?: string } | null>(null); // BF_PORTAL_BLOCK_v835_INBOX_REPLY_ALL_FORWARD
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // BF_PORTAL_BLOCK_v213_INBOX_RECONNECT_M365_v2
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // BF_PORTAL_BLOCK_v823_INBOX_READTOGGLE_SORT_BADGE
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  // BF_PORTAL_BLOCK_v833_INBOX_SEARCH_FOLDERS_THREAD — search + folder filter.
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState<"inbox" | "sent" | "all">("inbox");
  // Debounce the search box so we don't hit Graph on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(queryInput.trim()), 400);
    return () => clearTimeout(t);
  }, [queryInput]);

  // Load mailboxes once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await withO365Refresh(() =>
          api<{ mine: { address: string; display_name: string } | null; shared: { address: string; display_name: string }[] }>("/api/crm/shared-mailboxes")
        );
        if (cancelled) return;
        setMailboxes(r);
        // Default to personal mailbox if available, else first shared
        setActive(r.mine ? "" : (r.shared[0]?.address ?? ""));
        setNeedsReconnect(false);
      } catch (e: unknown) {
        if (cancelled) return;
        const status = (e as { status?: number; response?: { status?: number } })?.status
          ?? (e as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          setNeedsReconnect(true);
          setErr(null);
        } else {
          setErr("Could not load Microsoft 365 mailboxes.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [reconnectAttempts]);

  // Load messages whenever active mailbox changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setSelectedId("");
    setSelected(null);
    (async () => {
      try {
        const params = { ...(active ? { mailbox: active } : {}), sort: sortDir, folder, ...(query ? { q: query } : {}) };
        const r = await withO365Refresh(() =>
          api<typeof messages>("/api/crm/inbox", { params })
        );
        if (cancelled) return;
        setMessages(Array.isArray(r) ? r : []);
        setNeedsReconnect(false);
      } catch (e: unknown) {
        if (cancelled) return;
        const status = (e as { status?: number; response?: { status?: number } })?.status
          ?? (e as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          setNeedsReconnect(true);
          setErr(null);
        } else {
          const message = e instanceof Error ? e.message : "Could not load inbox.";
          setErr(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [active, reconnectAttempts, sortDir, folder, query]);

  // Load body when a message is selected
  useEffect(() => {
    if (!selectedId) { setSelected(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const params = active ? { mailbox: active } : {};
        const r = await withO365Refresh(() =>
          api<typeof selected>(`/api/crm/inbox/${encodeURIComponent(selectedId)}`, { params })
        );
        if (!cancelled) setSelected(r);
      } catch {
        if (!cancelled) setSelected(null);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId, active]);

  // BF_PORTAL_BLOCK_v213_INBOX_RECONNECT_M365_v2
  // Reconnect Microsoft 365 in place — no navigation to Settings required.
  const handleReconnect = async (): Promise<void> => {
    if (reconnecting) return;
    setReconnecting(true);
    setErr(null);
    try {
      const msal = (window as unknown as { msalInstance?: {
        getAllAccounts?: () => Array<{ homeAccountId?: string }>;
        acquireTokenSilent: (req: unknown) => Promise<{ accessToken: string; refreshToken?: string; expiresOn?: Date }>;
        acquireTokenPopup: (req: unknown) => Promise<{ accessToken: string; refreshToken?: string; expiresOn?: Date }>;
      } }).msalInstance;
      if (!msal) {
        setErr("Microsoft 365 is not configured. Reload and try again.");
        return;
      }
      const scopes = [
        "User.Read", "Mail.Send", "Mail.ReadWrite", "Mail.Send.Shared",
        "Calendars.ReadWrite", "Tasks.ReadWrite", "offline_access",
      ];
      const accounts = msal.getAllAccounts?.() ?? [];
      let result: { accessToken: string; refreshToken?: string; expiresOn?: Date };
      try {
        if (!accounts.length) throw new Error("no_account");
        result = await msal.acquireTokenSilent({ scopes, account: accounts[0] });
      } catch {
        result = await msal.acquireTokenPopup({ scopes });
      }
      if (!result?.accessToken) throw new Error("no_token");
      await api.post("/api/users/me/o365-tokens", {
        access_token: result.accessToken,
        refresh_token: result.refreshToken ?? null,
        expires_in: result.expiresOn
          ? Math.max(0, Math.floor((result.expiresOn.getTime() - Date.now()) / 1000))
          : null,
        account_id: accounts[0]?.homeAccountId ?? null,
      });
      setNeedsReconnect(false);
      setReconnectAttempts((n) => n + 1);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Reconnect failed.";
      setErr(`Reconnect failed: ${message}. Open Settings → My Profile to reconnect manually.`);
    } finally {
      setReconnecting(false);
    }
  };

  // BF_PORTAL_BLOCK_v622_INBOX_REFRESH_DELETE_v1 — delete + auto-refresh
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const unreadCount = messages.filter((mm) => mm.isRead === false).length;
  const threadCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const message of messages) {
      if (!message.conversationId) continue;
      counts.set(message.conversationId, (counts.get(message.conversationId) ?? 0) + 1);
    }
    return counts;
  }, [messages]);
  const markRead = useCallback(async (messageId: string, isRead: boolean): Promise<void> => {
    try {
      const params = active ? { mailbox: active } : {};
      await api(`/api/crm/inbox/${encodeURIComponent(messageId)}/read`, { method: "PATCH", params, body: { isRead } });
      setMessages((prev) => prev.map((mm) => (mm.id === messageId ? { ...mm, isRead } : mm)));
    } catch { /* non-fatal */ }
  }, [active]);
  const handleDelete = useCallback(async (messageId: string): Promise<void> => {
    if (!messageId) return;
    if (!window.confirm("Move this email to Deleted Items?")) return;
    setDeletingId(messageId);
    try {
      const params = active ? { mailbox: active } : {};
      await api(`/api/crm/inbox/${encodeURIComponent(messageId)}`, { method: "DELETE", params });
      setMessages((prev) => prev.filter((mm) => mm.id !== messageId));
      setSelectedId((sid) => (sid === messageId ? "" : sid));
      setSelected((sel) => (selectedId === messageId ? null : sel));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      setErr(message);
    } finally {
      setDeletingId(null);
    }
  }, [active, selectedId]);

  // BF_PORTAL_BLOCK_v832_INBOX_FLAG_AND_BULK — flag + bulk multi-select.
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const togglePick = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const flagMessage = useCallback(async (messageId: string, flagged: boolean): Promise<void> => {
    try {
      const params = active ? { mailbox: active } : {};
      await api(`/api/crm/inbox/${encodeURIComponent(messageId)}/flag`, { method: "PATCH", params, body: { flagged } });
      setMessages((prev) => prev.map((mm) => (mm.id === messageId ? { ...mm, flag: { flagStatus: flagged ? "flagged" : "notFlagged" } } : mm)));
    } catch { /* non-fatal */ }
  }, [active]);
  const bulkMarkRead = useCallback(async (isRead: boolean): Promise<void> => {
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) { await markRead(id, isRead); }
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, markRead]);
  const bulkFlag = useCallback(async (): Promise<void> => {
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) { await flagMessage(id, true); }
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, flagMessage]);
  const bulkDelete = useCallback(async (): Promise<void> => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (!window.confirm(`Move ${ids.length} email(s) to Deleted Items?`)) return;
    setBulkBusy(true);
    try {
      const params = active ? { mailbox: active } : {};
      for (const id of ids) {
        try {
          await api(`/api/crm/inbox/${encodeURIComponent(id)}`, { method: "DELETE", params });
          setMessages((prev) => prev.filter((mm) => mm.id !== id));
        } catch { /* skip individual failures */ }
      }
      setSelectedId((sid) => (ids.includes(sid) ? "" : sid));
      setSelected((sel) => (selectedId && ids.includes(selectedId) ? null : sel));
      setSelectedIds(new Set());
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, active, selectedId]);

  useEffect(() => {
    if (needsReconnect) return;
    const tick = setInterval(() => {
      (async () => {
        try {
          const params = active ? { mailbox: active } : {};
          const r = await withO365Refresh(() => api<typeof messages>("/api/crm/inbox", { params }));
          if (Array.isArray(r)) setMessages(r);
        } catch { /* background poll: swallow */ }
      })();
    }, 20000);
    return () => clearInterval(tick);
  }, [active, needsReconnect]);

  const mailboxOptions: Array<{ value: string; label: string }> = [];
  if (mailboxes.mine) mailboxOptions.push({ value: "", label: `${mailboxes.mine.display_name} (mine)` });
  for (const m of mailboxes.shared) mailboxOptions.push({ value: m.address, label: m.display_name });

  // BF_PORTAL_BLOCK_v625_INBOX_COMPOSE_FULL_v1 — load applications list for
  // the "Insert app link" picker on the Compose modal. Lightweight, runs
  // once on mount.
  const [appOptions, setAppOptions] = useState<Array<{ id: string; label: string }>>([]);
  useEffect(() => {
    let cancelled = false;
    api<{ items?: Array<{ id: string; business_name?: string | null; legal_business_name?: string | null; applicant_name?: string | null }> } | Array<any>>(
      "/api/applications",
      { params: { pageSize: 100 } },
    )
      .then((r) => {
        if (cancelled) return;
        const list = Array.isArray(r) ? r : (r?.items ?? []);
        setAppOptions(
          list
            .filter((a: any) => a?.id)
            .map((a: any) => ({
              id: String(a.id),
              label:
                a.business_name ||
                a.legal_business_name ||
                a.applicant_name ||
                String(a.id).slice(-8).toUpperCase(),
            }))
            .slice(0, 100),
        );
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 0, height: "100%", background: "#fff", color: "#000", position: "relative" }}>
      {/* BF_PORTAL_BLOCK_v213_INBOX_RECONNECT_M365_v2 — reconnect banner */}
      {needsReconnect && (
        <div style={{
          gridColumn: "1 / -1",
          padding: "12px 16px",
          background: "#fef3c7",
          borderBottom: "1px solid #fde68a",
          color: "#78350f",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 14,
        }}>
          <span style={{ flex: 1 }}>
            Microsoft 365 connection has expired. Reconnect to view your inbox.
          </span>
          <button
            type="button"
            onClick={() => void handleReconnect()}
            disabled={reconnecting}
            style={{
              padding: "8px 14px",
              border: "none",
              borderRadius: 4,
              background: reconnecting ? "#a78bfa" : "#0066cc",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: reconnecting ? "default" : "pointer",
            }}
          >
            {reconnecting ? "Reconnecting…" : "Reconnect Microsoft 365"}
          </button>
        </div>
      )}
      <div style={{ borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
        {/* BF_PORTAL_BLOCK_77_INBOX_COMPOSE_v1 - Compose button + modal. */}
        <div style={{ padding: 12, borderBottom: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            style={{ width: "100%", padding: "8px 12px", border: "none", borderRadius: 4, background: "#0066cc", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            + Compose
          </button>
          <select
            value={active}
            onChange={(e) => setActive(e.target.value)}
            style={{ width: "100%", padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, background: "#fff", color: "#000" }}
          >
            {mailboxOptions.map(o => <option key={o.value || "self"} value={o.value}>{o.label}</option>)}
            {mailboxOptions.length === 0 && <option value="">No mailbox available</option>}
          </select>
          <button
            type="button"
            onClick={() => setReconnectAttempts((n) => n + 1)}
            disabled={loading}
            style={{ width: "100%", padding: "6px 10px", border: "1px solid #cbd6e2", borderRadius: 4, background: "#f8fafc", color: "#33475b", fontSize: 12, cursor: loading ? "default" : "pointer" }}
          >
            {loading ? "Refreshing…" : "↻ Refresh inbox"}
          </button>
          <div style={{ fontSize: 10, color: "#94a3b8", textAlign: "center" }}>Auto-refreshes every 20s</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && <div style={{ padding: 16, color: "#7c98b6" }}>Loading…</div>}
          {err && <div style={{ padding: 16, color: "#b00020" }}>{err}</div>}
          {!loading && !err && messages.length === 0 && (
            <div style={{ padding: 16, color: "#7c98b6" }}>Nothing in this inbox.</div>
          )}
          {/* BF_PORTAL_BLOCK_v833_INBOX_SEARCH_FOLDERS_THREAD — search + folder */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderBottom: "1px solid #f0f4f8" }}>
            <input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search mail…"
              style={{ flex: 1, fontSize: 13, padding: "4px 8px", borderRadius: 4, border: "1px solid #e2e8f0" }}
            />
            <select
              value={folder}
              onChange={(e) => setFolder(e.target.value === "sent" ? "sent" : e.target.value === "all" ? "all" : "inbox")}
              style={{ fontSize: 12, padding: "2px 6px", borderRadius: 4, border: "1px solid #e2e8f0" }}
            >
              <option value="inbox">Inbox</option>
              <option value="sent">Sent</option>
              <option value="all">All</option>
            </select>
          </div>
          {/* BF_PORTAL_BLOCK_v823_INBOX_READTOGGLE_SORT_BADGE — sort + unread badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", borderBottom: "1px solid #f0f4f8" }}>
            <span style={{ fontSize: 12, color: "#7c98b6" }}>
              {unreadCount > 0 ? `${unreadCount} unread` : "All read"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* BF_PORTAL_BLOCK_v832_INBOX_FLAG_AND_BULK — bulk select toolbar */}
              <button
                type="button"
                onClick={() => { setBulkMode((v) => !v); setSelectedIds(new Set()); }}
                style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, border: "1px solid #e2e8f0", background: bulkMode ? "#eaf2fb" : "#fff", cursor: "pointer" }}
              >
                {bulkMode ? "Cancel" : "Select"}
              </button>
              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value === "asc" ? "asc" : "desc")}
                style={{ fontSize: 12, padding: "2px 6px", borderRadius: 4, border: "1px solid #e2e8f0" }}
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>
          </div>
          {bulkMode && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderBottom: "1px solid #f0f4f8", background: "#f8fafc" }}>
              <span style={{ fontSize: 12, color: "#7c98b6" }}>{selectedIds.size} selected</span>
              <button type="button" disabled={bulkBusy || selectedIds.size === 0} onClick={() => void bulkMarkRead(true)} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, border: "1px solid #e2e8f0", background: "#fff", cursor: bulkBusy || selectedIds.size === 0 ? "default" : "pointer" }}>Mark read</button>
              <button type="button" disabled={bulkBusy || selectedIds.size === 0} onClick={() => void bulkMarkRead(false)} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, border: "1px solid #e2e8f0", background: "#fff", cursor: bulkBusy || selectedIds.size === 0 ? "default" : "pointer" }}>Mark unread</button>
              <button type="button" disabled={bulkBusy || selectedIds.size === 0} onClick={() => void bulkFlag()} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, border: "1px solid #e2e8f0", background: "#fff", cursor: bulkBusy || selectedIds.size === 0 ? "default" : "pointer" }}>Flag</button>
              <button type="button" disabled={bulkBusy || selectedIds.size === 0} onClick={() => void bulkDelete()} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, border: "1px solid #fecaca", background: "#fff", color: "#dc2626", cursor: bulkBusy || selectedIds.size === 0 ? "default" : "pointer" }}>Delete</button>
            </div>
          )}
          {messages.map(m => {
            const isFlagged = m.flag?.flagStatus === "flagged";
            const threadCount = m.conversationId ? (threadCounts.get(m.conversationId) ?? 1) : 1;
            return (
            <div key={m.id} style={{ position: "relative", borderBottom: "1px solid #f0f4f8", display: "flex", alignItems: "stretch" }}>
              {bulkMode && (
                <label style={{ display: "flex", alignItems: "center", padding: "0 8px", cursor: "pointer" }} onClick={(ev) => ev.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => togglePick(m.id)} />
                </label>
              )}
              <button
                type="button"
                onClick={() => setSelectedId(m.id)}
                style={{
                  display: "block", flex: 1, width: "100%", textAlign: "left",
                  padding: "12px 88px 12px 12px", border: "none",
                  background: selectedId === m.id ? "#eaf2fb" : "transparent",
                  cursor: "pointer", color: "#000",
                  fontWeight: m.isRead ? 400 : 600,
                }}
              >
                <div style={{ fontSize: 13, color: "#33475b" }}>
                  {m.from?.emailAddress?.name || m.from?.emailAddress?.address || "(unknown)"}
                </div>
                <div style={{ fontSize: 14, marginTop: 2 }}>
                  {m.subject || "(no subject)"}
                  {threadCount > 1 && (
                    <span style={{ marginLeft: 6, fontSize: 11, color: "#0066cc", background: "#eaf2fb", borderRadius: 8, padding: "0 6px" }}>
                      {threadCount}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#7c98b6", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.bodyPreview || ""}
                </div>
                {m.receivedDateTime && (
                  <div style={{ fontSize: 11, color: "#7c98b6", marginTop: 2 }}>
                    {new Date(m.receivedDateTime).toLocaleString()}
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={(ev) => { ev.stopPropagation(); void flagMessage(m.id, !isFlagged); }}
                title={isFlagged ? "Remove flag" : "Flag email"}
                style={{
                  position: "absolute", right: 72, top: "50%", transform: "translateY(-50%)",
                  border: "none", background: "transparent", color: isFlagged ? "#f59e0b" : "#94a3b8",
                  fontSize: 16, cursor: "pointer", padding: "4px 6px", borderRadius: 4,
                }}
              >
                {isFlagged ? "★" : "☆"}
              </button>
              <button
                type="button"
                onClick={(ev) => { ev.stopPropagation(); void markRead(m.id, m.isRead === false); }}
                title={m.isRead === false ? "Mark as read" : "Mark as unread"}
                style={{
                  position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)",
                  border: "none", background: "transparent", color: "#0066cc",
                  fontSize: 14, cursor: "pointer", padding: "4px 6px", borderRadius: 4,
                }}
              >
                {m.isRead === false ? "●" : "○"}
              </button>
              <button
                type="button"
                onClick={(ev) => { ev.stopPropagation(); void handleDelete(m.id); }}
                disabled={deletingId === m.id}
                title="Move to Deleted Items"
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  border: "none", background: "transparent", color: "#dc2626",
                  fontSize: 16, cursor: "pointer", padding: "4px 8px", borderRadius: 4,
                }}
              >
                {deletingId === m.id ? "…" : "🗑"}
              </button>
            </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: 16, overflowY: "auto" }}>
        {!selectedId && <div style={{ color: "#8e8e93" }}>Select an email.</div>}
        {selectedId && !selected && <div style={{ color: "#8e8e93" }}>Loading…</div>}
        {selected && (
          <article>
            <h2 style={{ marginTop: 0 }}>{selected.subject || "(no subject)"}</h2>
            <div style={{ color: "#516f90", fontSize: 13, marginBottom: 16 }}>
              {selected.from?.emailAddress?.name || selected.from?.emailAddress?.address || ""}
              {selected.receivedDateTime && (
                <span style={{ marginLeft: 8 }}>· {new Date(selected.receivedDateTime).toLocaleString()}</span>
              )}
            </div>
            {/* BF_PORTAL_BLOCK_v835_INBOX_REPLY_ALL_FORWARD */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {(() => {
                const subj = selected.subject ?? "";
                const fromAddr = selected.from?.emailAddress?.address ?? "";
                const orig = selected.body?.contentType === "html"
                  ? (selected.body?.content ?? "").replace(/<[^>]+>/g, " ")
                  : (selected.body?.content ?? "");
                const myAddr = (active || mailboxes.mine?.address || "").toLowerCase();
                const allRecipients = [
                  ...(selected.toRecipients ?? []),
                  ...(selected.ccRecipients ?? []),
                ].map((r) => r.emailAddress?.address ?? "").filter(Boolean);
                const reSubj = /^re:/i.test(subj) ? subj : `Re: ${subj}`;
                const fwdSubj = /^fwd?:/i.test(subj) ? subj : `Fwd: ${subj}`;
                const quoted = `

----- Original message -----
${orig}`;
                const btnStyle: React.CSSProperties = {
                  padding: "7px 16px", border: "1px solid #0066cc", borderRadius: 6,
                  background: "#fff", color: "#0066cc", fontWeight: 600, fontSize: 13, cursor: "pointer",
                };
                const openCompose = (to: string, subject: string) => {
                  setReplyCtx({ to, subject, body: quoted });
                  setComposeOpen(true);
                };
                const replyAllTo = Array.from(new Set([fromAddr, ...allRecipients]
                  .map((a) => a.trim()).filter((a) => a && a.toLowerCase() !== myAddr)));
                return (
                  <>
                    <button type="button" style={btnStyle} onClick={() => openCompose(fromAddr, reSubj)}>Reply</button>
                    <button type="button" style={btnStyle} onClick={() => openCompose(replyAllTo.join(", "), reSubj)}>Reply All</button>
                    <button type="button" style={btnStyle} onClick={() => openCompose("", fwdSubj)}>Forward</button>
                  </>
                );
              })()}
            </div>
            {selected.body?.contentType === "html"
              ? <div dangerouslySetInnerHTML={{ __html: selected.body.content }} />
              : <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{selected.body?.content ?? ""}</pre>}
          </article>
        )}
      </div>
      <O365ComposeModal
        open={composeOpen}
        initialTo={replyCtx.to}
        initialSubject={replyCtx.subject}
        initialBody={replyCtx.body}
        fromOptions={mailboxOptions}
        defaultFrom={active}
        appOptions={appOptions}
        onClose={() => {
          setComposeOpen(false);
          setReplyCtx({ to: "", subject: "", body: "" });
        }}
      />
    </div>
  );
}

// ── Issues tab ────────────────────────────────────────────────────────────────
function IssuesTab() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Issue | null>(null);
  const [resolving, setResolving] = useState(false);
  // v700: PATCH status=resolved so the issue clears from the open-count badge.
  const resolveIssue = async (issue: Issue) => {
    setResolving(true);
    try {
      await api.patch(`/api/portal/issues/${issue.id}/status`, { status: "resolved" });
      setIssues((prev) => prev.map((i) => (i.id === issue.id ? { ...i, status: "resolved" } : i)));
      setSelected((prev) => (prev && prev.id === issue.id ? { ...prev, status: "resolved" } : prev));
    } catch {
      /* swallow; badge self-heals on next poll */
    } finally {
      setResolving(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api<{ issues: Issue[] }>("/api/portal/issues")
        .then((r) => { if (!cancelled) setIssues(Array.isArray(r.issues) ? r.issues : []); })
        .catch((error) => { if (isBadRequest(error)) return; })
        .finally(() => { if (!cancelled) setLoading(false); });
    void load();
    // BF_PORTAL_BLOCK_v638_MESSAGES_USABILITY_v1 — auto-refresh so a reported
    // issue appears without a manual page refresh.
    const tick = setInterval(load, 10000);
    return () => { cancelled = true; clearInterval(tick); };
  }, []);

  const statusColor = (s: string) =>
    s === "resolved" ? "#22c55e" : s === "in_progress" ? "#f59e0b" : "#3b82f6";

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <div style={{ width: 300, borderRight: "1px solid #e2e8f0", overflowY: "auto", background: "#fff" }}>
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e2e8f0",
            fontWeight: 700,
            fontSize: 15,
            color: "#0f172a",
          }}
        >
          Reported Issues
        </div>
        {loading && <div style={{ padding: 16, color: "#8e8e93", fontSize: 13 }}>Loading…</div>}
        {!loading && issues.length === 0 && (
          <div style={{ padding: 20, color: "#8e8e93", fontSize: 13 }}>
            No issues yet. Client portal "Report an Issue" submissions appear here.
          </div>
        )}
        {issues.map((issue) => (
          <div
            key={issue.id}
            onClick={() => setSelected(issue)}
            style={{
              padding: "10px 16px",
              cursor: "pointer",
              borderBottom: "1px solid #f1f5f9",
              background: selected?.id === issue.id ? "#eff6ff" : "transparent",
              borderLeft: selected?.id === issue.id ? "3px solid #2563eb" : "3px solid transparent",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{issue.title || "Untitled"}</span>
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 20,
                  background: `${statusColor(issue.status)}22`,
                  color: statusColor(issue.status),
                  fontWeight: 600,
                }}
              >
                {issue.status}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#8e8e93" }}>{new Date(issue.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "#f8fafc" }}>
        {!selected ? (
          <div style={{ color: "#8e8e93", fontSize: 14, marginTop: 40, textAlign: "center" }}>
            Select an issue to view details
          </div>
        ) : (
          <>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{selected.title || "Untitled"}</h3>
            <div style={{ fontSize: 12, color: "#8e8e93", marginBottom: 16 }}>
              {new Date(selected.created_at).toLocaleString()}
            </div>
            {selected.status !== "resolved" && selected.status !== "closed" && (
              <button
                type="button"
                onClick={() => void resolveIssue(selected)}
                disabled={resolving}
                style={{ marginBottom: 16, padding: "8px 16px", border: "none", borderRadius: 8, background: "#22c55e", color: "#fff", fontWeight: 600, fontSize: 13, cursor: resolving ? "default" : "pointer", opacity: resolving ? 0.6 : 1 }}
              >
                {resolving ? "Resolving…" : "Mark resolved"}
              </button>
            )}
            {selected.description && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 10,
                  padding: "12px 16px",
                  fontSize: 14,
                  color: "#374151",
                  marginBottom: 16,
                  border: "1px solid #e2e8f0",
                }}
              >
                {selected.description}
              </div>
            )}
            {selected.screenshot_url && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>SCREENSHOT</div>
                <img
                  src={selected.screenshot_url}
                  alt="Issue screenshot"
                  style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CommunicationsPage() {
  const [tab, setTab] = useState<Tab>("sms");
  // BF_PORTAL_BLOCK_v641_TAB_COUNTS_v1 — per-sub-tab counters. Each source is
  // the same endpoint that tab renders from. Fully guarded so a mocked/undefined
  // api response can never throw during render or tests.
  const [tabCounts, setTabCounts] = useState<{ messages: number; sms: number; inbox: number; voicemail: number; issues: number; maya: number; team: number }>({
    messages: 0,
    sms: 0,
    inbox: 0,
    voicemail: 0,
    issues: 0,
    maya: 0,
    team: 0,
  });
  useEffect(() => {
    let cancelled = false;
    const sumUnread = (r: any): number =>
      Array.isArray(r?.conversations)
        ? r.conversations.reduce((a: number, c: any) => a + (parseInt(c?.unread_count, 10) || 0), 0)
        : 0;
    const loadCounts = () => {
      Promise.resolve()
        .then(() => api<any>("/api/communications/messages-list", { params: { mode: "all" } }))
        .then((r) => { if (!cancelled) setTabCounts((p) => ({ ...p, messages: sumUnread(r) })); })
        .catch(() => undefined);
      Promise.resolve()
        .then(() => api<any>("/api/communications/sms", { params: { mode: "all" } }))
        .then((r) => { if (!cancelled) setTabCounts((p) => ({ ...p, sms: sumUnread(r) })); })
        .catch(() => undefined);
      Promise.resolve()
        .then(() => api<any>("/api/crm/inbox"))
        .then((r) => {
          const arr = Array.isArray(r) ? r : Array.isArray(r?.messages) ? r.messages : [];
          // BF_PORTAL_BLOCK_v713 — inbox messages carry isRead (from Graph),
          // not unread/read/read_at/direction. The old last clause was always
          // true, so the badge counted EVERY email and never cleared. Count
          // only true-unread (isRead === false).
          const n = arr.filter((m: any) => m && m.isRead === false).length;
          if (!cancelled) setTabCounts((p) => ({ ...p, inbox: n }));
        })
        .catch(() => undefined);
      Promise.resolve()
        .then(() => api<any>("/api/portal/issues"))
        .then((r) => {
          const arr = Array.isArray(r?.issues) ? r.issues : Array.isArray(r) ? r : [];
          const n = arr.filter((i: any) => {
            const st = String(i?.status ?? "open").toLowerCase();
            return st !== "resolved" && st !== "closed";
          }).length;
          if (!cancelled) setTabCounts((p) => ({ ...p, issues: n }));
        })
        .catch(() => undefined);
      Promise.resolve() // BF_PORTAL_BLOCK_v753_TEAM_TAB_BADGE
        .then(() => api<any>("/api/team/channels"))
        .then((r) => {
          const arr = Array.isArray(r?.channels) ? r.channels : [];
          const n = arr.reduce((a: number, c: any) => a + (parseInt(c?.unread_count, 10) || 0), 0);
          if (!cancelled) setTabCounts((p) => ({ ...p, team: n }));
        })
        .catch(() => undefined);
    };
    loadCounts();
    const id = setInterval(loadCounts, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  const [forcedSmsContact, setForcedSmsContact] = useState<Contact | null>(null);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* Sub-nav */}
      <div
        style={{
          display: "flex",
          borderBottom: "2px solid #e2e8f0",
          background: "#fff",
          flexShrink: 0,
          padding: "0 4px",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "12px 20px",
              border: "none",
              background: "transparent",
              fontSize: 14,
              fontWeight: tab === t.id ? 700 : 500,
              cursor: "pointer",
              color: tab === t.id ? "#007aff" : "#6b7280",
              borderBottom: tab === t.id ? "2px solid #007aff" : "2px solid transparent",
              marginBottom: -2,
              transition: "all 0.1s",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {t.label}
            {tabCounts[t.id] > 0 && (
              <span
                style={{
                  background: t.id === "issues" ? "#f59e0b" : "#ff3b30",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 999,
                  padding: "0 6px",
                  minWidth: 18,
                  height: 18,
                  lineHeight: "18px",
                  textAlign: "center",
                }}
              >
                {tabCounts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {tab === "sms" && <SmsTab forcedContact={forcedSmsContact} onContactSelected={setForcedSmsContact} />}
        {tab === "messages" && <MessagesTab onStartConversation={(contact) => { setForcedSmsContact(contact); setTab("sms"); }} />}
        {tab === "inbox" && <InboxTab />}
        {tab === "voicemail" && <VoicemailTab />} {/* BF_PORTAL_BLOCK_v830_VOICEMAIL_TAB */}
        {tab === "issues" && <IssuesTab />}
        {tab === "maya" && <MayaTab />}
        {tab === "team" && <TeamTab onUnreadChange={(n) => setTabCounts((c) => ({ ...c, team: n }))} />}
      </div>
    </div>
  );
}


// ── Maya tab (read-only visitor AI transcripts) ──────────────────────────────
// BF_PORTAL_BLOCK_v763_MAYA_TAB — read-only view of Maya AI conversations
// (chat_sessions / chat_messages) so staff can review how Maya is handling
// visitors. Separate from Messages, which is for human conversations only.
type MayaSession = {
  id: string;
  source: string | null;
  channel: string | null;
  status: string | null;
  message_count: number;
  last_message_at: string | null;
  last_message: string | null;
};
type MayaMsg = { id: string; role: string; message: string; created_at: string };

function MayaTab() {
  const [sessions, setSessions] = useState<MayaSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<MayaMsg[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api<{ sessions?: MayaSession[] }>("/api/communications/maya-sessions")
      .then((r) => { if (alive) setSessions(r?.sessions ?? []); })
      .catch(() => { if (alive) setSessions([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!selected) { setMessages([]); return; }
    let alive = true;
    setLoadingMsgs(true);
    api<{ messages?: MayaMsg[] }>(`/api/communications/maya-sessions/${selected}/messages`)
      .then((r) => { if (alive) setMessages(r?.messages ?? []); })
      .catch(() => { if (alive) setMessages([]); })
      .finally(() => { if (alive) setLoadingMsgs(false); });
    return () => { alive = false; };
  }, [selected]);

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ width: 340, borderRight: "1px solid #e2e8f0", overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: 16, color: "#64748b" }}>Loading Maya conversations…</div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: 16, color: "#64748b" }}>No Maya conversations yet.</div>
        ) : sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", border: 0, borderBottom: "1px solid #f1f5f9", background: selected === s.id ? "#eff6ff" : "#fff", cursor: "pointer" }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>
              {s.source || "Maya chat"}{s.status ? ` · ${s.status}` : ""}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.last_message || `${s.message_count} messages`}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              {s.message_count} messages{s.last_message_at ? ` · ${new Date(s.last_message_at).toLocaleString()}` : ""}
            </div>
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {!selected ? (
          <div style={{ color: "#64748b" }}>Select a Maya conversation to review it.</div>
        ) : loadingMsgs ? (
          <div style={{ color: "#64748b" }}>Loading…</div>
        ) : messages.length === 0 ? (
          <div style={{ color: "#64748b" }}>No messages in this conversation.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id} style={{ alignSelf: isUser ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2, textAlign: isUser ? "right" : "left" }}>
                    {isUser ? "Visitor" : m.role === "ai" ? "Maya" : m.role}
                  </div>
                  <div style={{ background: isUser ? "#2563eb" : "#f1f5f9", color: isUser ? "#fff" : "#0f172a", padding: "8px 12px", borderRadius: 12, fontSize: 14, whiteSpace: "pre-wrap" }}>
                    {m.message}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Team tab (internal staff chat, WebSocket-backed) ─────────────────────────
// BF_PORTAL_BLOCK_v752_TEAM_TAB
type TeamMessage = { id: string; channel_id: string; sender_id: string | null; body: string; created_at: string };
type TeamChannel = {
  id: string;
  kind: string;
  name: string | null;
  dm_key: string | null;
  created_by: string | null;
  created_at: string;
  member_ids: string[];
  last_read_at: string | null;
  last_message: TeamMessage | null;
  unread_count: number;
};
type TeamUser = { id: string; name: string; email: string | null };

function teamCurrentUserId(): string | null {
  try {
    const t = getAuthToken();
    if (!t) return null;
    const payload = JSON.parse(atob(t.split(".")[1] ?? ""));
    return (payload?.sub ?? payload?.id ?? null) as string | null;
  } catch {
    return null;
  }
}

function TeamTab({ onUnreadChange }: { onUnreadChange?: (n: number) => void }) {
  const [channels, setChannels] = useState<TeamChannel[]>([]);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [showNew, setShowNew] = useState(false);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;
  const myId = teamCurrentUserId();

  const userName = useCallback((id: string | null): string => {
    if (!id) return "Staff";
    const u = users.find((x) => x.id === id);
    return u?.name ?? "Staff";
  }, [users]);

  // BF_PORTAL_BLOCK_v758 — pin onUnreadChange in a ref so loadChannels (and the
  // WebSocket effect that depends on it) are STABLE. Previously loadChannels
  // depended on an inline parent callback, so it was recreated every render,
  // tearing down/reconnecting the socket and re-fetching channels/messages/read
  // on a feedback loop that flooded /api/team/*.
  const onUnreadChangeRef = useRef(onUnreadChange);
  onUnreadChangeRef.current = onUnreadChange;

  const loadChannels = useCallback(async () => {
    try {
      const r = await api<{ channels?: TeamChannel[] }>("/api/team/channels");
      const list: TeamChannel[] = Array.isArray(r?.channels) ? r.channels : [];
      setChannels(list);
      onUnreadChangeRef.current?.(list.reduce((sum, c) => sum + (c.unread_count || 0), 0));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    void loadChannels();
    (async () => {
      try { const r = await api<{ users?: TeamUser[] }>("/api/team/users"); setUsers(Array.isArray(r?.users) ? r.users : []); } catch { /* ignore */ }
    })();
  }, [loadChannels]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    let cancelled = false;
    (async () => {
      try { const r = await api<{ messages?: TeamMessage[] }>(`/api/team/channels/${activeId}/messages`); if (!cancelled) setMessages(Array.isArray(r?.messages) ? r.messages : []); } catch { /* ignore */ }
      try { await api.post(`/api/team/channels/${activeId}/read`, {}); } catch { /* ignore */ }
      void loadChannels();
    })();
    return () => { cancelled = true; };
  }, [activeId, loadChannels]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    const authToken: string = token;
    const wsBase = API_BASE.replace(/^http/, "ws");
    let ws: WebSocket | null = null;
    let closed = false;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handle = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(typeof ev.data === "string" ? ev.data : "{}");
        if (data?.type === "message") {
          if (data.channel_id === activeIdRef.current && data.message) {
            setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
            void api.post(`/api/team/channels/${data.channel_id}/read`, {}).catch(() => undefined);
          }
          void loadChannels();
        } else if (data?.type === "channel") {
          void loadChannels();
        }
      } catch { /* ignore */ }
    };
    const scheduleReconnect = () => {
      if (closed || timer) return;
      retry += 1;
      const delay = Math.min(30000, 1000 * 2 ** Math.min(retry, 5)); // 2s..30s backoff
      timer = setTimeout(() => { timer = null; connect(); }, delay);
    };
    function connect() {
      if (closed) return;
      try { ws = new WebSocket(`${wsBase}/api/team/ws?token=${encodeURIComponent(authToken)}`); }
      catch { scheduleReconnect(); return; }
      ws.onopen = () => { retry = 0; };
      ws.onmessage = handle;
      ws.onerror = () => { try { ws?.close(); } catch { /* ignore */ } };
      ws.onclose = () => { scheduleReconnect(); };
    }
    connect();
    return () => { closed = true; if (timer) clearTimeout(timer); try { ws?.close(); } catch { /* ignore */ } };
  }, [loadChannels]);

  // BF_PORTAL_BLOCK_v804_TEAM_POLL — gentle fallback auto-refresh so messages and unread
  // counts stay current even when the WebSocket drops (Azure SWA / flaky networks). Fixed
  // 8s interval; loadChannels is stable (useCallback) so this effect never re-creates and
  // cannot re-enter the v758 flood loop. Message refetch dedupes by id-sequence to avoid
  // clobbering optimistic sends or causing flicker.
  useEffect(() => {
    const id = setInterval(() => {
      void loadChannels();
      const aid = activeIdRef.current;
      if (!aid) return;
      void api<{ messages?: TeamMessage[] }>(`/api/team/channels/${aid}/messages`)
        .then((r) => {
          if (activeIdRef.current !== aid) return; // channel changed mid-flight
          const next = Array.isArray(r?.messages) ? r.messages : [];
          setMessages((prev) =>
            next.length === prev.length && next.every((m, i) => m.id === prev[i]?.id) ? prev : next,
          );
        })
        .catch(() => undefined);
    }, 8000);
    return () => clearInterval(id);
  }, [loadChannels]);

  async function send() {
    const body = draft.trim();
    if (!body || !activeId) return;
    setDraft("");
    try {
      const r = await api.post<{ message?: TeamMessage }>(`/api/team/channels/${activeId}/messages`, { body });
      const message = r?.message;
      if (message) setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      void loadChannels();
    } catch { /* ignore */ }
  }

  function channelLabel(c: TeamChannel): string {
    if (c.name) return c.name;
    const others = c.member_ids.filter((id) => id !== myId).map((id) => userName(id));
    return others.length ? others.join(", ") : "Direct message";
  }

  const active = channels.find((c) => c.id === activeId) ?? null;

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div style={{ width: 280, borderRight: "1px solid #e2e8f0", overflowY: "auto", background: "#fff", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Team</span>
          <button onClick={() => setShowNew(true)} style={{ fontSize: 13, color: "#007aff", background: "transparent", border: "none", cursor: "pointer", fontWeight: 600 }}>+ New</button>
        </div>
        {channels.length === 0 && <div style={{ padding: 20, color: "#8e8e93", fontSize: 13 }}>No conversations yet. Tap &quot;+ New&quot; to start one.</div>}
        {channels.map((c) => (
          <div key={c.id} onClick={() => setActiveId(c.id)} style={{ padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: c.id === activeId ? "#eff6ff" : "transparent", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.kind === "channel" ? "# " : ""}{channelLabel(c)}
              </div>
              {c.last_message && <div style={{ fontSize: 12, color: "#8e8e93", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.last_message.body}</div>}
            </div>
            {c.unread_count > 0 && <span style={{ background: "#ff3b30", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "0 6px", minWidth: 18, height: 18, lineHeight: "18px", textAlign: "center" }}>{c.unread_count}</span>}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8fafc" }}>
        {!active && <div style={{ margin: "auto", color: "#8e8e93", fontSize: 14 }}>Select a conversation</div>}
        {active && (
          <>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#0f172a", background: "#fff" }}>
              {active.kind === "channel" ? "# " : ""}{channelLabel(active)}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {messages.map((m) => {
                const mine = m.sender_id === myId;
                return (
                  <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                    {!mine && <div style={{ fontSize: 11, color: "#8e8e93", marginBottom: 2 }}>{userName(m.sender_id)}</div>}
                    <div style={{ background: mine ? "#007aff" : "#fff", color: mine ? "#fff" : "#0f172a", border: mine ? "none" : "1px solid #e2e8f0", borderRadius: 12, padding: "8px 12px", fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ borderTop: "1px solid #e2e8f0", padding: 12, background: "#fff", display: "flex", gap: 8 }}>
              <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Message…" style={{ flex: 1, padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14 }} />
              <button onClick={() => void send()} disabled={!draft.trim()} style={{ padding: "10px 18px", background: "#007aff", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>Send</button>
            </div>
          </>
        )}
      </div>

      {showNew && <NewTeamChatModal users={users.filter((u) => u.id !== myId)} onClose={() => setShowNew(false)} onCreated={(id) => { setShowNew(false); void loadChannels(); setActiveId(id); }} />}
    </div>
  );
}

function NewTeamChatModal({ users, onClose, onCreated }: { users: TeamUser[]; onClose: () => void; onCreated: (channelId: string) => void }) {
  const [mode, setMode] = useState<"dm" | "group" | "channel">("dm");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else { if (mode === "dm") next.clear(); next.add(id); }
      return next;
    });
  }

  async function create() {
    setBusy(true);
    try {
      const body: { kind: "dm" | "group" | "channel"; member_ids: string[]; name?: string } = { kind: mode, member_ids: Array.from(picked) };
      if (mode !== "dm") body.name = name.trim();
      const r = await api.post<{ channel_id?: string }>("/api/team/channels", body);
      if (r?.channel_id) onCreated(r.channel_id);
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  const canCreate = mode === "dm" ? picked.size === 1 : (mode === "group" ? picked.size >= 1 : name.trim().length > 0);

  return (
    <div onClick={onClose} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 420, maxHeight: "80vh", background: "#fff", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>New conversation</div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["dm", "group", "channel"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setPicked(new Set()); }} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: mode === m ? "1px solid #007aff" : "1px solid #cbd5e1", background: mode === m ? "#eff6ff" : "#fff", color: mode === m ? "#007aff" : "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer", textTransform: "capitalize" }}>{m === "dm" ? "Direct" : m}</button>
          ))}
        </div>
        {mode !== "dm" && <input value={name} onChange={(e) => setName(e.target.value)} placeholder={mode === "channel" ? "Channel name" : "Group name (optional)"} style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14 }} />}
        <div style={{ fontSize: 12, color: "#8e8e93" }}>{mode === "dm" ? "Pick one person" : "Pick people"}</div>
        <div style={{ overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 280 }}>
          {users.map((u) => (
            <div key={u.id} onClick={() => toggle(u.id)} style={{ padding: "8px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", background: picked.has(u.id) ? "#eff6ff" : "#fff" }}>
              <span style={{ fontSize: 14, color: "#0f172a" }}>{u.name}</span>
              {picked.has(u.id) && <span style={{ color: "#007aff" }}>✓</span>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => void create()} disabled={!canCreate || busy} style={{ padding: "8px 16px", border: "none", background: canCreate ? "#007aff" : "#cbd5e1", color: "#fff", borderRadius: 8, fontWeight: 600, cursor: canCreate ? "pointer" : "default" }}>{busy ? "Creating…" : "Create"}</button>
        </div>
      </div>
    </div>
  );
}

// BF_PORTAL_BLOCK_v830_VOICEMAIL_TAB — central voicemail inbox.
function VoicemailTab() {
  const [items, setItems] = useState<Array<{ id: string; recording_url: string; created_at: string; contact_name: string | null; contact_phone: string | null; contact_id: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr(null);
    api<typeof items>("/api/crm/voicemails")
      .then((r) => { if (!cancelled) setItems(Array.isArray(r) ? r : []); })
      .catch(() => { if (!cancelled) setErr("Could not load voicemails."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ padding: 16, overflowY: "auto" }}>
      <h3 style={{ marginTop: 0 }}>Voicemails</h3>
      {loading && <div style={{ color: "#8e8e93" }}>Loading…</div>}
      {err && <div style={{ color: "#b00020" }}>{err}</div>}
      {!loading && !err && items.length === 0 && <div style={{ color: "#7c98b6" }}>No voicemails.</div>}
      {items.map((vm) => (
        <div key={vm.id} style={{ borderBottom: "1px solid #f0f4f8", padding: "12px 0" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#33475b" }}>
            {vm.contact_name || vm.contact_phone || "Unknown caller"}
          </div>
          <div style={{ fontSize: 12, color: "#7c98b6", marginBottom: 6 }}>
            {vm.created_at ? new Date(vm.created_at).toLocaleString() : ""}
          </div>
          {vm.recording_url ? (
            <VoicemailAudio id={vm.id} />
          ) : (
            <span style={{ fontSize: 12, color: "#94a3b8" }}>No recording</span>
          )}
        </div>
      ))}
    </div>
  );
}
