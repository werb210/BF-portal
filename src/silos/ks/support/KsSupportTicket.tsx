// BF_PORTAL_v853_KS_PHONE_SUPPORT - one Keystone support ticket: status, priority and assignee, the licensee and
// contact (links to their Keystone CRM records), the SLA, and the thread - customer messages, replies, internal notes,
// support-line calls (outcome, AI summary, transcript) and voicemails. Staff reply by email or SMS (sent by BF-Server
// through the usual Graph / Twilio senders and logged on the contact) or add an internal note.
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, card, date, Field, input, KeyValues, label, linkStyle, PageTitle, Section } from "../ksUi";
import {
  apiErrorText, KS_TICKET_PRIORITIES, KS_TICKET_STATUSES, ksSupportApi,
  type KsStaffMember, type KsSupportMessage, type KsSupportTicket, type KsTicketPriority, type KsTicketStatus,
} from "./ksSupportApi";
import { channelLabel, SlaBadge, StatusBadge, SUPPORT_BASE } from "./KsSupportQueue";

const KS_CRM_BASE = "/silo/ks/crm";

const KIND_LABEL: Record<string, string> = {
  customer: "Customer",
  reply: "Reply",
  note: "Internal note",
  call: "Phone call",
  voicemail: "Voicemail",
  system: "Update",
};

function bubble(kind: string): CSSProperties {
  const base: CSSProperties = { ...card, padding: 12, marginBottom: 10 };
  if (kind === "note") return { ...base, borderStyle: "dashed", background: "var(--ui-surface)" };
  if (kind === "reply") return { ...base, borderLeft: "4px solid #1d4ed8" };
  if (kind === "system") return { ...base, padding: "6px 12px", color: "var(--ui-text-muted)", fontSize: 13 };
  return { ...base, borderLeft: "4px solid #6D28D9" };
}

function duration(secs: number | null | undefined): string {
  if (secs == null) return "";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m ? `${m} min ${s} s` : `${s} s`;
}

