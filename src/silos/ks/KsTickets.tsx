// BF_PORTAL_v849_KS_SILO - Keystone support inbox: GET /api/ops/tickets (?status=&licensee_id=), POST /api/ops/tickets.
// KS-Ops filters by status and licensee; the priority filter is applied here.
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KS_PRIORITIES, KS_TICKET_STATUSES, ksApi, KsOpsError } from "./ksApi";
import { Badge, Button, date, ErrorBox, Field, input, label, linkStyle, Loading, PageTitle, Section, Table, td } from "./ksUi";

function NewTicketForm({ onDone, licenseeId }: { onDone: () => void; licenseeId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const licensees = useQuery({ queryKey: ["ks", "licensees", "", ""], queryFn: () => ksApi.licensees() });
  const [form, setForm] = useState({ licensee_id: licenseeId, subject: "", body: "", priority: "normal", requester_name: "", requester_email: "" });
  const create = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { subject: form.subject, body: form.body, priority: form.priority };
      if (form.licensee_id) body.licensee_id = form.licensee_id;
      if (form.requester_name.trim()) body.requester_name = form.requester_name.trim();
      if (form.requester_email.trim()) body.requester_email = form.requester_email.trim();
      return ksApi.createTicket(body);
    },
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["ks", "tickets"] });
      void qc.invalidateQueries({ queryKey: ["ks", "dashboard"] });
      navigate(`/silo/ks/tickets/${r.ticket.id}`);
    },
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fieldErr = (k: string) =>
    create.error instanceof KsOpsError && create.error.fieldErrors[k] ? (
      <span style={{ color: "var(--ui-text-danger)", fontWeight: 400 }}>{create.error.fieldErrors[k]}</span>
    ) : null;

  return (
    <Section title="New ticket">
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          <Field name="Licensee">
            <select aria-label="Licensee" style={input} value={form.licensee_id} onChange={set("licensee_id")}>
              <option value="">No licensee</option>
              {(licensees.data?.licensees ?? []).map((l) => <option key={l.id} value={l.id}>{l.company_name} ({l.company_code})</option>)}
            </select>
            {fieldErr("licensee_id")}
          </Field>
          <Field name="Priority">
            <select aria-label="Priority" style={input} value={form.priority} onChange={set("priority")}>
              {KS_PRIORITIES.map((p) => <option key={p} value={p}>{label(p)}</option>)}
            </select>
          </Field>
          <Field name="Requester name">
            <input aria-label="Requester name" style={input} value={form.requester_name} onChange={set("requester_name")} />
          </Field>
          <Field name="Requester email">
            <input aria-label="Requester email" style={input} value={form.requester_email} onChange={set("requester_email")} />
            {fieldErr("requester_email")}
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field name="Subject">
            <input aria-label="Subject" style={input} value={form.subject} onChange={set("subject")} />
            {fieldErr("subject")}
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field name="Details (kept as an internal note)">
            <textarea aria-label="Details" style={{ ...input, minHeight: 100 }} value={form.body} onChange={set("body")} />
            {fieldErr("body")}
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>{create.error ? <ErrorBox error={create.error} /> : null}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="submit" kind="primary" disabled={create.isPending}>{create.isPending ? "Creating..." : "Create ticket"}</Button>
          <Button onClick={onDone}>Cancel</Button>
        </div>
      </form>
    </Section>
  );
}

export default function KsTickets() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const priority = params.get("priority") ?? "";
  const licenseeId = params.get("licensee_id") ?? "";
  const [creating, setCreating] = useState(false);
  const list = useQuery({
    queryKey: ["ks", "tickets", status, licenseeId],
    queryFn: () => ksApi.tickets({ status, licensee_id: licenseeId }),
  });
  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };
  const rows = (list.data?.tickets ?? []).filter((t) => !priority || t.priority === priority);

  return (
    <div>
      <PageTitle actions={!creating ? <Button kind="primary" onClick={() => setCreating(true)}>New ticket</Button> : null}>Support tickets</PageTitle>
      {creating ? <NewTicketForm onDone={() => setCreating(false)} licenseeId={licenseeId} /> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        <select aria-label="Ticket status filter" style={input} value={status} onChange={(e) => setParam("status", e.target.value)}>
          <option value="">All statuses</option>
          {KS_TICKET_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <select aria-label="Ticket priority filter" style={input} value={priority} onChange={(e) => setParam("priority", e.target.value)}>
          <option value="">All priorities</option>
          {KS_PRIORITIES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        {licenseeId ? <Button onClick={() => setParam("licensee_id", "")}>Show every licensee</Button> : null}
      </div>
      {list.isLoading ? <Loading what="tickets" /> : null}
      {list.error ? <ErrorBox error={list.error} /> : null}
      {list.data ? (
        <Table head={["Subject", "Licensee", "Status", "Priority", "Assigned", "Messages", "Updated"]} empty={!rows.length}>
          {rows.map((t) => (
            <tr key={t.id}>
              <td style={td}><Link to={`/silo/ks/tickets/${t.id}`} style={linkStyle}>{t.subject}</Link></td>
              <td style={td}>{t.company_name ? `${t.company_name} (${t.company_code})` : "-"}</td>
              <td style={td}><Badge value={t.status} /></td>
              <td style={td}><Badge value={t.priority} /></td>
              <td style={td}>{t.assigned_to ?? "-"}</td>
              <td style={td}>{t.message_count ?? 0}</td>
              <td style={td}>{date(t.last_message_at ?? t.updated_at, true)}</td>
            </tr>
          ))}
        </Table>
      ) : null}
    </div>
  );
}
