// BF_PORTAL_v849_KS_SILO - Keystone licensees: GET /api/ops/licensees (?status=&q=), POST /api/ops/licensees.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KS_BILLING_INTERVALS, KS_LICENSEE_STATUSES, KS_PLANS, KS_SUPPORT_LEVELS, ksApi, KsOpsError } from "./ksApi";
import { Badge, Button, ErrorBox, Field, input, label, linkStyle, Loading, money, PageTitle, Section, Table, td } from "./ksUi";
import { OpsKeyNotice } from "./KsOpsKeyNotice";

const EMPTY_FORM: Record<string, string> = {
  company_name: "",
  legal_name: "",
  company_code: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  plan: "starter",
  billing_interval: "monthly",
  support_level: "email",
  seats: "1",
  country: "CA",
  province_state: "",
  server_url: "",
  portal_url: "",
  client_url: "",
};

const TEXT_FIELDS: Array<[string, string]> = [
  ["company_name", "Company name"],
  ["legal_name", "Legal name"],
  ["company_code", "Company code"],
  ["contact_name", "Contact name"],
  ["contact_email", "Contact email"],
  ["contact_phone", "Contact phone"],
  ["province_state", "Province / state"],
  ["server_url", "Server address"],
  ["portal_url", "Staff portal address"],
  ["client_url", "Client app address"],
];

function NewLicenseeForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>(EMPTY_FORM);
  const create = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {};
      Object.entries(form).forEach(([k, v]) => {
        if (v.trim() !== "") body[k] = k === "seats" ? Number(v) : v.trim();
      });
      return ksApi.createLicensee(body);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["ks", "licensees"] }),
  });
  const fieldErr = (k: string) =>
    create.error instanceof KsOpsError && create.error.fieldErrors[k] ? (
      <span style={{ color: "var(--ui-text-danger)", fontWeight: 400 }}>{create.error.fieldErrors[k]}</span>
    ) : null;
  const set = (k: string) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (create.data) {
    return (
      <Section title="Licensee created">
        <p style={{ marginTop: 0 }}>
          <Link to={`/silo/ks/licensees/${create.data.licensee.id}`} style={linkStyle}>{create.data.licensee.company_name}</Link> was created
          as {label(create.data.licensee.status)}.
        </p>
        {create.data.ops_key ? <OpsKeyNotice opsKey={create.data.ops_key} message={create.data.message} /> : <p>{create.data.message}</p>}
        <Button onClick={onDone}>Close</Button>
      </Section>
    );
  }

  return (
    <Section title="New licensee">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {TEXT_FIELDS.map(([k, name]) => (
            <Field key={k} name={name}>
              <input aria-label={name} style={input} value={form[k] ?? ""} onChange={set(k)} />
              {fieldErr(k)}
            </Field>
          ))}
          <Field name="Plan">
            <select aria-label="Plan" style={input} value={form.plan} onChange={set("plan")}>
              {KS_PLANS.map((p) => <option key={p} value={p}>{label(p)}</option>)}
            </select>
            {fieldErr("plan")}
          </Field>
          <Field name="Billing">
            <select aria-label="Billing" style={input} value={form.billing_interval} onChange={set("billing_interval")}>
              {KS_BILLING_INTERVALS.map((p) => <option key={p} value={p}>{label(p)}</option>)}
            </select>
          </Field>
          <Field name="Support">
            <select aria-label="Support" style={input} value={form.support_level} onChange={set("support_level")}>
              {KS_SUPPORT_LEVELS.map((p) => <option key={p} value={p}>{label(p)}</option>)}
            </select>
          </Field>
          <Field name="Seats">
            <input aria-label="Seats" type="number" min={1} style={input} value={form.seats} onChange={set("seats")} />
            {fieldErr("seats")}
          </Field>
          <Field name="Country">
            <select aria-label="Country" style={input} value={form.country} onChange={set("country")}>
              <option value="CA">Canada</option>
              <option value="US">United States</option>
            </select>
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>{create.error ? <ErrorBox error={create.error} /> : null}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="submit" kind="primary" disabled={create.isPending}>{create.isPending ? "Creating..." : "Create licensee"}</Button>
          <Button onClick={onDone}>Cancel</Button>
        </div>
        <p style={{ fontSize: 13, color: "var(--ui-text-muted)", marginBottom: 0 }}>
          A new licensee starts as Pending payment and gets an ops key, shown once.
        </p>
      </form>
    </Section>
  );
}

export default function KsLicensees() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const [q, setQ] = useState(params.get("q") ?? "");
  const [creating, setCreating] = useState(false);
  const appliedQ = params.get("q") ?? "";
  const list = useQuery({
    queryKey: ["ks", "licensees", status, appliedQ],
    queryFn: () => ksApi.licensees({ status, q: appliedQ }),
  });

  const update = (next: { status?: string; q?: string }) => {
    const p = new URLSearchParams(params);
    if (next.status !== undefined) (next.status ? p.set("status", next.status) : p.delete("status"));
    if (next.q !== undefined) (next.q ? p.set("q", next.q) : p.delete("q"));
    setParams(p, { replace: true });
  };

  const rows = list.data?.licensees ?? [];

  return (
    <div>
      <PageTitle actions={!creating ? <Button kind="primary" onClick={() => setCreating(true)}>New licensee</Button> : null}>
        Licensees
      </PageTitle>
      {creating ? <NewLicenseeForm onDone={() => setCreating(false)} /> : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: q.trim() });
        }}
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}
      >
        <input aria-label="Search licensees" placeholder="Company, code or contact email" style={{ ...input, minWidth: 260 }} value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Status filter" style={input} value={status} onChange={(e) => update({ status: e.target.value })}>
          <option value="">All statuses</option>
          {KS_LICENSEE_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <Button type="submit">Search</Button>
      </form>
      {list.isLoading ? <Loading what="licensees" /> : null}
      {list.error ? <ErrorBox error={list.error} /> : null}
      {list.data ? (
        <Table head={["Company", "Code", "Plan", "Seats", "Status", "MRR", "Last usage report", "Plan sync"]} empty={!rows.length}>
          {rows.map((l) => (
            <tr key={l.id}>
              <td style={td}><Link to={`/silo/ks/licensees/${l.id}`} style={linkStyle}>{l.company_name}</Link></td>
              <td style={td}>{l.company_code}</td>
              <td style={td}>{label(l.plan)} ({l.billing_interval})</td>
              <td style={td}>{l.seats}</td>
              <td style={td}><Badge value={l.status} /></td>
              <td style={td}>{money(l.mrr)}</td>
              <td style={td}>{l.last_report ? `${l.last_report.period}: ${l.last_report.seats} seats, ${l.last_report.minutes} min, ${l.last_report.texts} texts` : "-"}</td>
              <td style={td}><Badge value={l.plan_sync_status} /></td>
            </tr>
          ))}
        </Table>
      ) : null}
    </div>
  );
}
