// BF_PORTAL_v849_KS_SILO - one Keystone licensee: GET/PATCH /api/ops/licensees/:id and its actions (ops key, usage
// sync, invoice preview, Stripe Checkout link, PGI link, notes, data purge).
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KS_BILLING_INTERVALS, KS_LICENSEE_STATUSES, KS_PLANS, KS_SUPPORT_LEVELS, ksApi, KsOpsError,
  type KsLicensee, type KsLicenseeDetail as Detail,
} from "./ksApi";
import {
  Badge, Button, cents, confirmAction, date, ErrorBox, Field, input, KeyValues, label, linkStyle, Loading, money,
  PageTitle, Section, Table, td,
} from "./ksUi";
import { OpsKeyNotice } from "./KsOpsKeyNotice";

type FieldSpec = { key: keyof KsLicensee & string; name: string; kind: "text" | "number" | "select" | "bool"; options?: readonly string[] };

const PLAN_FIELDS: FieldSpec[] = [
  { key: "status", name: "Status", kind: "select", options: KS_LICENSEE_STATUSES },
  { key: "plan", name: "Plan", kind: "select", options: KS_PLANS },
  { key: "billing_interval", name: "Billing", kind: "select", options: KS_BILLING_INTERVALS },
  { key: "support_level", name: "Support", kind: "select", options: KS_SUPPORT_LEVELS },
  { key: "seats", name: "Seats", kind: "number" },
  { key: "extra_storage_blocks", name: "Extra storage (50 GB blocks)", kind: "number" },
  { key: "onboarding_fee_paid", name: "Onboarding fee paid", kind: "bool" },
];

const CONTACT_FIELDS: FieldSpec[] = [
  { key: "company_name", name: "Company name", kind: "text" },
  { key: "legal_name", name: "Legal name", kind: "text" },
  { key: "contact_name", name: "Contact name", kind: "text" },
  { key: "contact_email", name: "Contact email", kind: "text" },
  { key: "contact_phone", name: "Contact phone", kind: "text" },
  { key: "website", name: "Website", kind: "text" },
  { key: "server_url", name: "Server address", kind: "text" },
  { key: "portal_url", name: "Staff portal address", kind: "text" },
  { key: "client_url", name: "Client app address", kind: "text" },
];

function valueOf(l: KsLicensee, f: FieldSpec): string {
  const v = (l as Record<string, unknown>)[f.key];
  if (f.kind === "bool") return v ? "true" : "false";
  return v === null || v === undefined ? "" : String(v);
}

