// BF_PORTAL_v853_KS_PHONE_SUPPORT - the Keystone support queue: every ticket from the support line (calls and
// voicemails), KS-Ops in-app help, email and staff, with filters (status, assignee, priority, channel, search) and an
// SLA badge (first-reply target from the licensee's support level). New tickets can be opened by hand.
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { crmApi, type ContactRow } from "@/api/crm";
import { Badge, Button, date, Field, input, label, linkStyle, PageTitle, Section, Table, td } from "../ksUi";
import StartDemoButton from "../StartDemoButton";
import {
  apiErrorText, KS_TICKET_CHANNELS, KS_TICKET_PRIORITIES, KS_TICKET_STATUSES, ksSupportApi, SLA_COLOURS, SLA_LABELS,
  type KsSlaState, type KsStaffMember, type KsSupportTicket, type KsTicketChannel, type KsTicketPriority, type TicketFilters,
} from "./ksSupportApi";

export const SUPPORT_BASE = "/silo/ks/crm/support";

export function SlaBadge({ state, due }: { state: KsSlaState; due?: string | null }) {
  return (
    <span
      data-testid="ks-sla-badge"
      title={due ? `First reply due ${date(due, true)}` : undefined}
      style={{ display: "inline-block", background: SLA_COLOURS[state] ?? SLA_COLOURS.none, color: "#ffffff", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}
    >
      {SLA_LABELS[state] ?? SLA_LABELS.none}
    </span>
  );
}

// White text on each: slate 7.6:1, blue 6.7:1, amber 5.0:1, green 5.0:1.
const STATUS_COLOURS: Record<string, string> = { new: "#6D28D9", open: "#1d4ed8", waiting: "#b45309", resolved: "#15803d", closed: "#475569" };

export function StatusBadge({ status, text }: { status: string; text: string }) {
  return (
    <span
      data-testid="ks-status-badge"
      style={{ display: "inline-block", background: STATUS_COLOURS[status] ?? "#475569", color: "#ffffff", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}
    >
      {text}
    </span>
  );
}

export function channelLabel(c: string): string {
  return KS_TICKET_CHANNELS.find((x) => x.key === c)?.label ?? label(c);
}

function NewTicketForm({ staff, onDone }: { staff: KsStaffMember[]; onDone: () => void }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ subject: "", body: "", priority: "normal" as KsTicketPriority, channel: "manual" as KsTicketChannel, assignee: "" });
  const [contactSearch, setContactSearch] = useState("");
  const [matches, setMatches] = useState<ContactRow[]>([]);
  const [contact, setContact] = useState<ContactRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = contactSearch.trim();
    if (q.length < 2 || contact) {
      setMatches([]);
      return;
    }
    const t = setTimeout(() => {
      crmApi.listContacts({ search: q, pageSize: 8 }).then((rows) => setMatches(Array.isArray(rows) ? rows.slice(0, 8) : [])).catch(() => setMatches([]));
    }, 250);
    return () => clearTimeout(t);
  }, [contactSearch, contact]);

  const submit = async () => {
    setError(null);
    if (!form.subject.trim()) {
      setError("Enter a subject.");
      return;
    }
    setSaving(true);
    try {
      const r = await ksSupportApi.create({
        subject: form.subject.trim(),
        body: form.body.trim() || undefined,
        priority: form.priority,
        channel: form.channel,
        assignee_user_id: form.assignee || null,
        contact_id: contact?.id ?? null,
        company_id: contact?.company_id ?? null,
      });
      onDone();
      navigate(`${SUPPORT_BASE}/${r.id}`);
    } catch (e) {
      setError(apiErrorText(e, "Could not open the ticket."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="New ticket">
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }} data-testid="ks-new-ticket">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          <Field name="Subject">
            <input aria-label="Subject" style={input} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </Field>
          <Field name="Channel">
            <select aria-label="Channel" style={input} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as KsTicketChannel })}>
              {KS_TICKET_CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
          <Field name="Priority">
            <select aria-label="Priority" style={input} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as KsTicketPriority })}>
              {KS_TICKET_PRIORITIES.map((p) => <option key={p} value={p}>{label(p)}</option>)}
            </select>
          </Field>
          <Field name="Assign to">
            <select aria-label="Assign to" style={input} value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}>
              <option value="">Nobody yet</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field name="Contact (Keystone CRM)">
            {contact ? (
              <span style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--ui-text)", fontWeight: 400 }}>
                {contact.name}{contact.company_name ? ` - ${contact.company_name}` : ""}
                <Button onClick={() => { setContact(null); setContactSearch(""); }}>Change</Button>
              </span>
            ) : (
              <>
                <input aria-label="Find contact" placeholder="Name, email or phone" style={input} value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} />
                {matches.length > 0 && (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, border: "1px solid var(--ui-border)", borderRadius: 8 }}>
                    {matches.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => setContact(m)}
                          style={{ width: "100%", textAlign: "left", padding: "6px 10px", background: "transparent", border: "none", color: "var(--ui-text)", cursor: "pointer", fontSize: 14 }}
                        >
                          {m.name}{m.company_name ? ` - ${m.company_name}` : ""}{m.email ? ` (${m.email})` : ""}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field name="Details">
            <textarea aria-label="Details" rows={4} style={{ ...input, minHeight: 90 }} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </Field>
        </div>
        {error ? <p role="alert" style={{ color: "var(--ui-text-danger)", margin: "8px 0 0" }}>{error}</p> : null}
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <Button kind="primary" type="submit" disabled={saving}>{saving ? "Opening..." : "Open ticket"}</Button>
          <Button onClick={onDone}>Cancel</Button>
        </div>
      </form>
    </Section>
  );
}