function Message({ m }: { m: KsSupportMessage }) {
  const [showTranscript, setShowTranscript] = useState(false);
  if (m.kind === "system") {
    return <div style={bubble("system")} data-testid="ks-message">{m.body} - {date(m.created_at, true)}</div>;
  }
  return (
    <div style={bubble(m.kind)} data-testid="ks-message">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: 13, color: "var(--ui-text-muted)", marginBottom: 6 }}>
        <span style={{ fontWeight: 600, color: "var(--ui-text)" }}>
          {KIND_LABEL[m.kind] ?? label(m.kind)}
          {m.channel && m.kind === "reply" ? ` by ${m.channel === "sms" ? "SMS" : "email"}` : ""}
          {m.author_name ? ` - ${m.author_name}` : ""}
        </span>
        <span>{date(m.created_at, true)}</span>
      </div>
      <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{m.body}</div>
      {m.kind === "call" && m.call ? (
        <div style={{ marginTop: 8, fontSize: 13 }}>
          <div>
            {m.call.answered ? `Answered${m.call.answered_by ? ` by ${m.call.answered_by}` : ""}` : "Not answered"}
            {m.call.duration_seconds ? ` - ${duration(m.call.duration_seconds)}` : ""}
          </div>
          {m.call.summary ? (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontWeight: 600 }}>AI call summary</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.call.summary}</div>
            </div>
          ) : m.call.answered ? <div style={{ color: "var(--ui-text-muted)", marginTop: 4 }}>The AI summary appears here a few minutes after the call ends.</div> : null}
          {m.call.transcript ? (
            <div style={{ marginTop: 6 }}>
              <Button onClick={() => setShowTranscript((v) => !v)}>{showTranscript ? "Hide transcript" : "Show transcript"}</Button>
              {showTranscript ? <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{m.call.transcript}</div> : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {m.kind === "voicemail" && m.recording_url ? (
        <div style={{ marginTop: 8 }}>
          <a href={m.recording_url} target="_blank" rel="noopener noreferrer" style={linkStyle}>Play the voicemail</a>
        </div>
      ) : null}
    </div>
  );
}

export default function KsSupportTicket() {
  const { id = "" } = useParams();
  const [ticket, setTicket] = useState<KsSupportTicket | null>(null);
  const [messages, setMessages] = useState<KsSupportMessage[]>([]);
  const [staff, setStaff] = useState<KsStaffMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState({ channel: "email" as "email" | "sms", body: "", status: "waiting" as KsTicketStatus });
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await ksSupportApi.ticket(id);
      setTicket(r.ticket);
      setMessages(r.messages ?? []);
      setError(null);
    } catch (e) {
      setError(apiErrorText(e, "Could not load the ticket."));
    }
  }, [id]);

  useEffect(() => {
    void load();
    ksSupportApi.staff().then(setStaff).catch(() => setStaff([]));
  }, [load]);

  const change = async (body: Parameters<typeof ksSupportApi.update>[1], done: string) => {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const r = await ksSupportApi.update(id, body);
      if (r?.ticket) {
        setTicket(r.ticket);
        setMessages(r.messages ?? []);
      } else await load();
      setNotice(done);
    } catch (e) {
      setError(apiErrorText(e, "Could not save the change."));
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!reply.body.trim()) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const r = await ksSupportApi.reply(id, { channel: reply.channel, body: reply.body.trim(), status: reply.status });
      setReply((x) => ({ ...x, body: "" }));
      setNotice(`Sent to ${r?.to ?? "the customer"}.`);
      await load();
    } catch (e) {
      setError(apiErrorText(e, "Could not send the reply."));
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await ksSupportApi.note(id, note.trim());
      setNote("");
      setNotice("Note added.");
      await load();
    } catch (e) {
      setError(apiErrorText(e, "Could not add the note."));
    } finally {
      setBusy(false);
    }
  };

  if (!ticket) {
    return (
      <div style={{ padding: "16px 24px" }}>
        <Link to={SUPPORT_BASE} style={linkStyle}>Back to the queue</Link>
        {error ? <p role="alert" style={{ color: "var(--ui-text-danger)" }}>{error}</p> : <p style={{ color: "var(--ui-text-muted)" }}>Loading the ticket...</p>}
      </div>
    );
  }

  const email = ticket.contact_email ?? ticket.from_email;
  const phone = ticket.contact_phone ?? ticket.from_phone;
  const canSend = reply.channel === "email" ? Boolean(email) : Boolean(phone);

  return (
    <div style={{ padding: "16px 24px", maxWidth: 1100 }} data-testid="ks-support-ticket">
      <div style={{ marginBottom: 8 }}><Link to={SUPPORT_BASE} style={linkStyle}>Back to the queue</Link></div>
      <PageTitle actions={<><StatusBadge status={ticket.status} text={ticket.status_label} /> <SlaBadge state={ticket.sla_state} due={ticket.sla_due_at} /></>}>
        #{ticket.number} {ticket.subject}
      </PageTitle>
      {notice ? <p role="status" style={{ color: "var(--ui-text)", margin: "0 0 8px" }}>{notice}</p> : null}
      {error ? <p role="alert" style={{ color: "var(--ui-text-danger)", margin: "0 0 8px" }}>{error}</p> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, alignItems: "start" }}>
        <div>
          <Section title="Conversation">
            {messages.length ? messages.map((m) => <Message key={m.id} m={m} />) : <p style={{ color: "var(--ui-text-muted)" }}>No messages yet.</p>}
          </Section>
          <Section title="Reply">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
              <Field name="Send by">
                <select aria-label="Send by" style={input} value={reply.channel} onChange={(e) => setReply({ ...reply, channel: e.target.value as "email" | "sms" })}>
                  <option value="email">Email{email ? ` (${email})` : " (no address)"}</option>
                  <option value="sms">SMS{phone ? ` (${phone})` : " (no number)"}</option>
                </select>
              </Field>
              <Field name="Then set status to">
                <select aria-label="Status after reply" style={input} value={reply.status} onChange={(e) => setReply({ ...reply, status: e.target.value as KsTicketStatus })}>
                  {KS_TICKET_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </Field>
            </div>
            <textarea aria-label="Reply" rows={5} style={{ ...input, width: "100%", minHeight: 110, boxSizing: "border-box" }} value={reply.body} onChange={(e) => setReply({ ...reply, body: e.target.value })} />
            {!canSend ? <p style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>Link a contact with an {reply.channel === "email" ? "email address" : "phone number"} to reply this way.</p> : null}
            <div style={{ marginTop: 8 }}>
              <Button kind="primary" onClick={() => void sendReply()} disabled={busy || !canSend || !reply.body.trim()} testId="ks-send-reply">Send reply</Button>
            </div>
          </Section>
          <Section title="Internal note">
            <textarea aria-label="Internal note" rows={3} style={{ ...input, width: "100%", minHeight: 80, boxSizing: "border-box" }} value={note} onChange={(e) => setNote(e.target.value)} />
            <div style={{ marginTop: 8 }}>
              <Button onClick={() => void addNote()} disabled={busy || !note.trim()} testId="ks-add-note">Add note</Button>
            </div>
          </Section>
        </div>
        <div>
          <Section title="Ticket">
            <div style={{ display: "grid", gap: 10 }}>
              <Field name="Status">
                <select aria-label="Ticket status" style={input} value={ticket.status} disabled={busy} onChange={(e) => void change({ status: e.target.value as KsTicketStatus }, "Status saved.")}>
                  {KS_TICKET_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </Field>
              <Field name="Priority">
                <select aria-label="Ticket priority" style={input} value={ticket.priority} disabled={busy} onChange={(e) => void change({ priority: e.target.value as KsTicketPriority }, "Priority saved.")}>
                  {KS_TICKET_PRIORITIES.map((p) => <option key={p} value={p}>{label(p)}</option>)}
                </select>
              </Field>
              <Field name="Assignee">
                <select aria-label="Ticket assignee" style={input} value={ticket.assignee_user_id ?? ""} disabled={busy} onChange={(e) => void change({ assignee_user_id: e.target.value || null }, "Assignee saved.")}>
                  <option value="">Unassigned</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </div>
          </Section>
          <Section title="Customer">
            <KeyValues
              rows={[
                ["Licensee", ticket.company_id ? <Link to={`${KS_CRM_BASE}/companies/${ticket.company_id}`} style={linkStyle}>{ticket.company_name ?? "Company"}</Link> : "Not linked"],
                ["Contact", ticket.contact_id ? <Link to={`${KS_CRM_BASE}/contacts/${ticket.contact_id}`} style={linkStyle}>{ticket.contact_name ?? "Contact"}</Link> : (ticket.from_name ?? "Not linked")],
                ["Email", email ?? "-"],
                ["Phone", phone ?? "-"],
                ["Plan", ticket.company_plan ? label(ticket.company_plan) : "-"],
                ["Support level", ticket.support_level_label ?? "Not known (Email target used)"],
              ]}
            />
          </Section>
          <Section title="SLA">
            <KeyValues
              rows={[
                ["First reply target", ticket.sla_target],
                ["Due", date(ticket.sla_due_at, true)],
                ["First response", ticket.responded_at ? date(ticket.responded_at, true) : "Not yet"],
                ["Channel", channelLabel(ticket.channel)],
                ["Opened", date(ticket.created_at, true)],
              ]}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}