function EditForm({ licensee, fields, title, note }: { licensee: KsLicensee; fields: FieldSpec[]; title: string; note?: string }) {
  const qc = useQueryClient();
  const initial = Object.fromEntries(fields.map((f) => [f.key, valueOf(licensee, f)]));
  const [form, setForm] = useState<Record<string, string>>(initial);
  const changed = fields.filter((f) => (form[f.key] ?? "") !== (initial[f.key] ?? ""));
  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {};
      changed.forEach((f) => {
        const v = form[f.key] ?? "";
        body[f.key] = f.kind === "number" ? Number(v) : f.kind === "bool" ? v === "true" : v.trim() === "" ? null : v.trim();
      });
      return ksApi.updateLicensee(licensee.id, body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ks", "licensee", licensee.id] });
      void qc.invalidateQueries({ queryKey: ["ks", "licensees"] });
      void qc.invalidateQueries({ queryKey: ["ks", "dashboard"] });
    },
  });
  const fieldErr = (k: string) =>
    save.error instanceof KsOpsError && save.error.fieldErrors[k] ? (
      <span style={{ color: "var(--ui-text-danger)", fontWeight: 400 }}>{save.error.fieldErrors[k]}</span>
    ) : null;

  return (
    <Section title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!changed.length) return;
          const lines = changed.map((f) => `${f.name}: ${initial[f.key] || "(blank)"} -> ${form[f.key] || "(blank)"}`).join("\n");
          if (confirmAction(`Save these changes to ${licensee.company_name}?\n\n${lines}`)) save.mutate();
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {fields.map((f) => (
            <Field key={f.key} name={f.name}>
              {f.kind === "select" || f.kind === "bool" ? (
                <select aria-label={f.name} style={input} value={form[f.key] ?? ""} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}>
                  {(f.kind === "bool" ? ["true", "false"] : f.options ?? []).map((o) => (
                    <option key={o} value={o}>{f.kind === "bool" ? (o === "true" ? "Yes" : "No") : label(o)}</option>
                  ))}
                </select>
              ) : (
                <input
                  aria-label={f.name}
                  type={f.kind === "number" ? "number" : "text"}
                  style={input}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                />
              )}
              {fieldErr(f.key)}
            </Field>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>{save.error ? <ErrorBox error={save.error} /> : null}</div>
        {save.data ? (
          <p role="status" style={{ marginTop: 0 }}>
            Saved.
            {save.data.plan_push ? (save.data.plan_push.ok ? " The plan was sent to the licensee's server." : ` The licensee's server did not take the plan yet (${save.data.plan_push.error ?? "error"}); it will be retried.`) : ""}
            {save.data.billing_sync ? ` Stripe: ${label(save.data.billing_sync)}.` : ""}
          </p>
        ) : null}
        <Button type="submit" kind="primary" disabled={!changed.length || save.isPending}>
          {save.isPending ? "Saving..." : changed.length ? `Save ${changed.length} change${changed.length === 1 ? "" : "s"}` : "No changes"}
        </Button>
        {note ? <p style={{ fontSize: 13, color: "var(--ui-text-muted)", marginBottom: 0 }}>{note}</p> : null}
      </form>
    </Section>
  );
}

