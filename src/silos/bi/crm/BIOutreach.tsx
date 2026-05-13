// BF_PORTAL_BLOCK_v202_OUTREACH_UI_v1
// Outreach subtab. Filters → list → per-row inline activity logger
// → activity timeline. Pairs with BI-Server v251 endpoints under
// /api/v1/bi/crm/outreach/*.
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api";

const STATUSES = [
  "cold",
  "attempting",
  "voicemail",
  "engaged",
  "demo_booked",
  "demo_completed",
  "not_interested",
  "lender",
] as const;
type Status = (typeof STATUSES)[number];

const EVENT_TYPES = ["call", "demo", "sms", "email", "note"] as const;
type EventType = (typeof EVENT_TYPES)[number];

const CALL_OUTCOMES = [
  { value: "spoke", label: "Spoke (→ engaged)" },
  { value: "voicemail", label: "Voicemail (→ voicemail)" },
  { value: "no_answer", label: "No answer" },
  { value: "booked", label: "Booked demo (→ demo_booked)" },
  { value: "not_interested", label: "Not interested (→ not_interested)" },
  { value: "wrong_number", label: "Wrong number" },
] as const;

type Contact = {
  id: string;
  full_name: string;
  email: string | null;
  phone_e164: string | null;
  title: string | null;
  notes: string | null;
  tags: string[] | null;
  outreach_status: Status | null;
  outreach_owner_id: string | null;
  outreach_updated_at: string | null;
  created_at: string;
};

type ActivityRow = {
  id: string;
  contact_id: string;
  actor_id: string | null;
  actor_name: string | null;
  event_type: string;
  outcome: string | null;
  body: string | null;
  created_at: string;
};

type StaffProfile = {
  staff_user_id: string;
  display_name: string | null;
  bookings_url: string | null;
  phone_e164: string | null;
};

