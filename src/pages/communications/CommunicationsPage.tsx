import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api";
import { contactDisplayName } from "@/utils/contactName";
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
  return <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{failed ? "Voicemail unavailable" : "Loading voicemail\u2026"}</span>;
}
import CommunicationsThread from "@/pages/communications/components/CommunicationsThread";
import { startOutboundPstn } from "@/dialer/actions";
// BF_PORTAL_BLOCK_v312_COMPOSER_PULLDOWNS_v1
import ComposerPulldowns from "@/components/communications/ComposerPulldowns";
import O365ComposeModal from "@/components/communications/O365ComposeModal";
import { sanitizeHtml } from "@/lib/sanitizeHtml"; // BF_PORTAL_HTML_SANITIZE_v1

// BF_PORTAL_PHONE_TAB_v1 - Voicemail + Recents merged into one "Phone" tab.
type Tab = "messages" | "sms" | "inbox" | "issues" | "maya" | "team" | "phone";

const TABS: { id: Tab; label: string }[] = [
  { id: "messages", label: "Messages" },
  { id: "sms", label: "SMS" },
  { id: "inbox", label: "Inbox" },
  { id: "phone", label: "Phone" }, // BF_PORTAL_PHONE_TAB_v1 (was Voicemail + Recents)
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
  media_url?: string | null; // BF_PORTAL_SMS_MEDIA_v1
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
  const colors = ["var(--ui-accent-blue)", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2"];
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
    media_url?: string | null; // BF_PORTAL_SMS_MEDIA_v1
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
          name: contactDisplayName(row.display_name, { phone: row.phone }),
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
    <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", flex: 1, minHeight: 0, height: "100%", overflow: "hidden", background: "var(--ui-surface-muted)" }}>
      {/* ── Left — conversation list ── */}
      <div
        style={{
          width: 320,
          borderRight: "1px solid var(--ui-border)",
          display: "flex",
          flexDirection: "column",
          background: "var(--ui-surface-strong)",
          height: "100%",
          minHeight: 0,
        }}
      >
        {/* Search + New */}
        <div style={{ padding: "12px 12px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 17, color: "var(--ui-text)", flex: 1 }}>Messages</span>
            <button
              onClick={() => { setMulti((m) => !m); setPicked(new Set()); setBcResult(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--ui-accent-fg)", padding: "0 8px", fontWeight: 600 }}
            >
              {multi ? "Cancel" : "Select"}
            </button>
            <button
              onClick={() => setShowNewThread(true)}
              title="New Message"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--ui-accent-fg)", padding: 0 }}
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
              background: "var(--ui-surface-muted)",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              color: "var(--ui-text)",
            }}
          />
        </div>

        {multi && (
          <div style={{ padding: "0 12px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <label style={{ fontSize: 13, color: "var(--ui-accent-fg)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every((c) => picked.has(String(c.id)))}
                  onChange={(e) => setPicked(e.target.checked ? new Set(filtered.map((c) => String(c.id))) : new Set())}
                />
                Select all ({filtered.length})
              </label>
              <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--ui-text-muted)" }}>{picked.size} selected</span>
            </div>
            {picked.size > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <textarea
                  value={bcBody}
                  onChange={(e) => setBcBody(e.target.value)}
                  placeholder={`Message ${picked.size} contact(s) individually…`}
                  rows={2}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--ui-border)", fontSize: 14, boxSizing: "border-box", resize: "vertical", color: "var(--ui-text)" }}
                />
                <button
                  disabled={!bcBody.trim() || bcSending}
                  onClick={() => void sendBroadcast()}
                  style={{ alignSelf: "flex-end", padding: "7px 16px", background: bcBody.trim() && !bcSending ? "var(--ui-accent-blue)" : "rgba(47, 168, 106, 0.35)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: bcBody.trim() && !bcSending ? "pointer" : "not-allowed" }}
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
          <div style={{ padding: "8px 12px", background: "var(--ui-surface)", borderBottom: "1px solid var(--ui-border)" }}>
            <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 4 }}>Enter phone number</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={newThreadPhone}
                onChange={(e) => setNewThreadPhone(e.target.value)}
                placeholder="+1 (555) 555-5555"
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--ui-border)",
                  fontSize: 13,
                  color: "var(--ui-text)",
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
                  background: "var(--ui-accent-blue)",
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
                  background: "var(--ui-surface-muted)",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: "pointer",
                  color: "var(--ui-text)",
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
            <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--ui-text-muted)", fontSize: 14 }}>
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
                  background: isSelected ? "rgba(47, 168, 106, 0.12)" : (hasUnread ? "rgba(47, 168, 106, 0.12)" : "transparent"),
                  // BF_PORTAL_BLOCK_v639_UNREAD_CLEAR_v1 — subtle left accent for
                  // unread instead of a heavy 4-sided box (which read as an error).
                  borderLeft: hasUnread ? "3px solid var(--ui-accent-blue)" : "3px solid transparent",
                  borderBottom: "1px solid var(--ui-surface-muted)",
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
                    <span style={{ fontWeight: hasUnread ? 700 : 600, fontSize: 15, color: "var(--ui-text)" }}>{c.name}</span>
                    {last && <span style={{ fontSize: 11, color: hasUnread ? "var(--ui-accent-blue)" : "var(--ui-text-muted)", flexShrink: 0, fontWeight: hasUnread ? 600 : 400 }}>{timeLabel(last.created_at)}</span>}
                  </div>
                  {last ? (
                    <div
                      style={{
                        fontSize: 13,
                        color: hasUnread ? "var(--ui-text)" : "var(--ui-text-muted)",
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
                    <div style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>{c.phone}</div>
                  )}
                </div>
                {hasUnread && (
                  <div style={{ position: "absolute", top: 6, right: 8, minWidth: 18, height: 18, borderRadius: 9, background: "var(--ui-accent-blue)", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }} aria-label={`${unread} unread`}>
                    {unread > 99 ? "99+" : unread}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right — thread ── */}
      <div style={{ display: "flex", flexDirection: "column", background: "var(--ui-surface-strong)", minWidth: 0, minHeight: 0, height: "100%", overflow: "hidden" }}>
        {!selected ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ui-text-muted)",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 40 }}>💬</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ui-text)" }}>No conversation selected</div>
            <div style={{ fontSize: 14 }}>Choose from the list or start a new message</div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid var(--ui-surface-muted)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "var(--ui-surface-muted)",
                color: "var(--ui-text)",
                flexShrink: 0,
              }}
            >
              <Avatar name={selected.name} size={36} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ui-text)" }}>{selected.name}</div>
                {selected.phone && <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{selected.phone}</div>}
              </div>
              {(() => {
                const callPhone = selected.phone ?? selected.phone_e164 ?? selected.mobile ?? null;
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (callPhone) {
                        void startOutboundPstn(callPhone, {
                          contactId: String(selected.id ?? ""),
                          contactName: selected.name,
                          source: "communications_thread",
                        });
                      }
                    }}
                    disabled={!callPhone}
                    title={callPhone ? `Call ${selected.name}` : "No phone number on file"}
                    style={{
                      marginLeft: "auto",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 8,
                      border: "none",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: callPhone ? "pointer" : "not-allowed",
                      background: callPhone ? "var(--ui-accent-blue)" : "var(--ui-border)",
                      color: "#fff",
                    }}
                  >
                    Call
                  </button>
                );
              })()}
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
                background: "var(--ui-surface-strong)",
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
                  // BF_PORTAL_SMS_MEDIA_v1 — inbound MMS image via the BF-Server proxy
                  // (Twilio media needs Basic auth; token rides the query for <img>).
                  mediaUrl: m.media_url
                    ? `${API_BASE}/api/communications/messages/${m.id}/media?token=${encodeURIComponent(getAuthToken() ?? "")}`
                    : null,
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
                paddingRight: 88, paddingBottom: "max(12px, env(safe-area-inset-bottom))",
                borderTop: "1px solid var(--ui-surface-muted)",
                display: "flex",
                alignItems: "flex-end",
                gap: 10,
                background: "var(--ui-surface-strong)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  flex: 1,
                  border: "1px solid var(--ui-border)",
                  borderRadius: 20,
                  padding: "6px 14px",
                  background: "var(--ui-surface)",
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
                  placeholder="Text message"
                  rows={1}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: 15,
                    resize: "none",
                    color: "var(--ui-text)",
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
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "none",
                  background: draft.trim() ? "var(--ui-accent-blue)" : "var(--ui-surface-muted)",
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
            name: contactDisplayName(c.display_name, { phone: c.phone, email: c.email }),
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
              name: contactDisplayName(c.name, { email: c.email, phone: c.phone }),
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
            name: contactDisplayName(c.display_name, { phone: c.phone, email: c.email }),
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
      <div style={{ borderRight: "1px solid var(--ui-border)", padding: 12, overflowY: "auto" }}>
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
              style={{ background: "none", border: "none", color: "var(--ui-accent-fg)", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0 }}
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
              style={{ background: "none", border: "none", color: "var(--ui-accent-fg)", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0 }}
            >
              Mark all read
            </button>
          )}
        </div>
        {multi && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ui-accent-fg)", cursor: "pointer", marginBottom: 6 }}>
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
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--ui-border)", fontSize: 13, boxSizing: "border-box", resize: "vertical", color: "var(--ui-text)" }}
                />
                <button
                  type="button"
                  disabled={!bcBody.trim() || bcSending}
                  onClick={() => void sendBroadcast()}
                  style={{ alignSelf: "flex-end", padding: "6px 14px", background: bcBody.trim() && !bcSending ? "var(--ui-accent-blue)" : "#7FD9AC", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: bcBody.trim() && !bcSending ? "pointer" : "not-allowed" }}
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
                borderLeft: c.unread > 0 ? "4px solid var(--ui-accent-blue)" : "4px solid transparent",
                border: 0,
                // BF_PORTAL_BLOCK_v638_MESSAGES_USABILITY_v1 — require a real contactId
                // on both sides so null-id rows (e.g. duplicates) do not all highlight.
                background: (!!selected?.contactId && selected?.contactId === c.contactId) ? "rgba(47, 168, 106, 0.12)" : "transparent",
                padding: "10px 8px",
                borderBottom: "1px solid var(--ui-surface-muted)",
                cursor: "pointer",
                color: "var(--ui-text)",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                fontWeight: c.unread > 0 ? 700 : 400,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: c.unread > 0 ? 700 : 600, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>{fmtAt(c.lastAt)}</div>
              </div>
              {c.lastBody && (
                <div style={{ fontSize: 12, color: c.unread > 0 ? "var(--ui-text)" : "var(--ui-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.lastBody}
                </div>
              )}
            </button>
          </div>
        ))}
        {rows.length === 0 && <div style={{ color: "var(--ui-text-muted)", padding: 12 }}>No contacts in this silo yet.</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, height: "100%", overflow: "hidden", background: "var(--ui-surface-strong)" }}>
        {!selected && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ui-text-muted)", flex: 1 }}>Choose a contact.</div>}
        {selected && (
          <>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--ui-surface-muted)", background: "var(--ui-surface-muted)" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ui-text)" }}>{selected.name}</div>
              {selected.phone && <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{selected.phone}</div>}
              {!applicationId && (
                <div style={{ fontSize: 11, color: "#b45309", marginTop: 4 }}>
                  No active application linked to this contact yet — messages can still be sent.
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", minHeight: 0 }}>
              {loadingThread ? (
                <div style={{ color: "var(--ui-text-muted)" }}>Loading…</div>
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
                <div style={{ fontSize: 12, color: "var(--ui-text-muted)", padding: "4px 0", fontStyle: "italic" }}>
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
                <div style={{ borderTop: "1px solid var(--ui-border)", padding: "10px 16px", paddingRight: 88, paddingBottom: "max(12px, env(safe-area-inset-bottom))", display: "flex", gap: 8, background: "var(--ui-surface-strong)" }}>
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
                    style={{ flex: 1, resize: "none", border: "1px solid var(--ui-border)", borderRadius: 8, padding: 10, fontSize: 14, color: "var(--ui-text)", background: "var(--ui-surface-strong)" }}
                  />
                  <button
                    onClick={() => void send()}
                    disabled={!draft.trim() || sending}
                    style={{
                      alignSelf: "flex-end",
                      background: draft.trim() && !sending ? "var(--ui-accent-blue)" : "var(--ui-text-muted)",
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
          <div style={{ width: "min(560px, 92vw)", background: "var(--ui-surface-strong)", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>New SMS</h3>
            <label style={{ display: "block", marginBottom: 8 }}>Phone<textarea value={to} onChange={(e) => setTo(e.target.value)} rows={2} style={{ background: "var(--ui-surface-strong)", color: "var(--ui-text)", border: "1px solid var(--ui-border)", padding: 10, borderRadius: 8, fontSize: 14, width: "100%", minHeight: 80 }} /></label>
            <label style={{ display: "block", marginBottom: 8 }}>Message<textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} style={{ background: "var(--ui-surface-strong)", color: "var(--ui-text)", border: "1px solid var(--ui-border)", padding: 10, borderRadius: 8, fontSize: 14, width: "100%", minHeight: 80 }} /></label>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={async () => {
                if (!to.trim() || !body.trim()) return;
                await api.post("/api/communications/sms", { to: to.trim(), body: body.trim() });
                const c: Contact = { id: `new-${to.replace(/\D/g,"")}`, name: to.trim(), phone: to.trim() };
                onStartConversation(c);
                setOpen(false);
                setTo("");
                setBody("");
              }} style={{ background: "var(--accent)", color: "#fff", border: 0, borderRadius: 8, padding: "8px 12px" }}>Send SMS</button>
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
  // BF_PORTAL_v901_UNIFIED_INBOX - forward carries original attachments.
  const [replyAttachments, setReplyAttachments] = useState<Array<{ name: string; contentType: string; contentBytes: string; size: number }>>([]);

  const [mailboxes, setMailboxes] = useState<{ mine: { address: string; display_name: string } | null; shared: { address: string; display_name: string }[] }>({ mine: null, shared: [] });
  const [active, setActive] = useState<string>("");
  const [messages, setMessages] = useState<Array<{ id: string; subject: string; bodyPreview?: string; from?: { emailAddress?: { address: string; name?: string } }; receivedDateTime?: string; isRead?: boolean; flag?: { flagStatus?: string }; conversationId?: string; _mailbox?: string; _mailboxLabel?: string }>>([]); // BF_PORTAL_BLOCK_v833_INBOX_SEARCH_FOLDERS_THREAD
  // BF_PORTAL_v901_UNIFIED_INBOX - All-Mailboxes merged view + per-mailbox op routing.
  const ALL_MAILBOXES = "__ALL__";
  const isAllMailboxes = active === ALL_MAILBOXES;
  const [mailboxUnread, setMailboxUnread] = useState<Record<string, number>>({});
  const mailboxForMessage = useCallback((messageId: string): string => {
    if (active !== ALL_MAILBOXES) return active;
    const m = messages.find((mm) => mm.id === messageId);
    return m?._mailbox ?? "";
  }, [active, messages]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; contentType: string; size: number }>>([]); // BF_PORTAL_INBOX_ATTACHMENTS_v1
  const [attBusy, setAttBusy] = useState(false); // BF_PORTAL_INBOX_ATTACHMENTS_v1
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
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]); // BF_PORTAL_INBOX_MOVE_v1
  const [browseFolderId, setBrowseFolderId] = useState<string>(""); // BF_PORTAL_INBOX_FOLDER_BROWSE_v1
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
        // BF_PORTAL_BLOCK_v_INBOX_DEFAULT_UNIFIED_v1 - default to the unified
        // "All Mailboxes" view so staff don't have to switch to it each time.
        setActive((r.mine || r.shared.length > 0) ? ALL_MAILBOXES : "");
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
        if (active === ALL_MAILBOXES) {
          const targets: Array<{ addr: string; label: string }> = [];
          if (mailboxes.mine) targets.push({ addr: "", label: `${mailboxes.mine.display_name} (mine)` });
          for (const mb of mailboxes.shared) targets.push({ addr: mb.address, label: mb.display_name });
          const results = await Promise.allSettled(targets.map((t) =>
            withO365Refresh(() => api<typeof messages>("/api/crm/inbox", { params: { ...(t.addr ? { mailbox: t.addr } : {}), sort: sortDir, folder, ...(query ? { q: query } : {}) } }))
              .then((rr) => (Array.isArray(rr) ? rr : []).map((mm) => ({ ...mm, _mailbox: t.addr, _mailboxLabel: t.label })))
          ));
          if (cancelled) return;
          const merged = results.flatMap((res) => (res.status === "fulfilled" ? res.value : []));
          const dir = sortDir === "asc" ? 1 : -1;
          merged.sort((a, b) => dir * ((new Date(a.receivedDateTime || 0).getTime()) - (new Date(b.receivedDateTime || 0).getTime())));
          setMessages(merged);
          setNeedsReconnect(false);
        } else {
          const params = { ...(active ? { mailbox: active } : {}), sort: sortDir, ...(browseFolderId ? { folderId: browseFolderId } : { folder }), ...(query ? { q: query } : {}) };
          const r = await withO365Refresh(() =>
            api<typeof messages>("/api/crm/inbox", { params })
          );
          if (cancelled) return;
          setMessages(Array.isArray(r) ? r : []);
          setNeedsReconnect(false);
        }
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
  }, [active, reconnectAttempts, sortDir, folder, query, browseFolderId, mailboxes]);

  // Load body when a message is selected
  useEffect(() => {
    if (!selectedId) { setSelected(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const mbBody = active === ALL_MAILBOXES ? (messages.find((mm) => mm.id === selectedId)?._mailbox ?? "") : active;
        const params = mbBody ? { mailbox: mbBody } : {};
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

  // BF_PORTAL_INBOX_ATTACHMENTS_v1 - load the message file attachments (non-inline).
  useEffect(() => {
    setAttachments([]);
    if (!selectedId) return;
    let cancelled = false;
    const mbAtt = active === ALL_MAILBOXES ? (messages.find((mm) => mm.id === selectedId)?._mailbox ?? "") : active;
    const params = mbAtt ? { mailbox: mbAtt } : {};
    withO365Refresh(() => api<{ data?: Array<{ id: string; name: string; contentType: string; size: number }> } | Array<{ id: string; name: string; contentType: string; size: number }>>(`/api/crm/inbox/${encodeURIComponent(selectedId)}/attachments`, { params }))
      .then((r) => {
        const list = Array.isArray(r) ? r : ((r as { data?: Array<{ id: string; name: string; contentType: string; size: number }> }).data ?? []);
        if (!cancelled) setAttachments(Array.isArray(list) ? list : []);
      })
      .catch(() => { if (!cancelled) setAttachments([]); });
    return () => { cancelled = true; };
  }, [selectedId, active]);

  // BF_PORTAL_INBOX_ATTACHMENTS_v1 - download helpers. The server returns the attachment as
  // base64 JSON; decode to a Blob and trigger a browser download.
  const downloadOne = useCallback(async (att: { id: string; name: string; contentType: string }): Promise<void> => {
    if (!selectedId) return;
    const mbDl = mailboxForMessage(selectedId);
    const params = mbDl ? { mailbox: mbDl } : {};
    const resp = await withO365Refresh(() => api<{ data?: { name?: string; contentType?: string; contentBytes?: string } } & { name?: string; contentType?: string; contentBytes?: string }>(`/api/crm/inbox/${encodeURIComponent(selectedId)}/attachments/${encodeURIComponent(att.id)}`, { params }));
    const d = (resp as { data?: { name?: string; contentType?: string; contentBytes?: string } }).data ?? (resp as { name?: string; contentType?: string; contentBytes?: string });
    if (!d?.contentBytes) return;
    const bin = atob(d.contentBytes);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: d.contentType ?? att.contentType ?? "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = d.name ?? att.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [mailboxForMessage, selectedId]);

  const downloadAllAttachments = useCallback(async (): Promise<void> => {
    if (attBusy || !attachments.length) return;
    setAttBusy(true);
    try {
      for (const att of attachments) {
        try { await downloadOne(att); } catch { /* skip individual failures */ }
        await new Promise((r) => setTimeout(r, 350));
      }
    } finally { setAttBusy(false); }
  }, [attBusy, attachments, downloadOne]);

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
      const mbR = mailboxForMessage(messageId);
      const params = mbR ? { mailbox: mbR } : {};
      await api(`/api/crm/inbox/${encodeURIComponent(messageId)}/read`, { method: "PATCH", params, body: { isRead } });
      setMessages((prev) => prev.map((mm) => (mm.id === messageId ? { ...mm, isRead } : mm)));
    } catch { /* non-fatal */ }
  }, [mailboxForMessage]);
  const handleDelete = useCallback(async (messageId: string): Promise<void> => {
    if (!messageId) return;
    if (!window.confirm("Move this email to Deleted Items?")) return;
    setDeletingId(messageId);
    try {
      const mbDel1 = mailboxForMessage(messageId);
      const params = mbDel1 ? { mailbox: mbDel1 } : {};
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
  }, [mailboxForMessage, selectedId]);

  // BF_PORTAL_INBOX_SAVE_TO_CRM_v1 - manually file the open email's attachments to the
  // sender's CRM contact (creating the contact if needed). Useful for older mail outside the
  // background poller's window, or to file on demand.
  const [crmSaveBusy, setCrmSaveBusy] = useState(false);
  const [crmSaveMsg, setCrmSaveMsg] = useState<string>("");
  const [crmOneBusy, setCrmOneBusy] = useState<string>(""); // BF_PORTAL_INBOX_FILE_ONE_TO_CRM_v1
  const [crmOneMsg, setCrmOneMsg] = useState<string>("");   // BF_PORTAL_INBOX_FILE_ONE_TO_CRM_v1
  const saveToCrm = useCallback(async (): Promise<void> => {
    if (!selectedId) return;
    setCrmSaveBusy(true);
    setCrmSaveMsg("");
    try {
      const mbSave = mailboxForMessage(selectedId);
      const params = mbSave ? { mailbox: mbSave } : {};
      const resp = await api<{ filed?: number; duplicates?: number; reason?: string; data?: { filed?: number; duplicates?: number; reason?: string } }>(
        `/api/crm/inbox/${encodeURIComponent(selectedId)}/file-to-crm`,
        { method: "POST", params },
      );
      const filed = (resp?.data?.filed ?? resp?.filed ?? 0) as number;
      // BF_PORTAL_SAVE_TO_CRM_TRUTH_v1 - a zero was always reported as "No attachments on
      // this email", which is a flat lie when the attachments are simply already filed, or
      // when the sender matched no contact. Say what actually happened.
      const dupes = (resp?.data?.duplicates ?? resp?.duplicates ?? 0) as number;
      const reason = (resp?.data?.reason ?? resp?.reason) as string | undefined;
      if (filed > 0) {
        setCrmSaveMsg(`Saved ${filed} file${filed === 1 ? "" : "s"} to CRM.`);
      } else if (reason === "all_duplicates" || dupes > 0) {
        setCrmSaveMsg(`Already in CRM - ${dupes || "all"} file${dupes === 1 ? "" : "s"} previously saved.`);
      } else if (reason === "no_contact") {
        setCrmSaveMsg("Could not match the sender to a CRM contact.");
      } else {
        setCrmSaveMsg("No attachments on this email.");
      }
    } catch (e: unknown) {
      setCrmSaveMsg(e instanceof Error ? e.message : "Save to CRM failed.");
    } finally {
      setCrmSaveBusy(false);
    }
  }, [selectedId, mailboxForMessage]);

  // BF_PORTAL_INBOX_FILE_ONE_TO_CRM_v1: add a single attachment to the sender's CRM contact.
  const fileOneToCrm = useCallback(async (att: { id: string; name: string }): Promise<void> => {
    if (!selectedId) return;
    setCrmOneBusy(att.id);
    setCrmOneMsg("");
    try {
      const mbOne = mailboxForMessage(selectedId);
      const params = mbOne ? { mailbox: mbOne } : {};
      const resp = await api<{ filed?: number; data?: { filed?: number } }>(
        `/api/crm/inbox/${encodeURIComponent(selectedId)}/attachments/${encodeURIComponent(att.id)}/file-to-crm`,
        { method: "POST", params },
      );
      const filed = (resp?.data?.filed ?? resp?.filed ?? 0) as number;
      setCrmOneMsg(filed > 0 ? `Added "${att.name}" to CRM.` : `"${att.name}" is already in CRM.`);
    } catch (e: unknown) {
      setCrmOneMsg(e instanceof Error ? e.message : "Add to contact failed.");
    } finally {
      setCrmOneBusy("");
    }
  }, [selectedId, mailboxForMessage]);

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
      const mbF = mailboxForMessage(messageId);
      const params = mbF ? { mailbox: mbF } : {};
      await api(`/api/crm/inbox/${encodeURIComponent(messageId)}/flag`, { method: "PATCH", params, body: { flagged } });
      setMessages((prev) => prev.map((mm) => (mm.id === messageId ? { ...mm, flag: { flagStatus: flagged ? "flagged" : "notFlagged" } } : mm)));
    } catch { /* non-fatal */ }
  }, [mailboxForMessage]);
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
      for (const id of ids) {
        const mbBd = mailboxForMessage(id);
        const params = mbBd ? { mailbox: mbBd } : {};
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
  }, [selectedIds, mailboxForMessage, selectedId]);

  // BF_PORTAL_INBOX_MOVE_v1 - load the mailbox Outlook folders for the "Move to" picker.
  useEffect(() => {
    let alive = true;
    const params = (active && active !== ALL_MAILBOXES) ? { mailbox: active } : {};
    api<{ data?: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }>>("/api/crm/inbox/folders/list", { params })
      .then((r) => {
        const list = Array.isArray(r) ? r : ((r as { data?: Array<{ id: string; name: string }> }).data ?? []);
        if (alive) setFolders(Array.isArray(list) ? list : []);
      })
      .catch(() => { if (alive) setFolders([]); });
    return () => { alive = false; };
  }, [active]);

  // BF_PORTAL_INBOX_MOVE_v1 - move selected messages to an Outlook folder, then drop them
  // from the current list (they have left this folder). Mirrors bulkDelete.
  const bulkMove = useCallback(async (destinationId: string): Promise<void> => {
    const ids = Array.from(selectedIds);
    if (!ids.length || !destinationId) return;
    setBulkBusy(true);
    try {
      for (const id of ids) {
        const mbBm = mailboxForMessage(id);
        const params = mbBm ? { mailbox: mbBm } : {};
        try {
          await api(`/api/crm/inbox/${encodeURIComponent(id)}/move`, { method: "POST", params, body: { destinationId } });
          setMessages((prev) => prev.filter((mm) => mm.id !== id));
        } catch { /* skip individual failures */ }
      }
      setSelectedId((sid) => (ids.includes(sid) ? "" : sid));
      setSelected((sel) => (selectedId && ids.includes(selectedId) ? null : sel));
      setSelectedIds(new Set());
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, mailboxForMessage, selectedId]);

  useEffect(() => {
    if (needsReconnect) return;
    const tick = setInterval(() => {
      (async () => {
        try {
          if (active === ALL_MAILBOXES) {
            const targets: Array<{ addr: string; label: string }> = [];
            if (mailboxes.mine) targets.push({ addr: "", label: `${mailboxes.mine.display_name} (mine)` });
            for (const mb of mailboxes.shared) targets.push({ addr: mb.address, label: mb.display_name });
            const results = await Promise.allSettled(targets.map((t) =>
              withO365Refresh(() => api<typeof messages>("/api/crm/inbox", { params: { ...(t.addr ? { mailbox: t.addr } : {}), sort: sortDir, folder, ...(query ? { q: query } : {}) } }))
                .then((rr) => (Array.isArray(rr) ? rr : []).map((mm) => ({ ...mm, _mailbox: t.addr, _mailboxLabel: t.label })))
            ));
            const merged = results.flatMap((res) => (res.status === "fulfilled" ? res.value : []));
            const dir = sortDir === "asc" ? 1 : -1;
            merged.sort((a, b) => dir * ((new Date(a.receivedDateTime || 0).getTime()) - (new Date(b.receivedDateTime || 0).getTime())));
            setMessages(merged);
          } else {
            const params = active ? { mailbox: active } : {};
            const r = await withO365Refresh(() => api<typeof messages>("/api/crm/inbox", { params }));
            if (Array.isArray(r)) setMessages(r);
          }
        } catch { /* background poll: swallow */ }
      })();
    }, 20000);
    return () => clearInterval(tick);
  }, [active, needsReconnect, mailboxes, sortDir, folder, query]);

  // BF_PORTAL_v901_UNIFIED_INBOX - per-mailbox unread counts for the selector.
  useEffect(() => {
    const targets: string[] = [];
    if (mailboxes.mine) targets.push("");
    for (const m of mailboxes.shared) targets.push(m.address);
    if (targets.length === 0) return;
    let cancelled = false;
    const run = async (): Promise<void> => {
      const entries = await Promise.allSettled(targets.map(async (addr) => {
        const params = { ...(addr ? { mailbox: addr } : {}), folder: "inbox" as const };
        const r = await withO365Refresh(() => api<Array<{ isRead?: boolean }>>("/api/crm/inbox", { params }));
        const n = (Array.isArray(r) ? r : []).filter((mm) => mm.isRead === false).length;
        return [addr, n] as const;
      }));
      if (cancelled) return;
      const next: Record<string, number> = {};
      for (const e of entries) if (e.status === "fulfilled") next[e.value[0]] = e.value[1];
      setMailboxUnread(next);
    };
    void run();
    const t = setInterval(() => void run(), 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, [mailboxes, reconnectAttempts]);

  const mbUnreadLabel = (addr: string, base: string): string => { const n = mailboxUnread[addr] ?? 0; return n > 0 ? `${base} (${n})` : base; };
  const mailboxOptions: Array<{ value: string; label: string }> = [];
  if (mailboxes.mine || mailboxes.shared.length > 0) {
    const totalUnread = Object.values(mailboxUnread).reduce((a, b) => a + (b || 0), 0);
    mailboxOptions.push({ value: ALL_MAILBOXES, label: totalUnread > 0 ? `All Mailboxes (${totalUnread})` : "All Mailboxes" });
  }
  if (mailboxes.mine) mailboxOptions.push({ value: "", label: mbUnreadLabel("", `${mailboxes.mine.display_name} (mine)`) });
  for (const m of mailboxes.shared) mailboxOptions.push({ value: m.address, label: mbUnreadLabel(m.address, m.display_name) });

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
    // BF_PORTAL_INBOX_SCROLL_v1 - the message list could not be scrolled. This grid
    // sits inside a flex row with `overflow: hidden`, but its ROWS defaulted to
    // `auto`, so the left column's track grew to fit its content instead of being
    // bounded by the viewport. The inner `flex: 1; overflowY: auto` therefore never
    // had a constrained height, produced no scrollbar, and the overflow was simply
    // clipped by the ancestor. Bounding the row track (minmax(0, 1fr)) plus
    // minHeight: 0 on the column restores the scroll.
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gridTemplateRows: "minmax(0, 1fr)", gap: 0, flex: 1, width: "100%", height: "100%", minHeight: 0, background: "var(--ui-surface-strong)", color: "var(--ui-text)", position: "relative" }}>
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
              background: reconnecting ? "#a78bfa" : "var(--ui-accent-blue)",
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
      <div style={{ borderRight: "1px solid var(--ui-border)", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        {/* BF_PORTAL_BLOCK_77_INBOX_COMPOSE_v1 - Compose button + modal. */}
        {/* BF_PORTAL_INBOX_TOOLBAR_ROW_v1 - Compose + mailbox + Refresh as one horizontal toolbar (was stacked full-width). */}
        <div style={{ padding: 12, borderBottom: "1px solid var(--ui-border)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            style={{ padding: "8px 12px", border: "none", borderRadius: 4, background: "var(--ui-accent-blue)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            + Compose
          </button>
          <select
            value={active}
            onChange={(e) => setActive(e.target.value)}
            style={{ flex: "1 1 140px", minWidth: 0, padding: 8, border: "1px solid var(--ui-border)", borderRadius: 4, background: "var(--ui-surface-strong)", color: "var(--ui-text)" }}
          >
            {mailboxOptions.map(o => <option key={o.value || "self"} value={o.value}>{o.label}</option>)}
            {mailboxOptions.length === 0 && <option value="">No mailbox available</option>}
          </select>
          <button
            type="button"
            onClick={() => setReconnectAttempts((n) => n + 1)}
            disabled={loading}
            style={{ padding: "6px 10px", border: "1px solid var(--ui-border)", borderRadius: 4, background: "var(--ui-surface-muted)", color: "var(--ui-text-muted)", fontSize: 12, cursor: loading ? "default" : "pointer" }}
          >
            {loading ? "Refreshing…" : "↻ Refresh inbox"}
          </button>
          <div style={{ flexBasis: "100%", fontSize: 10, color: "var(--ui-text-muted)", textAlign: "center" }}>Auto-refreshes every 20s</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && <div style={{ padding: 16, color: "var(--ui-text-muted)" }}>Loading…</div>}
          {err && <div style={{ padding: 16, color: "#b00020" }}>{err}</div>}
          {!loading && !err && messages.length === 0 && (
            <div style={{ padding: 16, color: "var(--ui-text-muted)" }}>Nothing in this inbox.</div>
          )}
          {/* BF_PORTAL_BLOCK_v833_INBOX_SEARCH_FOLDERS_THREAD — search + folder */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderBottom: "1px solid var(--ui-surface-muted)" }}>
            <input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search mail…"
              style={{ flex: 1, fontSize: 13, padding: "4px 8px", borderRadius: 4, border: "1px solid var(--ui-border)" }}
            />
            <select
              value={browseFolderId ? `id:${browseFolderId}` : folder}
              onChange={(e) => {
                const v = e.target.value;
                if (v.startsWith("id:")) { setBrowseFolderId(v.slice(3)); }
                else { setBrowseFolderId(""); setFolder(v === "sent" ? "sent" : v === "all" ? "all" : "inbox"); }
              }}
              style={{ fontSize: 12, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--ui-border)" }}
            >
              <option value="inbox">Inbox</option>
              <option value="sent">Sent</option>
              <option value="all">All</option>
              {folders.filter((fd) => !["inbox", "sent items"].includes(fd.name.trim().toLowerCase())).map((fd) => (
                <option key={fd.id} value={`id:${fd.id}`}>{fd.name}</option>
              ))}
            </select>
          </div>
          {/* BF_PORTAL_BLOCK_v823_INBOX_READTOGGLE_SORT_BADGE — sort + unread badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", borderBottom: "1px solid var(--ui-surface-muted)" }}>
            <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>
              {unreadCount > 0 ? `${unreadCount} unread` : "All read"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* BF_PORTAL_BLOCK_v832_INBOX_FLAG_AND_BULK — bulk select toolbar */}
              <button
                type="button"
                onClick={() => { setBulkMode((v) => !v); setSelectedIds(new Set()); }}
                style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, border: "1px solid var(--ui-border)", background: bulkMode ? "rgba(47, 168, 106, 0.12)" : "var(--ui-surface-strong)", cursor: "pointer" }}
              >
                {bulkMode ? "Cancel" : "Select"}
              </button>
              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value === "asc" ? "asc" : "desc")}
                style={{ fontSize: 12, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--ui-border)" }}
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>
          </div>
          {bulkMode && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderBottom: "1px solid var(--ui-surface-muted)", background: "var(--ui-surface-muted)" }}>
              <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{selectedIds.size} selected</span>
              <button type="button" disabled={bulkBusy || selectedIds.size === 0} onClick={() => void bulkMarkRead(true)} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", cursor: bulkBusy || selectedIds.size === 0 ? "default" : "pointer" }}>Mark read</button>
              <button type="button" disabled={bulkBusy || selectedIds.size === 0} onClick={() => void bulkMarkRead(false)} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", cursor: bulkBusy || selectedIds.size === 0 ? "default" : "pointer" }}>Mark unread</button>
              <button type="button" disabled={bulkBusy || selectedIds.size === 0} onClick={() => void bulkFlag()} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", cursor: bulkBusy || selectedIds.size === 0 ? "default" : "pointer" }}>Flag</button>
              <button type="button" disabled={bulkBusy || selectedIds.size === 0} onClick={() => void bulkDelete()} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, border: "1px solid #fecaca", background: "var(--ui-surface-strong)", color: "#dc2626", cursor: bulkBusy || selectedIds.size === 0 ? "default" : "pointer" }}>Delete</button>
              <select disabled={bulkBusy || selectedIds.size === 0} value="" title="Move to folder" onChange={(e) => { const d = e.target.value; e.currentTarget.selectedIndex = 0; if (d) void bulkMove(d); }} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", cursor: bulkBusy || selectedIds.size === 0 ? "default" : "pointer" }}>
                <option value="">Move to...</option>
                {folders.map((fd) => (<option key={fd.id} value={fd.id}>{fd.name}</option>))}
              </select>
            </div>
          )}
          {messages.map(m => {
            const isFlagged = m.flag?.flagStatus === "flagged";
            const threadCount = m.conversationId ? (threadCounts.get(m.conversationId) ?? 1) : 1;
            return (
            <div key={m.id} style={{ position: "relative", borderBottom: "1px solid var(--ui-surface-muted)", display: "flex", alignItems: "stretch" }}>
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
                  background: selectedId === m.id ? "rgba(47, 168, 106, 0.12)" : "transparent",
                  cursor: "pointer", color: "var(--ui-text)",
                  fontWeight: m.isRead ? 400 : 600,
                }}
              >
                <div style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>
                  {m.from?.emailAddress?.name || m.from?.emailAddress?.address || "(unknown)"}
                </div>
                <div style={{ fontSize: 14, marginTop: 2 }}>
                  {m.subject || "(no subject)"}
                  {threadCount > 1 && (
                    <span style={{ marginLeft: 6, fontSize: 11, color: "var(--ui-accent-fg)", background: "rgba(47, 168, 106, 0.12)", borderRadius: 8, padding: "0 6px" }}>
                      {threadCount}
                    </span>
                  )}
                  {isAllMailboxes && m._mailboxLabel && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: "var(--ui-text-muted)", background: "var(--ui-surface-muted)", borderRadius: 8, padding: "0 6px" }}>
                      {m._mailboxLabel}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.bodyPreview || ""}
                </div>
                {m.receivedDateTime && (
                  <div style={{ fontSize: 11, color: "var(--ui-text-muted)", marginTop: 2 }}>
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
                  border: "none", background: "transparent", color: isFlagged ? "#f59e0b" : "var(--ui-text-muted)",
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
                  border: "none", background: "transparent", color: "var(--ui-accent-fg)",
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

      <div style={{ padding: 16, overflowY: "auto", minHeight: 0 }}>
        {!selectedId && <div style={{ color: "var(--ui-text-muted)" }}>Select an email.</div>}
        {selectedId && !selected && <div style={{ color: "var(--ui-text-muted)" }}>Loading…</div>}
        {selected && (
          <article>
            <h2 style={{ marginTop: 0 }}>{selected.subject || "(no subject)"}</h2>
            <div style={{ color: "var(--ui-text-muted)", fontSize: 13, marginBottom: 16 }}>
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
                // BF_PORTAL_REPLY_QUOTE_HTML_v1 - the quote used to be built with
                // the old tag-stripping regex flattened the original into one wall of
                // text AND left every HTML entity undecoded, so replies showed literal
                // "&nbsp;", "&lt;info@boreal.financial&gt;" and "&quot;good luck&quot;".
                // The composer already accepts HTML (O365ComposeModal detects tags and runs
                // it through DOMPurify), so quote the original as real, sanitised HTML.
                const rawOrig = selected.body?.content ?? "";
                const orig = selected.body?.contentType === "html"
                  ? rawOrig
                  : rawOrig
                      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                      .replace(/\r?\n/g, "<br>");
                // BF_PORTAL_INBOX_REPLYALL_SELF_v1 - exclude every mailbox the user operates
                // (mine + shared + the message's mailbox) so Reply All never sends the
                // message back to the user's own inbox. In the All-Mailboxes view
                // `active` is the "__ALL__" sentinel, not a real address, which
                // previously left the user's own address in Reply All.
                const ownAddrs = new Set(
                  [
                    mailboxes.mine?.address ?? "",
                    mailboxForMessage(selectedId),
                    ...mailboxes.shared.map((mb) => mb.address),
                  ]
                    .map((a) => a.toLowerCase())
                    .filter(Boolean)
                );
                const allRecipients = [
                  ...(selected.toRecipients ?? []),
                  ...(selected.ccRecipients ?? []),
                ].map((r) => r.emailAddress?.address ?? "").filter(Boolean);
                const reSubj = /^re:/i.test(subj) ? subj : `Re: ${subj}`;
                const fwdSubj = /^fwd?:/i.test(subj) ? subj : `Fwd: ${subj}`;
                const whenStr = selected.receivedDateTime
                  ? new Date(selected.receivedDateTime).toLocaleString()
                  : "";
                const whoStr = selected.from?.emailAddress?.name || fromAddr;
                const attribution = [
                  whenStr ? `On ${whenStr}` : "",
                  whoStr ? `${whoStr}` : "",
                  fromAddr ? `&lt;${fromAddr}&gt;` : "",
                ].filter(Boolean).join(" ") + " wrote:";
                const quoted = `<p><br></p><p><br></p><div>${attribution}</div>` +
                  `<blockquote style="margin:0 0 0 0.8ex;border-left:2px solid #ccc;padding-left:1ex;color:#555;">${orig}</blockquote>`;
                const btnStyle: React.CSSProperties = {
                  padding: "7px 16px", border: "1px solid var(--ui-accent-blue)", borderRadius: 6,
                  background: "var(--ui-surface-strong)", color: "var(--ui-accent-fg)", fontWeight: 600, fontSize: 13, cursor: "pointer",
                };
                const openCompose = (to: string, subject: string) => {
                  setReplyAttachments([]);
                  setReplyCtx({ to, subject, body: quoted });
                  setComposeOpen(true);
                };
                const openForward = async (): Promise<void> => {
                  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                  const header =
                    `<div>---------- Forwarded message ----------</div>` +
                    `<div>From: ${esc(whoStr)}${fromAddr ? ` &lt;${esc(fromAddr)}&gt;` : ""}</div>` +
                    (whenStr ? `<div>Date: ${esc(whenStr)}</div>` : "") +
                    (subj ? `<div>Subject: ${esc(subj)}</div>` : "") +
                    (allRecipients.length ? `<div>To: ${esc(allRecipients.join(", "))}</div>` : "");
                  const fwdBody = `<p><br></p>${header}<p><br></p><div>${orig}</div>`;
                  const mb = mailboxForMessage(selectedId);
                  const params = mb ? { mailbox: mb } : {};
                  const atts: Array<{ name: string; contentType: string; contentBytes: string; size: number }> = [];
                  for (const a of attachments) {
                    try {
                      const resp = await withO365Refresh(() => api<{ data?: { name?: string; contentType?: string; contentBytes?: string } } & { name?: string; contentType?: string; contentBytes?: string }>(`/api/crm/inbox/${encodeURIComponent(selectedId)}/attachments/${encodeURIComponent(a.id)}`, { params }));
                      const d = (resp as { data?: { name?: string; contentType?: string; contentBytes?: string } }).data ?? (resp as { name?: string; contentType?: string; contentBytes?: string });
                      if (d?.contentBytes) atts.push({ name: d.name ?? a.name, contentType: d.contentType ?? a.contentType, contentBytes: d.contentBytes, size: a.size });
                    } catch { /* skip unreadable attachment */ }
                  }
                  setReplyAttachments(atts);
                  setReplyCtx({ to: "", subject: fwdSubj, body: fwdBody });
                  setComposeOpen(true);
                };
                const replyAllTo = Array.from(new Set([fromAddr, ...allRecipients]
                  .map((a) => a.trim()).filter((a) => a && !ownAddrs.has(a.toLowerCase()))));
                return (
                  <>
                    <button type="button" style={btnStyle} onClick={() => openCompose(fromAddr, reSubj)}>Reply</button>
                    <button type="button" style={btnStyle} onClick={() => openCompose(replyAllTo.join(", "), reSubj)}>Reply All</button>
                    <button type="button" style={btnStyle} onClick={() => void openForward()}>Forward</button>
                    <button type="button" style={btnStyle} disabled={crmSaveBusy} onClick={() => void saveToCrm()} title="Save this email's attachments to the sender's CRM contact">{crmSaveBusy ? "Saving..." : "Save to CRM"}</button>
                  </>
                );
              })()}
            </div>
            {/* BF_PORTAL_INBOX_SAVE_FEEDBACK_v1 - this was 12px muted grey, so a failure
                looked identical to doing nothing at all. Colour it and make it legible. */}
            {crmSaveMsg && (
              <div style={{
                fontSize: 13, fontWeight: 600, marginBottom: 12, padding: "6px 10px", borderRadius: 6,
                color: /^Saved/i.test(crmSaveMsg) ? "#14532d" : "#7f1d1d",
                background: /^Saved/i.test(crmSaveMsg) ? "#dcfce7" : "#fee2e2",
                border: `1px solid ${/^Saved/i.test(crmSaveMsg) ? "#86efac" : "#fca5a5"}`,
              }}>{crmSaveMsg}</div>
            )}
            {selected.body?.contentType === "html"
              ? <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(selected.body.content) }} /> /* BF_PORTAL_HTML_SANITIZE_v1 */
              : <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{selected.body?.content ?? ""}</pre>}
            {/* BF_PORTAL_INBOX_ATTACHMENTS_v1 */}
            {attachments.length > 0 && (
              <div style={{ marginTop: 20, borderTop: "1px solid var(--ui-border)", paddingTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <strong style={{ fontSize: 13 }}>Attachments ({attachments.length})</strong>
                  <button type="button" disabled={attBusy} onClick={() => void downloadAllAttachments()} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, border: "1px solid var(--ui-accent-blue)", background: "var(--ui-surface-strong)", color: "var(--ui-accent-fg)", cursor: attBusy ? "default" : "pointer" }}>{attBusy ? "Downloading..." : "Download all"}</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {attachments.map((att) => (
                    <div key={att.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <button type="button" onClick={() => void downloadOne(att)} title={`Download ${att.name}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-muted)", color: "var(--ui-text)", cursor: "pointer", maxWidth: 280 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>{att.name}</span>
                        <span style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>{att.size ? `${Math.max(1, Math.round(att.size / 1024))} KB` : ""}</span>
                      </button>
                      <button type="button" disabled={crmOneBusy === att.id} onClick={() => void fileOneToCrm(att)} title="Add this file to the sender's CRM contact" style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ui-accent-blue)", background: "var(--ui-surface-strong)", color: "var(--ui-accent-fg)", cursor: crmOneBusy === att.id ? "default" : "pointer", whiteSpace: "nowrap" }}>{crmOneBusy === att.id ? "Adding..." : "+ CRM"}</button>
                    </div>
                  ))}
                </div>
                {/* BF_PORTAL_INBOX_SAVE_FEEDBACK_v1 */}
                {crmOneMsg && (
                  <div style={{
                    fontSize: 13, fontWeight: 600, marginTop: 8, padding: "6px 10px", borderRadius: 6,
                    color: /^Saved/i.test(crmOneMsg) ? "#14532d" : "#7f1d1d",
                    background: /^Saved/i.test(crmOneMsg) ? "#dcfce7" : "#fee2e2",
                    border: `1px solid ${/^Saved/i.test(crmOneMsg) ? "#86efac" : "#fca5a5"}`,
                  }}>{crmOneMsg}</div>
                )}
              </div>
            )}
          </article>
        )}
      </div>
      <O365ComposeModal
        open={composeOpen}
        initialTo={replyCtx.to}
        initialSubject={replyCtx.subject}
        initialBody={replyCtx.body}
        initialAttachments={replyAttachments}
        fromOptions={mailboxOptions.filter((o) => o.value !== ALL_MAILBOXES)}
        defaultFrom={active === ALL_MAILBOXES ? "" : active}
        appOptions={appOptions}
        onClose={() => {
          setComposeOpen(false);
          setReplyCtx({ to: "", subject: "", body: "" });
          setReplyAttachments([]);
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
    s === "resolved" ? "#22c55e" : s === "in_progress" ? "#f59e0b" : "var(--ui-accent-blue)";

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <div style={{ width: 300, borderRight: "1px solid var(--ui-border)", overflowY: "auto", background: "var(--ui-surface-strong)" }}>
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--ui-border)",
            fontWeight: 700,
            fontSize: 15,
            color: "var(--ui-text)",
          }}
        >
          Reported Issues
        </div>
        {loading && <div style={{ padding: 16, color: "var(--ui-text-muted)", fontSize: 13 }}>Loading…</div>}
        {!loading && issues.length === 0 && (
          <div style={{ padding: 20, color: "var(--ui-text-muted)", fontSize: 13 }}>
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
              borderBottom: "1px solid var(--ui-surface-muted)",
              background: selected?.id === issue.id ? "rgba(47, 168, 106, 0.12)" : "transparent",
              borderLeft: selected?.id === issue.id ? "3px solid var(--ui-accent-blue)" : "3px solid transparent",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ui-text)" }}>{issue.title || "Untitled"}</span>
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
            <div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>{new Date(issue.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "var(--ui-surface-muted)" }}>
        {!selected ? (
          <div style={{ color: "var(--ui-text-muted)", fontSize: 14, marginTop: 40, textAlign: "center" }}>
            Select an issue to view details
          </div>
        ) : (
          <>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "var(--ui-text)" }}>{selected.title || "Untitled"}</h3>
            <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 16 }}>
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
                  background: "var(--ui-surface-strong)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  fontSize: 14,
                  color: "var(--ui-text)",
                  marginBottom: 16,
                  border: "1px solid var(--ui-border)",
                }}
              >
                {selected.description}
              </div>
            )}
            {selected.screenshot_url && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ui-text-muted)", marginBottom: 8 }}>SCREENSHOT</div>
                <img
                  src={selected.screenshot_url}
                  alt="Issue screenshot"
                  style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid var(--ui-border)" }}
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
  // BF_PORTAL_PHONE_TAB_v1 - the voicemail/recents counters were declared but never
  // populated by the loader below (always 0, badge never rendered), so folding them
  // into a single `phone` key loses nothing.
  const [tabCounts, setTabCounts] = useState<{ messages: number; sms: number; inbox: number; issues: number; maya: number; team: number; phone: number }>({
    messages: 0,
    sms: 0,
    inbox: 0,
    issues: 0,
    maya: 0,
    team: 0,
    phone: 0,
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
        background: "var(--ui-surface-strong)",
      }}
    >
      {/* Sub-nav */}
      <div
        style={{
          display: "flex",
          borderBottom: "2px solid var(--ui-border)",
          background: "var(--ui-surface-strong)",
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
              color: tab === t.id ? "var(--ui-accent-blue)" : "var(--ui-text-muted)",
              borderBottom: tab === t.id ? "2px solid var(--ui-accent-blue)" : "2px solid transparent",
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
        {tab === "phone" && <PhoneTab />} {/* BF_PORTAL_PHONE_TAB_v1 */}
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
      <div style={{ width: 340, borderRight: "1px solid var(--ui-border)", overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: 16, color: "var(--ui-text-muted)" }}>Loading Maya conversations…</div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: 16, color: "var(--ui-text-muted)" }}>No Maya conversations yet.</div>
        ) : sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", border: 0, borderBottom: "1px solid var(--ui-surface-muted)", background: selected === s.id ? "rgba(47, 168, 106, 0.12)" : "var(--ui-surface-strong)", cursor: "pointer" }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ui-text)" }}>
              {s.source || "Maya chat"}{s.status ? ` · ${s.status}` : ""}
            </div>
            <div style={{ fontSize: 12, color: "var(--ui-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.last_message || `${s.message_count} messages`}
            </div>
            <div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>
              {s.message_count} messages{s.last_message_at ? ` · ${new Date(s.last_message_at).toLocaleString()}` : ""}
            </div>
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {!selected ? (
          <div style={{ color: "var(--ui-text-muted)" }}>Select a Maya conversation to review it.</div>
        ) : loadingMsgs ? (
          <div style={{ color: "var(--ui-text-muted)" }}>Loading…</div>
        ) : messages.length === 0 ? (
          <div style={{ color: "var(--ui-text-muted)" }}>No messages in this conversation.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id} style={{ alignSelf: isUser ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                  <div style={{ fontSize: 11, color: "var(--ui-text-muted)", marginBottom: 2, textAlign: isUser ? "right" : "left" }}>
                    {isUser ? "Visitor" : m.role === "ai" ? "Maya" : m.role}
                  </div>
                  <div style={{ background: isUser ? "var(--ui-accent-blue)" : "var(--ui-border-soft)", color: isUser ? "#fff" : "var(--ui-text)", padding: "8px 12px", borderRadius: 12, fontSize: 14, whiteSpace: "pre-wrap" }}>
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
type TeamAttachment = { name: string; contentType: string; dataUrl: string }; // BF_PORTAL_TEAM_ATTACH_v1
type TeamReaction = { emoji: string; user_ids: string[] }; // BF_PORTAL_TEAM_LIFECYCLE_v1
type TeamReplyPreview = { id: string; sender_id: string | null; body: string };
type TeamMessage = { id: string; channel_id: string; sender_id: string | null; body: string; created_at: string; attachments?: TeamAttachment[] | null; edited_at?: string | null; deleted_at?: string | null; reply_to_id?: string | null; reactions?: TeamReaction[]; reply_to?: TeamReplyPreview | null; mentions?: string[] | null; pinned_at?: string | null };
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
  has_mention?: boolean; // BF_PORTAL_TEAM_MENTIONS_v1
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

// BF_PORTAL_TEAM_MENTIONS_v1 — underline @Name tokens that match a member's name.
function highlightMentions(text: string, names: string[]): React.ReactNode {
  const valid = names.filter(Boolean).sort((a, b) => b.length - a.length);
  if (valid.length === 0) return text;
  const out: React.ReactNode[] = [];
  let i = 0, k = 0, buf = "";
  while (i < text.length) {
    if (text[i] === "@") {
      const rest = text.slice(i + 1);
      const hit = valid.find((n) => rest.startsWith(n));
      if (hit) {
        if (buf) { out.push(<span key={k++}>{buf}</span>); buf = ""; }
        out.push(<span key={k++} style={{ fontWeight: 700, textDecoration: "underline" }}>{"@" + hit}</span>);
        i += 1 + hit.length;
        continue;
      }
    }
    buf += text[i];
    i += 1;
  }
  if (buf) out.push(<span key={k++}>{buf}</span>);
  return out.length ? out : text;
}

function TeamTab({ onUnreadChange }: { onUnreadChange?: (n: number) => void }) {
  const [channels, setChannels] = useState<TeamChannel[]>([]);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [atts, setAtts] = useState<TeamAttachment[]>([]); // BF_PORTAL_TEAM_ATTACH_v1
  const [replyTo, setReplyTo] = useState<TeamMessage | null>(null); // BF_PORTAL_TEAM_LIFECYCLE_v1
  const [editing, setEditing] = useState<TeamMessage | null>(null);
  const [typingIds, setTypingIds] = useState<string[]>([]); // BF_PORTAL_TEAM_PRESENCE_v1
  const [reads, setReads] = useState<Record<string, string | null>>({});
  const [presence, setPresence] = useState<Record<string, string>>({});
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastTypingSent = useRef(0);
  const [mentionIds, setMentionIds] = useState<string[]>([]); // BF_PORTAL_TEAM_MENTIONS_v1
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [pins, setPins] = useState<TeamMessage[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<TeamMessage[] | null>(null);
  const [recording, setRecording] = useState(false); // BF_PORTAL_TEAM_VOICE_v1
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const [showNew, setShowNew] = useState(false);
  const activeIdRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null); // BF_PORTAL_TEAM_ATTACH_v1
  const bottomRef = useRef<HTMLDivElement | null>(null); // BF_PORTAL_TEAM_SCROLL_v1
  activeIdRef.current = activeId;
  const myId = teamCurrentUserId();

  // BF_PORTAL_TEAM_PRESENCE_v1 — typing ping + read/presence fetches.
  const fetchPins = useCallback((cid: string) => {
    void api<{ pins?: TeamMessage[] }>(`/api/team/channels/${cid}/pins`)
      .then((r) => { if (activeIdRef.current === cid) setPins(Array.isArray(r?.pins) ? r.pins : []); })
      .catch(() => undefined);
  }, []);
  const runSearch = useCallback((cid: string, q: string) => {
    if (!q.trim()) { setSearchResults(null); return; }
    void api<{ messages?: TeamMessage[] }>(`/api/team/channels/${cid}/search`, { params: { q } })
      .then((r) => { if (activeIdRef.current === cid) setSearchResults(Array.isArray(r?.messages) ? r.messages : []); })
      .catch(() => setSearchResults([]));
  }, []);
  async function togglePin(m: TeamMessage) {
    if (!activeId) return;
    try {
      const r = await api.post<{ message?: TeamMessage }>(`/api/team/channels/${activeId}/messages/${m.id}/pin`, { pinned: !m.pinned_at });
      const message = r?.message;
      if (message) { setMessages((prev) => prev.map((x) => (x.id === message.id ? message : x))); fetchPins(activeId); }
    } catch { /* ignore */ }
  }
  function onDraftChange(value: string) {
    setDraft(value);
    notifyTyping();
    const mm = /@([\w.'-]*)$/.exec(value);
    setMentionQuery(mm ? (mm[1] ?? "") : null);
  }
  function pickMention(u: TeamUser) {
    setDraft((prev) => prev.replace(/@([\w.'-]*)$/, `@${u.name} `));
    setMentionIds((prev) => (prev.includes(u.id) ? prev : [...prev, u.id]));
    setMentionQuery(null);
  }
  useEffect(() => {
    if (!activeId) return;
    const t = setTimeout(() => runSearch(activeId, searchQ), 250);
    return () => clearTimeout(t);
  }, [searchQ, activeId, runSearch]);

  function notifyTyping() {
    if (!activeId) return;
    const now = Date.now();
    if (now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    void api.post(`/api/team/channels/${activeId}/typing`, {}).catch(() => undefined);
  }
  const fetchReads = useCallback((cid: string) => {
    void api<{ reads?: Array<{ user_id: string; last_read_at: string | null }> }>(`/api/team/channels/${cid}/reads`)
      .then((r) => {
        if (activeIdRef.current !== cid) return;
        const map: Record<string, string | null> = {};
        for (const row of r?.reads ?? []) map[row.user_id] = row.last_read_at;
        setReads(map);
      })
      .catch(() => undefined);
  }, []);
  const fetchPresence = useCallback(() => {
    void api<{ presence?: Array<{ user_id: string; status: string }> }>(`/api/team/presence`)
      .then((r) => {
        const map: Record<string, string> = {};
        for (const row of r?.presence ?? []) map[row.user_id] = row.status;
        setPresence(map);
      })
      .catch(() => undefined);
  }, []);

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
      if (!cancelled) { fetchReads(activeId); fetchPresence(); fetchPins(activeId); setSearchQ(""); setSearchResults(null); setSearchOpen(false); }
      void loadChannels();
    })();
    return () => { cancelled = true; };
  }, [activeId, loadChannels, fetchReads, fetchPresence, fetchPins]);

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
        } else if (data?.type === "message_update") {
          if (data.channel_id === activeIdRef.current && data.message) {
            setMessages((prev) => prev.map((m) => (m.id === data.message.id ? data.message : m)));
            fetchPins(data.channel_id);
          }
        } else if (data?.type === "reaction") {
          if (data.channel_id === activeIdRef.current && data.message_id) {
            setMessages((prev) => prev.map((m) => (m.id === data.message_id ? { ...m, reactions: data.reactions ?? [] } : m)));
          }
        } else if (data?.type === "typing") {
          if (data.channel_id === activeIdRef.current && data.user_id && data.user_id !== myId) {
            const uid = String(data.user_id);
            setTypingIds((prev) => (prev.includes(uid) ? prev : [...prev, uid]));
            if (typingTimers.current[uid]) clearTimeout(typingTimers.current[uid]);
            typingTimers.current[uid] = setTimeout(() => {
              setTypingIds((prev) => prev.filter((x) => x !== uid));
              delete typingTimers.current[uid];
            }, 4000);
          }
        } else if (data?.type === "read") {
          if (data.channel_id === activeIdRef.current && data.user_id) {
            setReads((prev) => ({ ...prev, [String(data.user_id)]: data.last_read_at ?? new Date().toISOString() }));
          }
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
  }, [loadChannels, myId]);

  // BF_PORTAL_BLOCK_v804_TEAM_POLL — gentle fallback auto-refresh so messages and unread
  // counts stay current even when the WebSocket drops (Azure SWA / flaky networks). Fixed
  // 8s interval; loadChannels is stable (useCallback) so this effect never re-creates and
  // cannot re-enter the v758 flood loop. Message refetch dedupes by id-sequence to avoid
  // clobbering optimistic sends or causing flicker.
  useEffect(() => {
    const id = setInterval(() => {
      void loadChannels();
      fetchPresence();
      const aid = activeIdRef.current;
      if (!aid) return;
      fetchReads(aid);
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
  }, [loadChannels, fetchPresence, fetchReads]);

  // BF_PORTAL_TEAM_SCROLL_v1 — keep the newest message in view on send/receive/switch.
  useEffect(() => {
    const raf = requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: "end" }));
    return () => cancelAnimationFrame(raf);
  }, [messages, activeId]);

  async function send() {
    const body = draft.trim();
    if (!activeId) return;
    // BF_PORTAL_TEAM_LIFECYCLE_v1 — in edit mode, save the open message instead of sending.
    if (editing) {
      if (!body) return;
      const target = editing;
      setDraft("");
      setEditing(null);
      try {
        const r = await api.patch<{ message?: TeamMessage }>(`/api/team/channels/${activeId}/messages/${target.id}`, { body });
        const message = r?.message;
        if (message) setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
      } catch { /* ignore */ }
      return;
    }
    if (!body && atts.length === 0) return;
    const outAtts = atts;
    const replyId = replyTo?.id ?? null;
    const outMentions = mentionIds.filter((id) => body.includes(`@${userName(id)}`));
    setDraft("");
    setAtts([]);
    setReplyTo(null);
    setMentionIds([]);
    setMentionQuery(null);
    try {
      const r = await api.post<{ message?: TeamMessage }>(`/api/team/channels/${activeId}/messages`, { body, attachments: outAtts, reply_to_id: replyId, mentions: outMentions });
      const message = r?.message;
      if (message) setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      void loadChannels();
    } catch { /* ignore */ }
  }

  // BF_PORTAL_TEAM_LIFECYCLE_v1 — reactions, edit, delete.
  const QUICK_REACTS = ["\u{1F44D}", "\u2764\uFE0F", "\u2705"];
  async function toggleReaction(m: TeamMessage, emoji: string) {
    if (!activeId) return;
    const reacted = (m.reactions ?? []).some((r) => r.emoji === emoji && r.user_ids.includes(myId ?? ""));
    try {
      const r = reacted
        ? await api.delete<{ reactions?: TeamReaction[] }>(`/api/team/channels/${activeId}/messages/${m.id}/reactions?emoji=${encodeURIComponent(emoji)}`)
        : await api.post<{ reactions?: TeamReaction[] }>(`/api/team/channels/${activeId}/messages/${m.id}/reactions`, { emoji });
      const reactions = r?.reactions ?? [];
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, reactions } : x)));
    } catch { /* ignore */ }
  }
  function startEdit(m: TeamMessage) {
    setEditing(m);
    setReplyTo(null);
    setDraft(m.body);
  }
  async function del(m: TeamMessage) {
    if (!activeId || !window.confirm("Delete this message?")) return;
    try {
      const r = await api.delete<{ message?: TeamMessage }>(`/api/team/channels/${activeId}/messages/${m.id}`);
      const message = r?.message;
      if (message) setMessages((prev) => prev.map((x) => (x.id === message.id ? message : x)));
    } catch { /* ignore */ }
  }

  // BF_PORTAL_TEAM_ATTACH_v1 — read picked files into base64 data URLs (5MB cap each).
  // BF_PORTAL_TEAM_VOICE_v1 — record a voice note, stage it as an audio attachment.
  async function toggleRecord() {
    if (recording) {
      try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
      return;
    }
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { return; }
    const mime = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : (MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "");
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    recChunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) recChunksRef.current.push(e.data); };
    rec.onstop = () => {
      try { stream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
      const type = rec.mimeType || mime || "audio/webm";
      const blob = new Blob(recChunksRef.current, { type });
      recChunksRef.current = [];
      setRecording(false);
      if (blob.size === 0) return;
      if (blob.size > 5 * 1024 * 1024) { window.alert("Voice note too long (max ~5MB)."); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        if (!dataUrl) return;
        const ext = type.includes("mp4") ? "m4a" : "webm";
        setAtts((prev) => [...prev, { name: `Voice note.${ext}`, contentType: type, dataUrl }]);
      };
      reader.readAsDataURL(blob);
    };
    mediaRecorderRef.current = rec;
    setRecording(true);
    rec.start();
  }

  async function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const picked: TeamAttachment[] = [];
    for (const f of Array.from(files).slice(0, 10)) {
      if (f.size > 5_000_000) continue;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(f);
      }).catch(() => "");
      if (dataUrl) picked.push({ name: f.name, contentType: f.type || "application/octet-stream", dataUrl });
    }
    if (picked.length) setAtts((prev) => [...prev, ...picked].slice(0, 10));
  }

  function channelLabel(c: TeamChannel): string {
    if (c.name) return c.name;
    const others = c.member_ids.filter((id) => id !== myId).map((id) => userName(id));
    return others.length ? others.join(", ") : "Direct message";
  }

  const active = channels.find((c) => c.id === activeId) ?? null;
  const memberNames = active ? active.member_ids.map((id) => userName(id)).filter(Boolean) : [];
  const view = searchQ.trim() && searchResults ? searchResults : messages;

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div style={{ width: 280, borderRight: "1px solid var(--ui-border)", overflowY: "auto", background: "var(--ui-surface-strong)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ui-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--ui-text)" }}>Team</span>
          <button onClick={() => setShowNew(true)} style={{ fontSize: 13, color: "var(--ui-accent-fg)", background: "transparent", border: "none", cursor: "pointer", fontWeight: 600 }}>+ New</button>
        </div>
        {channels.length === 0 && <div style={{ padding: 20, color: "var(--ui-text-muted)", fontSize: 13 }}>No conversations yet. Tap &quot;+ New&quot; to start one.</div>}
        {channels.map((c) => (
          <div key={c.id} onClick={() => setActiveId(c.id)} style={{ padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid var(--ui-surface-muted)", background: c.id === activeId ? "rgba(47, 168, 106, 0.12)" : "transparent", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ui-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 6 }}>
                {c.kind === "dm" && (() => {
                  const other = c.member_ids.find((id) => id !== myId);
                  const st = other ? (presence[other] ?? "offline") : "offline";
                  const color = st === "available" ? "#34c759" : st === "busy" ? "#ff9500" : "var(--ui-border)";
                  return <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flex: "0 0 auto" }} aria-label={st} />;
                })()}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{c.kind === "channel" ? "# " : ""}{channelLabel(c)}</span>
              </div>
              {c.last_message && <div style={{ fontSize: 12, color: "var(--ui-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.last_message.body}</div>}
            </div>
            {c.has_mention && <span style={{ background: "var(--ui-accent-blue)", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "0 5px", minWidth: 18, height: 18, lineHeight: "18px", textAlign: "center" }} aria-label="mention">@</span>}
            {c.unread_count > 0 && <span style={{ background: "#ff3b30", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "0 6px", minWidth: 18, height: 18, lineHeight: "18px", textAlign: "center" }}>{c.unread_count}</span>}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--ui-surface-muted)" }}>
        {!active && <div style={{ margin: "auto", color: "var(--ui-text-muted)", fontSize: 14 }}>Select a conversation</div>}
        {active && (
          <>
            <div style={{ borderBottom: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)" }}>
              <div style={{ padding: "12px 16px", fontWeight: 700, color: "var(--ui-text)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active.kind === "channel" ? "# " : ""}{channelLabel(active)}</span>
                <button onClick={() => { setSearchOpen((v) => !v); setSearchQ(""); setSearchResults(null); }} title="Search" style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ui-text-muted)", fontSize: 16 }}>{"\u{1F50D}"}</button>
              </div>
              {searchOpen && (
                <div style={{ padding: "0 16px 10px" }}>
                  <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search this conversation…" style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--ui-border)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
                </div>
              )}
              {pins.length > 0 && !searchQ.trim() && (
                <div style={{ padding: "0 16px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                  {pins.map((p) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ui-text-muted)" }}>
                      <span>{"\u{1F4CC}"}</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName(p.sender_id)}: {p.body || "[media]"}</span>
                      <button onClick={() => void togglePin(p)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ui-text-muted)", fontSize: 13 }} aria-label="Unpin">{"\u00D7"}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {view.map((m) => {
                const mine = m.sender_id === myId;
                return (
                  <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                    {!mine && <div style={{ fontSize: 11, color: "var(--ui-text-muted)", marginBottom: 2 }}>{userName(m.sender_id)}</div>}
                    {m.reply_to && (
                      <div style={{ fontSize: 12, color: "var(--ui-text-muted)", borderLeft: "2px solid var(--ui-border)", paddingLeft: 8, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 260 }}>
                        {userName(m.reply_to.sender_id)}: {m.reply_to.body || "\u2026"}
                      </div>
                    )}
                    {m.deleted_at ? (
                      <div style={{ background: "var(--ui-surface-strong)", color: "var(--ui-text-muted)", border: "1px solid var(--ui-border)", borderRadius: 12, padding: "8px 12px", fontSize: 13, fontStyle: "italic" }}>Message deleted</div>
                    ) : (
                      <div style={{ background: mine ? "var(--ui-accent-blue)" : "var(--ui-surface-strong)", color: mine ? "#fff" : "var(--ui-text)", border: mine ? "none" : "1px solid var(--ui-border)", borderRadius: 12, padding: "8px 12px", fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {m.body && <div>{highlightMentions(m.body, memberNames)}</div>}
                        {(m.attachments ?? []).map((a, i) => (
                          a.contentType.startsWith("image/") ? (
                            <a key={i} href={a.dataUrl} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: m.body || i > 0 ? 6 : 0 }}>
                              <img src={a.dataUrl} alt={a.name} style={{ maxWidth: 220, maxHeight: 220, borderRadius: 8, display: "block" }} />
                            </a>
                          ) : a.contentType.startsWith("audio/") ? (
                            <audio key={i} controls src={a.dataUrl} style={{ display: "block", marginTop: 6, maxWidth: 240 }} />
                          ) : (
                            <a key={i} href={a.dataUrl} download={a.name} style={{ display: "block", marginTop: 6, fontSize: 13, color: "inherit", textDecoration: "underline" }}>{a.name}</a>
                          )
                        ))}
                        {m.edited_at && <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>edited</div>}
                      </div>
                    )}
                    {!m.deleted_at && (m.reactions ?? []).length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4, justifyContent: mine ? "flex-end" : "flex-start" }}>
                        {(m.reactions ?? []).map((r) => {
                          const onByMe = r.user_ids.includes(myId ?? "");
                          return (
                            <button key={r.emoji} onClick={() => void toggleReaction(m, r.emoji)} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, padding: "1px 6px", borderRadius: 999, cursor: "pointer", border: onByMe ? "1px solid var(--ui-accent-blue)" : "1px solid var(--ui-border)", background: onByMe ? "rgba(47, 168, 106, 0.12)" : "var(--ui-surface-strong)", color: "var(--ui-text)" }}>
                              {r.emoji} {r.user_ids.length}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {!m.deleted_at && (
                      <div style={{ display: "flex", gap: 8, marginTop: 3, opacity: 0.55, justifyContent: mine ? "flex-end" : "flex-start" }}>
                        {QUICK_REACTS.map((e) => (
                          <button key={e} onClick={() => void toggleReaction(m, e)} title="React" style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }}>{e}</button>
                        ))}
                        <button onClick={() => { setReplyTo(m); setEditing(null); }} title="Reply" style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ui-text-muted)", padding: 0, fontSize: 12 }}>Reply</button>
                        <button onClick={() => void togglePin(m)} title={m.pinned_at ? "Unpin" : "Pin"} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ui-text-muted)", padding: 0, fontSize: 12 }}>{m.pinned_at ? "Unpin" : "Pin"}</button>
                        {mine && <button onClick={() => startEdit(m)} title="Edit" style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ui-text-muted)", padding: 0, fontSize: 12 }}>Edit</button>}
                        {mine && <button onClick={() => void del(m)} title="Delete" style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ui-text-muted)", padding: 0, fontSize: 12 }}>Delete</button>}
                      </div>
                    )}
                  </div>
                );
              })}
              {(() => {
                const lastMine = [...messages].reverse().find((m) => m.sender_id === myId && !m.deleted_at);
                if (!lastMine || !active) return null;
                const seenBy = active.member_ids.filter((uid) => uid !== myId && reads[uid] && new Date(reads[uid] as string).getTime() >= new Date(lastMine.created_at).getTime());
                if (seenBy.length === 0) return null;
                const label = active.kind === "dm" ? "Seen" : `Seen by ${seenBy.map((uid) => userName(uid)).join(", ")}`;
                return <div style={{ fontSize: 11, color: "var(--ui-text-muted)", alignSelf: "flex-end", marginTop: 2 }}>{label}</div>;
              })()}
              <div ref={bottomRef} />
            </div>
            <div style={{ borderTop: "1px solid var(--ui-border)", padding: 12, paddingRight: 88, paddingBottom: "max(12px, env(safe-area-inset-bottom))", background: "var(--ui-surface-strong)", display: "flex", flexDirection: "column", gap: 8 }}>
              {mentionQuery !== null && (() => {
                const q = mentionQuery.toLowerCase();
                const matches = users.filter((u) => u.id !== myId && (active?.member_ids.includes(u.id) ?? true) && u.name.toLowerCase().includes(q)).slice(0, 6);
                if (matches.length === 0) return null;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 180, overflowY: "auto", border: "1px solid var(--ui-border)", borderRadius: 8, background: "var(--ui-surface-strong)" }}>
                    {matches.map((u) => (
                      <button key={u.id} onClick={() => pickMention(u)} style={{ textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: "6px 10px", fontSize: 13, color: "var(--ui-text)" }}>@{u.name}</button>
                    ))}
                  </div>
                );
              })()}
              {typingIds.filter((id) => id !== myId).length > 0 && (
                <div style={{ fontSize: 12, color: "var(--ui-text-muted)", fontStyle: "italic" }}>
                  {typingIds.filter((id) => id !== myId).map((id) => userName(id)).join(", ")} {typingIds.filter((id) => id !== myId).length > 1 ? "are" : "is"} typing{"\u2026"}
                </div>
              )}
              {(replyTo || editing) && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12, color: "var(--ui-text-muted)", background: "var(--ui-surface-muted)", border: "1px solid var(--ui-border)", borderRadius: 6, padding: "4px 8px" }}>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {editing ? "Editing message" : `Replying to ${userName(replyTo?.sender_id ?? null)}`}
                  </span>
                  <button onClick={() => { setReplyTo(null); setEditing(null); setDraft(""); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ui-text-muted)", fontSize: 14, lineHeight: 1 }} aria-label="Cancel">{"\u00D7"}</button>
                </div>
              )}
              {atts.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {atts.map((a, i) => (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--ui-surface-muted)", border: "1px solid var(--ui-border)", borderRadius: 6, padding: "4px 8px", fontSize: 12, color: "var(--ui-text)" }}>
                      {a.contentType.startsWith("image/") ? "\u{1F5BC}\uFE0F" : a.contentType.startsWith("audio/") ? "\u{1F3A4}" : "\u{1F4C4}"} {a.name}
                      <button onClick={() => setAtts((prev) => prev.filter((_, j) => j !== i))} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ui-text-muted)", fontSize: 14, lineHeight: 1 }} aria-label="Remove attachment">{"\u00D7"}</button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={(e) => { void onPickFiles(e.target.files); e.target.value = ""; }} />
                <button onClick={() => fileRef.current?.click()} title="Attach file" style={{ padding: "10px 12px", background: "var(--ui-surface-muted)", color: "var(--ui-text)", border: "1px solid var(--ui-border)", borderRadius: 8, cursor: "pointer", fontSize: 16 }}>{"\u{1F4CE}"}</button>
                <button onClick={() => void toggleRecord()} title={recording ? "Stop recording" : "Record voice note"} style={{ padding: "10px 12px", background: recording ? "#ff3b30" : "var(--ui-surface-muted)", color: recording ? "#fff" : "var(--ui-text)", border: "1px solid var(--ui-border)", borderRadius: 8, cursor: "pointer", fontSize: 16 }}>{recording ? "\u{23F9}\uFE0F" : "\u{1F3A4}"}</button>
                <input value={draft} onChange={(e) => onDraftChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Message…" style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--ui-border)", borderRadius: 8, fontSize: 14 }} />
                <button onClick={() => void send()} disabled={editing ? !draft.trim() : (!draft.trim() && atts.length === 0)} style={{ padding: "10px 18px", background: "var(--ui-accent-blue)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>{editing ? "Save" : "Send"}</button>
              </div>
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
      <div onClick={(e) => e.stopPropagation()} style={{ width: 420, maxHeight: "80vh", background: "var(--ui-surface-strong)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--ui-text)" }}>New conversation</div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["dm", "group", "channel"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setPicked(new Set()); }} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: mode === m ? "1px solid var(--ui-accent-blue)" : "1px solid var(--ui-border)", background: mode === m ? "rgba(47, 168, 106, 0.12)" : "var(--ui-surface-strong)", color: mode === m ? "var(--ui-accent-blue)" : "var(--ui-text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer", textTransform: "capitalize" }}>{m === "dm" ? "Direct" : m}</button>
          ))}
        </div>
        {mode !== "dm" && <input value={name} onChange={(e) => setName(e.target.value)} placeholder={mode === "channel" ? "Channel name" : "Group name (optional)"} style={{ padding: "8px 10px", border: "1px solid var(--ui-border)", borderRadius: 8, fontSize: 14 }} />}
        <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{mode === "dm" ? "Pick one person" : "Pick people"}</div>
        <div style={{ overflowY: "auto", border: "1px solid var(--ui-border)", borderRadius: 8, maxHeight: 280 }}>
          {users.map((u) => (
            <div key={u.id} onClick={() => toggle(u.id)} style={{ padding: "8px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--ui-surface-muted)", background: picked.has(u.id) ? "rgba(47, 168, 106, 0.12)" : "var(--ui-surface-strong)" }}>
              <span style={{ fontSize: 14, color: "var(--ui-text)" }}>{u.name}</span>
              {picked.has(u.id) && <span style={{ color: "var(--ui-accent-fg)" }}>✓</span>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => void create()} disabled={!canCreate || busy} style={{ padding: "8px 16px", border: "none", background: canCreate ? "var(--ui-accent-blue)" : "var(--ui-border)", color: "#fff", borderRadius: 8, fontWeight: 600, cursor: canCreate ? "pointer" : "default" }}>{busy ? "Creating…" : "Create"}</button>
        </div>
      </div>
    </div>
  );
}

// BF_PORTAL_RECENT_CALLS_v1 - recent calls for the logged-in staff member.
// BF_PORTAL_PHONE_TAB_v1 - one "Phone" tab holding both call history and voicemails.
// Deliberately a thin wrapper around the two EXISTING components rather than a
// rewrite: no behaviour change, nothing to re-test.
function PhoneTab() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, width: "100%", minHeight: 0, overflow: "hidden" }}>
      <div style={{ borderRight: "1px solid var(--ui-border)", minHeight: 0, overflowY: "auto" }}>
        <RecentsTab />
      </div>
      <div style={{ minHeight: 0, overflowY: "auto" }}>
        <VoicemailTab />
      </div>
    </div>
  );
}

function RecentsTab() {
  const [rows, setRows] = useState<import("@/services/callService").CallSession[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    import("@/services/callService")
      .then((m) => m.fetchCallHistory())
      .then((r) => { if (!cancelled) setRows(r); })
      .catch(() => { if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const fmtWhen = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };
  const fmtDur = (sec?: number | null) => {
    if (sec == null || sec <= 0) return "";
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };
  if (loading) return <div style={{ padding: 16, color: "var(--ui-text-muted)", fontSize: 13 }}>Loading recent calls...</div>;
  // BF_PORTAL_RECENTS_2COL_v1 - two scrollable columns (Incoming / Outgoing), themed text.
  type Call = import("@/services/callService").CallSession;
  const incoming = rows.filter((c) => c.direction === "inbound");
  const outgoing = rows.filter((c) => c.direction !== "inbound");
  const CallRow = (c: Call) => {
    const missed = /no-?answer|busy|failed|missed/i.test(c.status || "");
    const title = c.contact_name || c.phone || "Unknown caller";
    return (
      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderBottom: "1px solid var(--ui-border)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: missed ? "#ff3b30" : "var(--ui-text)" }}>{title}</div>
          <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>
            {[missed ? "Missed" : null, c.duration_seconds ? fmtDur(c.duration_seconds) : null, fmtWhen(c.started_at) || null].filter(Boolean).join("  -  ")}
          </div>
        </div>
        {c.phone && (
          <button
            onClick={() => void startOutboundPstn(c.phone as string, { contactId: c.contact_id ?? null, contactName: c.contact_name ?? null })}
            style={{ background: "#22c55e", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >Call</button>
        )}
      </div>
    );
  };
  const Column = (heading: string, list: Call[]) => (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <h3 style={{ padding: "0 4px 8px", fontSize: 15, fontWeight: 700, color: "var(--ui-text)" }}>{heading}</h3>
      <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        {list.length === 0
          ? <div style={{ padding: 12, color: "var(--ui-text-muted)", fontSize: 13 }}>None yet.</div>
          : list.map((c) => CallRow(c))}
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 16, padding: 8, height: "100%", minHeight: 0, boxSizing: "border-box", color: "var(--ui-text)" }}>
      {Column("Incoming", incoming)}
      {Column("Outgoing", outgoing)}
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
      {loading && <div style={{ color: "var(--ui-text-muted)" }}>Loading…</div>}
      {err && <div style={{ color: "#b00020" }}>{err}</div>}
      {!loading && !err && items.length === 0 && <div style={{ color: "var(--ui-text-muted)" }}>No voicemails.</div>}
      {items.map((vm) => (
        <div key={vm.id} style={{ borderBottom: "1px solid var(--ui-surface-muted)", padding: "12px 0" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ui-text-muted)" }}>
            {vm.contact_name || vm.contact_phone || "Unknown caller"}
          </div>
          <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 6 }}>
            {vm.created_at ? new Date(vm.created_at).toLocaleString() : ""}
          </div>
          {vm.recording_url ? (
            <VoicemailAudio id={vm.id} />
          ) : (
            <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>No recording</span>
          )}
        </div>
      ))}
    </div>
  );
}