function Actions({ l }: { l: KsLicensee }) {
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ["ks", "licensee", l.id] });
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const rotate = useMutation({ mutationFn: () => ksApi.rotateOpsKey(l.id), onSuccess: refresh });
  const sync = useMutation({ mutationFn: () => ksApi.syncUsage(l.id, period), onSuccess: refresh });
  const preview = useMutation({ mutationFn: () => ksApi.invoicePreview(l.id, period) });
  const checkout = useMutation({ mutationFn: () => ksApi.billingCheckout(l.id), onSuccess: refresh });
  const pgi = useMutation({ mutationFn: () => ksApi.pgiLink(l.id), onSuccess: refresh });
  const purge = useMutation({ mutationFn: () => ksApi.markPurged(l.id), onSuccess: refresh });
  const bankConnect = Boolean(l.addons?.bank_connect);
  const addon = useMutation({
    mutationFn: (on: boolean) => ksApi.updateLicensee(l.id, { addons: { bank_connect: on } }),
    onSuccess: refresh,
  });
  const today = new Date().toISOString().slice(0, 10);
  const canPurge = l.status === "cancelled" && !l.purged_at && Boolean(l.data_purge_on) && String(l.data_purge_on) <= today;
  const errors = [rotate.error, sync.error, preview.error, checkout.error, pgi.error, purge.error, addon.error].filter(Boolean);

  return (
    <Section title="Actions">
      {rotate.data ? <OpsKeyNotice opsKey={rotate.data.ops_key} message={rotate.data.message} /> : null}
      {errors.map((e, i) => <ErrorBox key={i} error={e} />)}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <Button
          testId="ks-rotate-key"
          disabled={rotate.isPending}
          onClick={() => {
            if (confirmAction(`Make a new ops key for ${l.company_name}? The old key stops working at once; the new key must be set as KS_OPS_KEY on the licensee's server.`)) rotate.mutate();
          }}
        >
          Rotate ops key
        </Button>
        <Button
          disabled={addon.isPending}
          onClick={() => {
            if (confirmAction(`${bankConnect ? "Turn OFF" : "Turn ON"} the Bank connect add-on for ${l.company_name}? This is pushed to their server.`)) addon.mutate(!bankConnect);
          }}
        >
          Bank connect add-on: {bankConnect ? "On (turn off)" : "Off (turn on)"}
        </Button>
        <Button disabled={checkout.isPending} onClick={() => { if (confirmAction("Create a Stripe Checkout link for this licensee's subscription?")) checkout.mutate(); }}>
          Stripe Checkout link
        </Button>
        <Button disabled={pgi.isPending} onClick={() => pgi.mutate()}>Link to PGI now</Button>
        {canPurge ? (
          <Button kind="danger" disabled={purge.isPending} onClick={() => { if (confirmAction(`Mark ${l.company_name}'s data as purged? This cannot be undone and the licensee can never be reopened.`)) purge.mutate(); }}>
            Mark data purged
          </Button>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <Field name="Month">
          <input aria-label="Month" style={input} value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-10" />
        </Field>
        <Button disabled={sync.isPending} onClick={() => sync.mutate()}>Pull usage report now</Button>
        <Button disabled={preview.isPending} onClick={() => preview.mutate()}>Invoice preview</Button>
      </div>
      {sync.data ? <p role="status">Usage report pulled{sync.data.stored ? " and stored" : " (the stored one was newer)"}.</p> : null}
      {pgi.data ? <p role="status">PGI link: {label(pgi.data.action)}.</p> : null}
      {checkout.data ? (
        <p role="status">
          Checkout link: <a href={checkout.data.url} target="_blank" rel="noreferrer" style={linkStyle}>{checkout.data.url}</a>
        </p>
      ) : null}
      {preview.data ? (
        <div style={{ marginTop: 12 }}>
          <Table head={["Invoice preview " + preview.data.period, "Qty", "Unit", "Amount"]} empty={!preview.data.lines.length}>
            {preview.data.lines.map((ln, i) => (
              <tr key={i}>
                <td style={td}>{ln.description}</td>
                <td style={td}>{ln.quantity}</td>
                <td style={td}>{money(ln.unit_amount, preview.data.currency)}</td>
                <td style={td}>{money(ln.amount, preview.data.currency)}</td>
              </tr>
            ))}
          </Table>
          <p style={{ marginBottom: 0 }}>
            Recurring {money(preview.data.recurring, preview.data.currency)}, overage {money(preview.data.overage, preview.data.currency)},
            total <strong>{money(preview.data.total, preview.data.currency)}</strong>.
          </p>
        </div>
      ) : null}
    </Section>
  );
}

function Notes({ id, notes }: { id: string; notes: Detail["notes"] }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const add = useMutation({
    mutationFn: () => ksApi.addNote(id, body),
    onSuccess: () => {
      setBody("");
      void qc.invalidateQueries({ queryKey: ["ks", "licensee", id] });
    },
  });
  return (
    <Section title="Notes">
      <form onSubmit={(e) => { e.preventDefault(); if (body.trim()) add.mutate(); }} style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <textarea aria-label="New note" style={{ ...input, flex: 1, minWidth: 240, minHeight: 60 }} value={body} onChange={(e) => setBody(e.target.value)} />
        <Button type="submit" kind="primary" disabled={!body.trim() || add.isPending}>Add note</Button>
      </form>
      {add.error ? <ErrorBox error={add.error} /> : null}
      {notes.length ? notes.map((n) => (
        <div key={n.id} style={{ borderTop: "1px solid var(--ui-border)", padding: "8px 0" }}>
          <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{n.author} - {date(n.created_at, true)}</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{n.body}</div>
        </div>
      )) : <p style={{ margin: 0, color: "var(--ui-text-muted)" }}>No notes yet.</p>}
    </Section>
  );
}

function short(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 240 ? `${s.slice(0, 240)}...` : s;
}

export default function KsLicenseeDetail() {
  const { id = "" } = useParams();
  const detail = useQuery({ queryKey: ["ks", "licensee", id], queryFn: () => ksApi.licensee(id), enabled: Boolean(id) });

  if (detail.isLoading) return <Loading what="the licensee" />;
  if (detail.error || !detail.data) return <ErrorBox error={detail.error ?? new Error("Licensee not found.")} />;
  const { licensee: l, pricing, usage, invoices, tickets, requests, audit, notes, plan_changes } = detail.data;

  return (
    <div>
      <p style={{ margin: "0 0 8px" }}><Link to="/silo/ks/licensees" style={linkStyle}>Back to licensees</Link></p>
      <PageTitle actions={<Badge value={l.status} />}>
        {l.company_name} <span style={{ fontWeight: 400, color: "var(--ui-text-muted)", fontSize: 16 }}>({l.company_code})</span>
      </PageTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <Section title="Account">
          <KeyValues
            rows={[
              ["Legal name", l.legal_name],
              ["Plan", `${label(l.plan)} (${l.billing_interval}), ${label(l.support_level)} support`],
              ["Seats", `${l.seats} (${pricing.billable_seats} billable at ${money(pricing.seat_price)})`],
              ["Extra storage", `${l.extra_storage_blocks} x 50 GB`],
              ["MRR", money(pricing.mrr)],
              ["Onboarding fee", `${money(pricing.onboarding_fee)} - ${l.onboarding_fee_paid ? "paid" : "not paid"}`],
              ["Contact", `${l.contact_name}, ${l.contact_email}, ${l.contact_phone}`],
              ["Location", [l.mailing_address, l.province_state, l.country].filter(Boolean).join(", ")],
              ["Created", `${date(l.created_at)}${l.source ? ` (${l.source})` : ""}`],
              ["Cancelled", l.cancelled_at ? `${date(l.cancelled_at)} - data purge on ${l.data_purge_on ?? "-"}${l.purged_at ? `, purged ${date(l.purged_at)}` : ""}` : "-"],
            ]}
          />
        </Section>
        <Section title="Billing and connections">
          <KeyValues
            rows={[
              ["Stripe customer", l.stripe_customer_id ?? "None yet"],
              ["Stripe subscription", l.stripe_subscription_id ?? "None yet"],
              ["Plan sync", <span key="ps"><Badge value={l.plan_sync_status} />{l.plan_sync_error ? ` ${l.plan_sync_error}` : ""}</span>],
              ["Ops key", l.has_ops_key ? `Set${l.ops_key_rotated_at ? `, rotated ${date(l.ops_key_rotated_at)}` : ""}` : "Not set"],
              ["PGI referral link", <span key="pgi"><Badge value={l.pgi_link_status ?? "pending"} />{l.pgi_link_error ? ` ${l.pgi_link_error}` : ""}</span>],
              ["Fraud watchlist", l.watchlist_opt_in ? "Sharing" : "Not sharing"],
              ["Bank connect add-on", l.addons?.bank_connect ? "On" : "Off"],
              ["Server", l.server_url ? <a key="s" href={l.server_url} target="_blank" rel="noreferrer" style={linkStyle}>{l.server_url}</a> : "-"],
              ["Staff portal", l.portal_url ? <a key="p" href={l.portal_url} target="_blank" rel="noreferrer" style={linkStyle}>{l.portal_url}</a> : "-"],
              ["Client app", l.client_url ? <a key="c" href={l.client_url} target="_blank" rel="noreferrer" style={linkStyle}>{l.client_url}</a> : "-"],
            ]}
          />
        </Section>
      </div>

      <Actions l={l} />
      <EditForm
        key={`plan-${l.id}-${l.plan}-${l.seats}-${l.status}-${l.billing_interval}-${l.support_level}-${l.extra_storage_blocks}-${String(l.onboarding_fee_paid)}`}
        licensee={l}
        fields={PLAN_FIELDS}
        title="Plan, seats and status"
        note="Plan, storage, add-on and live status changes are pushed to the licensee's server; plan, billing, seat, support and storage changes also update the Stripe subscription."
      />
      <EditForm key={`contact-${l.id}-${l.contact_email}-${l.server_url}-${l.portal_url}-${l.client_url}-${l.company_name}`} licensee={l} fields={CONTACT_FIELDS} title="Company, contact and addresses" />

      <Section title="Usage reports">
        <Table head={["Month", "Seats", "Minutes", "Texts", "Assistant chats", "Storage (GB)", "Overage min / texts", "Final"]} empty={!usage.length}>
          {usage.map((u) => (
            <tr key={u.period}>
              <td style={td}>{u.period}</td>
              <td style={td}>{u.seats}</td>
              <td style={td}>{u.minutes}</td>
              <td style={td}>{u.texts}</td>
              <td style={td}>{u.assistant_chats ?? "-"}</td>
              <td style={td}>{u.storage_bytes !== undefined && u.storage_bytes !== null ? (Number(u.storage_bytes) / 1e9).toFixed(1) : "-"}</td>
              <td style={td}>{u.overage_minutes ?? 0} / {u.overage_texts ?? 0}</td>
              <td style={td}>{u.final ? "Yes" : "No"}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Invoices">
        <Table head={["Number", "Status", "Due", "Paid", "Due date", ""]} empty={!invoices.length}>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td style={td}>{inv.number ?? "-"}</td>
              <td style={td}><Badge value={inv.status ?? "-"} /></td>
              <td style={td}>{cents(inv.amount_due)}</td>
              <td style={td}>{cents(inv.amount_paid)}</td>
              <td style={td}>{date(inv.due_date)}</td>
              <td style={td}>{inv.hosted_invoice_url ? <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" style={linkStyle}>Open</a> : null}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Support tickets" actions={<Link to={`/silo/ks/tickets?licensee_id=${l.id}`} style={linkStyle}>All tickets for this licensee</Link>}>
        <Table head={["Subject", "Status", "Priority", "Updated"]} empty={!tickets.length}>
          {tickets.map((t) => (
            <tr key={t.id}>
              <td style={td}><Link to={`/silo/ks/tickets/${t.id}`} style={linkStyle}>{t.subject}</Link></td>
              <td style={td}><Badge value={t.status} /></td>
              <td style={td}><Badge value={t.priority} /></td>
              <td style={td}>{date(t.updated_at, true)}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Upgrade and storage requests">
        <Table head={["Kind", "Requested", "By", "Status", "Created"]} empty={!requests.length}>
          {requests.map((r) => (
            <tr key={r.id}>
              <td style={td}>{label(r.kind)}</td>
              <td style={td}>{r.requested_plan ? `${label(r.current_plan)} -> ${label(r.requested_plan)}` : ""}{r.requested_extra_storage_blocks ? ` ${r.requested_extra_storage_blocks} storage blocks` : ""}</td>
              <td style={td}>{r.requested_by ?? "-"}</td>
              <td style={td}><Badge value={r.status} /></td>
              <td style={td}>{date(r.created_at)}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Notes id={l.id} notes={notes} />

      <Section title="Plan changes">
        <Table head={["When", "Change"]} empty={!plan_changes.length}>
          {plan_changes.map((c) => {
            const { id: cid, created_at, licensee_id: _lid, ...rest } = c as Record<string, unknown> & { id: string; created_at: string };
            return (
              <tr key={cid}>
                <td style={td}>{date(created_at, true)}</td>
                <td style={{ ...td, fontSize: 13 }}>{short(rest)}</td>
              </tr>
            );
          })}
        </Table>
      </Section>

      <Section title="Audit log">
        <Table head={["When", "Who", "Action", "Details"]} empty={!audit.length}>
          {audit.map((a) => (
            <tr key={String(a.id)}>
              <td style={td}>{date(a.created_at, true)}</td>
              <td style={td}>{a.actor}</td>
              <td style={td}>{a.action}</td>
              <td style={{ ...td, fontSize: 13 }}>{short(a.details)}</td>
            </tr>
          ))}
        </Table>
      </Section>
    </div>
  );
}