export default function BIOutreach() {
  const [status, setStatus] = useState<string>("");
  const [owner, setOwner] = useState<string>("");
  const [q, setQ] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (owner) params.set("owner", owner);
      if (q.trim()) params.set("q", q.trim());
      const r: any = await api(
        `/api/v1/bi/crm/outreach/contacts${params.toString() ? `?${params}` : ""}`,
      );
      setContacts(Array.isArray(r?.contacts) ? r.contacts : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load contacts.");
    } finally {
      setLoading(false);
    }
  }, [status, owner, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadProfile = useCallback(async () => {
    try {
      const r: any = await api(`/api/v1/bi/crm/outreach/me/profile`);
      setProfile(r?.profile ?? null);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (profileOpen && !profile) void loadProfile();
  }, [profileOpen, profile, loadProfile]);

  async function saveProfile(next: { display_name?: string; bookings_url?: string; phone_e164?: string }) {
    setProfileSaving(true);
    try {
      await api(`/api/v1/bi/crm/outreach/me/profile`, {
        method: "PUT",
        body: next,
      } as any);
      await loadProfile();
    } finally {
      setProfileSaving(false);
    }
  }

  async function logActivity(
    contactId: string,
    payload: { event_type: EventType; outcome?: string; body?: string },
  ) {
    await api(`/api/v1/bi/crm/outreach/contacts/${contactId}/activity`, {
      method: "POST",
      body: payload,
    } as any);
    await load();
  }

  async function changeStatus(contactId: string, newStatus: Status | "") {
    await api(`/api/v1/bi/crm/outreach/contacts/${contactId}`, {
      method: "PATCH",
      body: { outreach_status: newStatus === "" ? null : newStatus },
    } as any);
    await load();
  }

  const stats = useMemo(() => {
    const by: Record<string, number> = {};
    for (const c of contacts) {
      const k = c.outreach_status ?? "unassigned";
      by[k] = (by[k] ?? 0) + 1;
    }
    return by;
  }, [contacts]);

  return (
    <div className="space-y-4" data-testid="bi-outreach">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-white/70">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-brand-surface border border-card rounded-md px-2 py-1 text-sm"
          aria-label="Status filter"
        >
          <option value="">All</option>
          <option value="unassigned">Unassigned</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>

        <label className="text-sm text-white/70 ml-2">Owner</label>
        <select
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="bg-brand-surface border border-card rounded-md px-2 py-1 text-sm"
          aria-label="Owner filter"
        >
          <option value="">All</option>
          <option value="mine">Mine</option>
          <option value="unassigned">Unassigned</option>
        </select>

        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name / email / phone"
          className="bg-brand-surface border border-card rounded-md px-2 py-1 text-sm w-72"
          aria-label="Search contacts"
        />

        <button
          type="button"
          onClick={() => void load()}
          className="px-3 py-1 rounded-md text-sm bg-white/10 hover:bg-white/15"
        >
          Refresh
        </button>

        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          className="ml-auto px-3 py-1 rounded-md text-sm bg-white/5 hover:bg-white/10"
          aria-expanded={profileOpen}
        >
          My profile
        </button>
      </div>

      {profileOpen && (
        <ProfilePanel
          profile={profile}
          saving={profileSaving}
          onSave={saveProfile}
          onClose={() => setProfileOpen(false)}
        />
      )}

      <div className="text-xs text-white/60">
        {Object.entries(stats).map(([k, v]) => (
          <span key={k} className="inline-block mr-3">
            <span className="text-white/40">{k.replace(/_/g, " ")}:</span>{" "}
            <span className="text-white/90">{v}</span>
          </span>
        ))}
      </div>

      {loading && <p className="text-sm text-white/60">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-2">
        {contacts.map((c) => (
          <ContactRow
            key={c.id}
            contact={c}
            expanded={expandedId === c.id}
            onToggle={() => setExpandedId((id) => (id === c.id ? null : c.id))}
            onLog={(payload) => logActivity(c.id, payload)}
            onStatusChange={(s) => changeStatus(c.id, s)}
            bookingsUrl={profile?.bookings_url ?? null}
          />
        ))}
        {!loading && contacts.length === 0 && (
          <p className="text-sm text-white/50">No contacts match these filters.</p>
        )}
      </div>
    </div>
  );
}

function ContactRow(props: {
  contact: Contact;
  expanded: boolean;
  onToggle: () => void;
  onLog: (payload: { event_type: EventType; outcome?: string; body?: string }) => Promise<void>;
  onStatusChange: (status: Status | "") => Promise<void>;
  bookingsUrl: string | null;
}) {
  const { contact: c, expanded, onToggle, onLog, onStatusChange, bookingsUrl } = props;
  const [logging, setLogging] = useState(false);
  const [eventType, setEventType] = useState<EventType>("call");
  const [outcome, setOutcome] = useState<string>("");
  const [note, setNote] = useState("");

  async function submit() {
    setLogging(true);
    try {
      const payload: { event_type: EventType; outcome?: string; body?: string } = {
        event_type: eventType,
      };
      if (outcome) payload.outcome = outcome;
      if (note.trim()) payload.body = note.trim();
      await onLog(payload);
      setOutcome("");
      setNote("");
    } finally {
      setLogging(false);
    }
  }

  return (
    <div className="bg-brand-surface border border-card rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="text-left flex-1 min-w-0"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2">
            <strong className="truncate">{c.full_name}</strong>
            {c.title && <span className="text-xs text-white/50">· {c.title}</span>}
          </div>
          <div className="text-xs text-white/60">
            {c.email ?? "—"} · {c.phone_e164 ?? "—"}
          </div>
        </button>

        <select
          value={c.outreach_status ?? ""}
          onChange={(e) => void onStatusChange(e.target.value as Status | "")}
          className="bg-black/20 border border-card rounded-md px-2 py-1 text-xs"
          aria-label={`Status for ${c.full_name}`}
        >
          <option value="">unassigned</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>

        <button
          type="button"
          disabled={!bookingsUrl}
          title={bookingsUrl ? "Send demo invite (lands in v252)" : "Set your MS Bookings URL in My profile first"}
          className="px-2 py-1 rounded-md text-xs bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send demo invite
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
              className="bg-black/20 border border-card rounded-md px-2 py-1 text-xs"
              aria-label="Event type"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {eventType === "call" && (
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="bg-black/20 border border-card rounded-md px-2 py-1 text-xs"
                aria-label="Call outcome"
              >
                <option value="">— outcome —</option>
                {CALL_OUTCOMES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}

            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Free-text note"
              className="bg-black/20 border border-card rounded-md px-2 py-1 text-xs flex-1 min-w-[12rem]"
              aria-label="Note"
            />

            <button
              type="button"
              disabled={logging}
              onClick={() => void submit()}
              className="px-3 py-1 rounded-md text-xs bg-white/10 hover:bg-white/15 disabled:opacity-50"
            >
              {logging ? "Logging…" : "Log activity"}
            </button>
          </div>

          <ActivityTimeline contactId={c.id} />
        </div>
      )}
    </div>
  );
}

function ActivityTimeline({ contactId }: { contactId: string }) {
  const [events, setEvents] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r: any = await api(
          `/api/v1/bi/crm/outreach/contacts/${contactId}/activity`,
        );
        if (cancelled) return;
        setEvents(Array.isArray(r?.events) ? r.events : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  if (loading) return <p className="text-xs text-white/50">Loading timeline…</p>;
  if (events.length === 0) {
    return <p className="text-xs text-white/40">No activity logged yet.</p>;
  }
  return (
    <ul className="space-y-1">
      {events.map((e) => (
        <li key={e.id} className="text-xs text-white/70 border-l border-white/10 pl-2">
          <span className="text-white/40">
            {new Date(e.created_at).toLocaleString()} ·{" "}
          </span>
          <span className="uppercase text-white/50">{e.event_type}</span>
          {e.outcome && <span className="text-white/60"> · {e.outcome}</span>}
          {e.actor_name && <span className="text-white/40"> · {e.actor_name}</span>}
          {e.body && <span className="text-white/80"> — {e.body}</span>}
        </li>
      ))}
    </ul>
  );
}

function ProfilePanel(props: {
  profile: StaffProfile | null;
  saving: boolean;
  onSave: (next: { display_name?: string; bookings_url?: string; phone_e164?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const { profile, saving, onSave, onClose } = props;
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bookingsUrl, setBookingsUrl] = useState(profile?.bookings_url ?? "");
  const [phone, setPhone] = useState(profile?.phone_e164 ?? "");

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setBookingsUrl(profile?.bookings_url ?? "");
    setPhone(profile?.phone_e164 ?? "");
  }, [profile]);

  return (
    <div className="bg-brand-surface border border-card rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">My outreach profile</h4>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-white/60 hover:text-white"
          aria-label="Close profile panel"
        >
          ×
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Display name
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full bg-black/20 border border-card rounded-md px-2 py-1 text-sm"
          />
        </label>
        <label className="text-sm">
          Phone (E.164)
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1403…"
            className="mt-1 w-full bg-black/20 border border-card rounded-md px-2 py-1 text-sm"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          MS Bookings URL (must be https://)
          <input
            value={bookingsUrl}
            onChange={(e) => setBookingsUrl(e.target.value)}
            placeholder="https://outlook.office.com/bookings/…"
            className="mt-1 w-full bg-black/20 border border-card rounded-md px-2 py-1 text-sm"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            void onSave({
              display_name: displayName,
              bookings_url: bookingsUrl,
              phone_e164: phone,
            })
          }
          className="px-3 py-1 rounded-md text-sm bg-white/10 hover:bg-white/15 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}