export default function KsSupportQueue({ isAdmin }: { isAdmin: boolean }) {
  const [filters, setFilters] = useState<TicketFilters>({ status: "active" });
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState<KsSupportTicket[]>([]);
  const [staff, setStaff] = useState<KsStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (f: TicketFilters) => {
    setLoading(true);
    setError(null);
    try {
      setTickets(await ksSupportApi.tickets(f));
    } catch (e) {
      setError(apiErrorText(e, "Could not load the support queue."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load({ ...filters, q: search.trim() || undefined }), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, filters, search]);

  useEffect(() => {
    ksSupportApi.staff().then(setStaff).catch(() => setStaff([]));
  }, []);

  const set = (k: keyof TicketFilters) => (e: { target: { value: string } }) => setFilters((f) => ({ ...f, [k]: e.target.value || undefined }));
  const overdue = tickets.filter((t) => t.sla_state === "overdue").length;

  return (
    <div style={{ padding: "16px 24px" }} data-testid="ks-support-queue">
      <PageTitle
        actions={
          <>
            <StartDemoButton />
            {isAdmin ? <Link to={`${SUPPORT_BASE}/phone`} style={{ ...linkStyle, alignSelf: "center" }}>Phone line settings</Link> : null}
            <Button kind="primary" onClick={() => setCreating(true)} testId="ks-new-ticket-button">New ticket</Button>
          </>
        }
      >
        Keystone support
      </PageTitle>
      {creating ? <NewTicketForm staff={staff} onDone={() => { setCreating(false); void load({ ...filters, q: search.trim() || undefined }); }} /> : null}
      <Section title={overdue ? `Queue - ${overdue} overdue` : "Queue"}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 12 }}>
          <Field name="Status">
            <select aria-label="Status" style={input} value={filters.status ?? ""} onChange={set("status")}>
              <option value="active">Active (new, open, waiting)</option>
              {KS_TICKET_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              <option value="all">All</option>
            </select>
          </Field>
          <Field name="Assignee">
            <select aria-label="Assignee" style={input} value={filters.assignee ?? ""} onChange={set("assignee")}>
              <option value="">Anyone</option>
              <option value="me">Me</option>
              <option value="unassigned">Unassigned</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field name="Priority">
            <select aria-label="Priority filter" style={input} value={filters.priority ?? ""} onChange={set("priority")}>
              <option value="">Any</option>
              {KS_TICKET_PRIORITIES.map((p) => <option key={p} value={p}>{label(p)}</option>)}
            </select>
          </Field>
          <Field name="Channel">
            <select aria-label="Channel filter" style={input} value={filters.channel ?? ""} onChange={set("channel")}>
              <option value="">Any</option>
              {KS_TICKET_CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
          <Field name="Search">
            <input aria-label="Search tickets" placeholder="Subject, licensee, contact, #1001" style={input} value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>
        </div>
        {error ? <p role="alert" style={{ color: "var(--ui-text-danger)" }}>{error}</p> : null}
        {loading && !tickets.length ? <p style={{ color: "var(--ui-text-muted)" }}>Loading tickets...</p> : (
          <Table head={["#", "Subject", "Licensee / contact", "Channel", "Priority", "Status", "Assignee", "SLA", "Last activity"]} empty={!tickets.length}>
            {tickets.map((t) => (
              <tr key={t.id} data-testid="ks-ticket-row">
                <td style={td}>{t.number}</td>
                <td style={td}><Link to={`${SUPPORT_BASE}/${t.id}`} style={linkStyle}>{t.subject}</Link></td>
                <td style={td}>
                  <div>{t.company_name ?? "-"}</div>
                  <div style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>{t.contact_name ?? t.from_name ?? t.from_email ?? t.from_phone ?? ""}</div>
                </td>
                <td style={td}>{channelLabel(t.channel)}</td>
                <td style={td}><Badge value={t.priority} /></td>
                <td style={td}><StatusBadge status={t.status} text={t.status_label} /></td>
                <td style={td}>{t.assignee_name ?? "Unassigned"}</td>
                <td style={td}><SlaBadge state={t.sla_state} due={t.sla_due_at} /></td>
                <td style={td}>{date(t.last_message_at, true)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </div>
  );
}
