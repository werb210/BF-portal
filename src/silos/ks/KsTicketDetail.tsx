// BF_PORTAL_v849_KS_SILO - one Keystone support ticket: GET/PATCH /api/ops/tickets/:id, POST /api/ops/tickets/:id/messages.
// A reply that is not internal is emailed by KS-Ops to the requester (when the ticket has a requester email).
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { currentKsUser, KS_PRIORITIES, KS_TICKET_STATUSES, ksApi } from "./ksApi";
import { Badge, Button, card, date, ErrorBox, Field, input, KeyValues, label, linkStyle, Loading, PageTitle, Section } from "./ksUi";

export default function KsTicketDetail() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const detail = useQuery({ queryKey: ["ks", "ticket", id], queryFn: () => ksApi.ticket(id), enabled: Boolean(id) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["ks", "ticket", id] });
    void qc.invalidateQueries({ queryKey: ["ks", "tickets"] });
    void qc.invalidateQueries({ queryKey: ["ks", "dashboard"] });
  };
  const patch = useMutation({ mutationFn: (body: Record<string, unknown>) => ksApi.updateTicket(id, body), onSuccess: refresh });
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [afterStatus, setAfterStatus] = useState("");
  const [assignee, setAssignee] = useState<string | null>(null);
  const send = useMutation({
    mutationFn: () => ksApi.replyTicket(id, { body: reply, internal, ...(afterStatus ? { status: afterStatus } : {}) }),
    onSuccess: () => {
      setReply("");
      setAfterStatus("");
      refresh();
    },
  });

  if (detail.isLoading) return <Loading what="the ticket" />;
  if (detail.error || !detail.data) return <ErrorBox error={detail.error ?? new Error("Ticket not found.")} />;
  const { ticket: t, messages } = detail.data;
  const me = currentKsUser();
  const assignValue = assignee ?? t.assigned_to ?? "";

  return (
    <div>
      <p style={{ margin: "0 0 8px" }}><Link to="/silo/ks/tickets" style={linkStyle}>Back to tickets</Link></p>
      <PageTitle actions={<><Badge value={t.status} /><Badge value={t.priority} /></>}>{t.subject}</PageTitle>

      <Section title="Ticket">
        <KeyValues
          rows={[
            ["Licensee", t.licensee_id ? <Link key="l" to={`/silo/ks/licensees/${t.licensee_id}`} style={linkStyle}>{t.company_name} ({t.company_code})</Link> : "-"],
            ["Requester", [t.requester_name, t.requester_email].filter(Boolean).join(", ") || "-"],
            ["Source", label(t.source)],
            ["Opened", date(t.created_at, true)],
          ]}
        />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}>
          <Field name="Status">
            <select aria-label="Ticket status" style={input} value={t.status} disabled={patch.isPending} onChange={(e) => patch.mutate({ status: e.target.value })}>
              {KS_TICKET_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          </Field>
          <Field name="Priority">
            <select aria-label="Ticket priority" style={input} value={t.priority} disabled={patch.isPending} onChange={(e) => patch.mutate({ priority: e.target.value })}>
              {KS_PRIORITIES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          </Field>
          <Field name="Assigned to">
            <input aria-label="Assigned to" style={input} value={assignValue} onChange={(e) => setAssignee(e.target.value)} placeholder="Name or email" />
          </Field>
          <Button disabled={patch.isPending} onClick={() => patch.mutate({ assigned_to: assignValue.trim() || null })}>Save assignee</Button>
          {me?.email ? <Button disabled={patch.isPending} onClick={() => { setAssignee(me.email ?? ""); patch.mutate({ assigned_to: me.email }); }}>Assign to me</Button> : null}
        </div>
        {patch.error ? <div style={{ marginTop: 12 }}><ErrorBox error={patch.error} /></div> : null}
      </Section>

      <Section title={`Conversation (${messages.length})`}>
        {messages.map((m) => (
          <div
            key={m.id}
            data-testid="ks-ticket-message"
            style={{ ...card, marginBottom: 10, padding: 12, background: m.author_type === "staff" ? "var(--ui-surface)" : "var(--ui-surface-strong)" }}
          >
            <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 4 }}>
              {m.author_type === "staff" ? "Keystone staff" : "Licensee"} - {m.author_name ?? m.author_email ?? "unknown"} - {date(m.created_at, true)}
              {m.internal ? <strong style={{ marginLeft: 8, color: "var(--ui-text)" }}>Internal note</strong> : null}
            </div>
            <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
          </div>
        ))}
        {!messages.length ? <p style={{ marginTop: 0, color: "var(--ui-text-muted)" }}>No messages yet.</p> : null}

        <form onSubmit={(e) => { e.preventDefault(); if (reply.trim()) send.mutate(); }} style={{ marginTop: 12 }}>
          <Field name={internal ? "Internal note (not emailed)" : "Reply (emailed to the requester)"}>
            <textarea aria-label="Reply" style={{ ...input, minHeight: 100 }} value={reply} onChange={(e) => setReply(e.target.value)} />
          </Field>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 14 }}>
              <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note
            </label>
            <select aria-label="Status after reply" style={input} value={afterStatus} onChange={(e) => setAfterStatus(e.target.value)}>
              <option value="">Keep status</option>
              {KS_TICKET_STATUSES.map((s) => <option key={s} value={s}>Then set {label(s)}</option>)}
            </select>
            <Button type="submit" kind="primary" disabled={!reply.trim() || send.isPending}>{send.isPending ? "Sending..." : internal ? "Add note" : "Send reply"}</Button>
          </div>
          {!internal && !t.requester_email ? (
            <p style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>This ticket has no requester email, so the reply is saved but not emailed.</p>
          ) : null}
          {send.error ? <div style={{ marginTop: 12 }}><ErrorBox error={send.error} /></div> : null}
          {send.data ? (
            <p role="status">{send.data.message.internal ? "Note added." : send.data.emailed ? "Reply sent by email." : "Reply saved (not emailed)."}</p>
          ) : null}
        </form>
      </Section>
    </div>
  );
}
