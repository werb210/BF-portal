// BF_PORTAL_v865_KS_MARKETING - Keystone prospects: the list (segment filters, who can be emailed and why not), add
// one, import a list (with the consent staff record for it), and the prospect page (details, consent, timeline,
// emails, sequences, Mark replied, suppress).
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, confirmAction, date, ErrorBox, Field, input, KeyValues, linkStyle, Loading, Section, Table, td } from "../ksUi";
import { SegmentFilterEditor, SenderWarnings } from "./KsMarketing";
import { cleanConsent, ConsentEditor, EligibilityBadge, fieldError, parseImport, today } from "./KsMktConsent";
import {
  BLOCK_LABELS, CONSENT_LABELS, KS_PLAN_INTEREST, KS_PROSPECT_STATUSES, mktApi, SOURCE_LABELS, STATUS_LABELS,
  type ConsentInput, type SegmentFilters,
} from "./ksMarketingApi";

export { EligibilityBadge, parseImport };

const BLANK = { email: "", name: "", company: "", phone: "", country: "", province_state: "", plan_interest: "" };

function AddProspect({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>(BLANK);
  const [consent, setConsent] = useState<ConsentInput>({ consent_type: "none", consent_at: today() });
  const add = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {};
      Object.entries(form).forEach(([k, v]) => {
        if (v.trim()) body[k] = v.trim();
      });
      if (consent.consent_type !== "none") body.consent = cleanConsent(consent);
      return mktApi.addProspect(body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ks", "mkt", "prospects"] });
      onDone();
    },
  });
  const set = (k: string) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <Section title="Add a prospect">
      <ErrorBox error={add.error} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 12 }}>
        {(["email", "name", "company", "phone"] as const).map((k) => (
          <Field key={k} name={k === "email" ? "Email" : k === "name" ? "Name" : k === "company" ? "Brokerage" : "Phone"}>
            <input style={input} value={form[k]} onChange={set(k)} aria-label={k} />
            {fieldError(add.error, k)}
          </Field>
        ))}
        <Field name="Country">
          <select style={input} value={form.country} onChange={set("country")} aria-label="Country">
            <option value="">-</option>
            <option value="CA">Canada</option>
            <option value="US">United States</option>
          </select>
        </Field>
        <Field name="Province / state">
          <input style={input} value={form.province_state} onChange={set("province_state")} placeholder="AB" />
        </Field>
        <Field name="Plan interest">
          <select style={input} value={form.plan_interest} onChange={set("plan_interest")}>
            <option value="">-</option>
            {KS_PLAN_INTEREST.map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </Field>
      </div>
      <ConsentEditor value={consent} onChange={setConsent} error={add.error} />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button kind="primary" onClick={() => add.mutate()} disabled={add.isPending || !(form.email ?? "").trim()}>Add prospect</Button>
        <Button onClick={onDone}>Cancel</Button>
      </div>
    </Section>
  );
}

function ImportProspects({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [consent, setConsent] = useState<ConsentInput>({ consent_type: "none", consent_at: today() });
  const rows = parseImport(text);
  const run = useMutation({
    mutationFn: () => mktApi.importProspects(rows, consent.consent_type === "none" ? null : cleanConsent(consent)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["ks", "mkt", "prospects"] }),
  });
  return (
    <Section title="Import prospects">
      <p style={{ marginTop: 0, fontSize: 14 }}>
        One per line: email, name, brokerage, country (CA or US), province or state, plan interest. Choose the consent that
        applies to everyone on the list; leave it as "No consent recorded" for a cold list (they are added but cannot be emailed).
      </p>
      <textarea
        aria-label="Prospects to import"
        style={{ ...input, width: "100%", minHeight: 140, fontFamily: "monospace" }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"jo@brokerage.example, Jo Smith, Smith Capital, CA, AB, growth"}
      />
      <div style={{ margin: "12px 0" }}>
        <ConsentEditor value={consent} onChange={setConsent} error={run.error} />
      </div>
      <ErrorBox error={run.error} />
      {run.data ? (
        <p role="status" style={{ fontSize: 14 }}>
          Added {run.data.added}, updated {run.data.updated}
          {run.data.skipped.length ? `, skipped ${run.data.skipped.length}: ${run.data.skipped.slice(0, 5).map((s) => `row ${s.row} (${s.error})`).join("; ")}` : ""}.
        </p>
      ) : null}
      <div style={{ display: "flex", gap: 8 }}>
        <Button kind="primary" onClick={() => run.mutate()} disabled={run.isPending || rows.length === 0}>
          Import {rows.length} prospect{rows.length === 1 ? "" : "s"}
        </Button>
        <Button onClick={onDone}>Close</Button>
      </div>
    </Section>
  );
}

export default function KsMktProspects() {
  const [filters, setFilters] = useState<SegmentFilters>({});
  const [eligible, setEligible] = useState<"" | "yes" | "no">("");
  const [panel, setPanel] = useState<"" | "add" | "import">("");
  const list = useQuery({ queryKey: ["ks", "mkt", "prospects", filters, eligible], queryFn: () => mktApi.prospects({ ...filters, eligible, limit: 200 }) });
  const rows = list.data?.prospects ?? [];
  return (
    <>
      <SenderWarnings compact />
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Button kind="primary" onClick={() => setPanel(panel === "add" ? "" : "add")}>Add prospect</Button>
        <Button onClick={() => setPanel(panel === "import" ? "" : "import")}>Import a list</Button>
      </div>
      {panel === "add" ? <AddProspect onDone={() => setPanel("")} /> : null}
      {panel === "import" ? <ImportProspects onDone={() => setPanel("")} /> : null}
      <Section title="Find prospects">
        <SegmentFilterEditor
          value={filters}
          onChange={setFilters}
          extra={
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600, color: "var(--ui-text-muted)" }}>
              Can be emailed
              <select style={input} value={eligible} onChange={(e) => setEligible(e.target.value as "" | "yes" | "no")}>
                <option value="">Everyone</option>
                <option value="yes">Yes</option>
                <option value="no">No (blocked)</option>
              </select>
            </label>
          }
        />
      </Section>
      <Section title={`Prospects${list.data ? ` (${list.data.total})` : ""}`}>
        {list.isLoading ? <Loading what="prospects" /> : null}
        <ErrorBox error={list.error} />
        {!list.isLoading && !list.error ? (
          <Table head={["Prospect", "Status", "Source", "Region", "Consent", "Email"]} empty={rows.length === 0}>
            {rows.map((p) => (
              <tr key={p.id} data-testid="ks-mkt-prospect-row">
                <td style={td}>
                  <Link to={`/silo/ks/marketing/prospects/${p.id}`} style={linkStyle}>{p.name || p.email}</Link>
                  <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{p.email}{p.company ? ` - ${p.company}` : ""}</div>
                </td>
                <td style={td}>{STATUS_LABELS[p.status] ?? p.status}</td>
                <td style={td}>{p.sources.map((s) => SOURCE_LABELS[s] ?? s).join(", ")}</td>
                <td style={td}>{[p.province_state, p.country].filter(Boolean).join(", ") || "-"}</td>
                <td style={td}>
                  {CONSENT_LABELS[p.consent_type] ?? p.consent_type}
                  {p.consent_expires_at ? <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>until {date(p.consent_expires_at)}</div> : null}
                </td>
                <td style={td}><EligibilityBadge e={p.eligibility} /></td>
              </tr>
            ))}
          </Table>
        ) : null}
      </Section>
    </>
  );
}

export function KsMktProspectDetail() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ks", "mkt", "prospect", id], queryFn: () => mktApi.prospect(id) });
  const [consent, setConsent] = useState<ConsentInput | null>(null);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["ks", "mkt", "prospect", id] });
    void qc.invalidateQueries({ queryKey: ["ks", "mkt", "prospects"] });
  };
  const update = useMutation({ mutationFn: (body: Record<string, unknown>) => mktApi.updateProspect(id, body), onSuccess: () => { setConsent(null); refresh(); } });
  const replied = useMutation({ mutationFn: () => mktApi.markReplied(id), onSuccess: refresh });
  const suppress = useMutation({ mutationFn: (email: string) => mktApi.suppress(email, "From the prospect page"), onSuccess: refresh });

  if (q.isLoading) return <Loading what="the prospect" />;
  if (q.error) return <ErrorBox error={q.error} />;
  const { prospect: p, eligibility, events, sends, enrollments } = q.data!;
  return (
    <>
      <p style={{ marginTop: 0 }}><Link to="/silo/ks/marketing/prospects" style={linkStyle}>All prospects</Link></p>
      <Section
        title={p.name || p.email}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button onClick={() => replied.mutate()} disabled={replied.isPending}>Mark replied</Button>
            {!p.suppressed ? (
              <Button kind="danger" onClick={() => confirmAction(`Never send marketing email to ${p.email}?`) && suppress.mutate(p.email)}>Suppress</Button>
            ) : null}
          </div>
        }
      >
        <ErrorBox error={update.error ?? replied.error ?? suppress.error} />
        {replied.data ? <p role="status">Marked as replied. {replied.data.stopped} sequence(s) stopped.</p> : null}
        <div style={{ marginBottom: 12 }}><EligibilityBadge e={eligibility} /> {!eligibility.ok ? <span style={{ fontSize: 14 }}>{eligibility.message}</span> : null}</div>
        <KeyValues
          rows={[
            ["Email", p.email],
            ["Brokerage", p.company ?? "-"],
            ["Phone", p.phone ?? "-"],
            ["Sources", p.sources.map((s) => SOURCE_LABELS[s] ?? s).join(", ")],
            ["Suppressed", p.suppressed ? BLOCK_LABELS[`suppressed_${p.suppressed}`] ?? p.suppressed : "No"],
            ["Demo booked", date(p.demo_booked_at, true)],
            ["Signed up", date(p.signed_up_at, true)],
            ["Last replied", date(p.last_replied_at, true)],
            ["Last emailed", date(p.last_emailed_at, true)],
          ]}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginTop: 12 }}>
          <Field name="Status">
            <select style={input} value={p.status} onChange={(e) => update.mutate({ status: e.target.value })} aria-label="Status">
              {KS_PROSPECT_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </Field>
          <Field name="Plan interest">
            <select style={input} value={p.plan_interest ?? ""} onChange={(e) => update.mutate({ plan_interest: e.target.value || null })} aria-label="Plan interest">
              <option value="">-</option>
              {KS_PLAN_INTEREST.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </Field>
          <Field name="Country">
            <select style={input} value={p.country ?? ""} onChange={(e) => update.mutate({ country: e.target.value || null })} aria-label="Country">
              <option value="">-</option>
              <option value="CA">Canada</option>
              <option value="US">United States</option>
            </select>
          </Field>
          <Field name="Province / state">
            <input style={input} defaultValue={p.province_state ?? ""} onBlur={(e) => e.target.value !== (p.province_state ?? "") && update.mutate({ province_state: e.target.value || null })} />
          </Field>
        </div>
      </Section>

      <Section title="Consent" actions={consent ? null : <Button onClick={() => setConsent({ consent_type: p.consent_type, consent_source: p.consent_source ?? "", consent_text: p.consent_text ?? "", consent_at: (p.consent_at ?? new Date().toISOString()).slice(0, 10), consent_expires_at: p.consent_expires_at ? p.consent_expires_at.slice(0, 10) : "" })}>Record consent</Button>}>
        <KeyValues
          rows={[
            ["Type", CONSENT_LABELS[p.consent_type] ?? p.consent_type],
            ["Source", p.consent_source ?? "-"],
            ["Given", date(p.consent_at)],
            ["Expires", p.consent_type === "express" ? "Does not expire" : p.consent_expires_at ? date(p.consent_expires_at) : p.consent_type === "implied_business" ? "While the subscription runs" : "-"],
            ["Wording", p.consent_text ?? "-"],
            ["Recorded by", p.consent_recorded_by ?? "-"],
          ]}
        />
        {consent ? (
          <div style={{ marginTop: 12 }}>
            <ConsentEditor value={consent} onChange={setConsent} error={update.error} />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Button kind="primary" onClick={() => update.mutate({ consent: cleanConsent(consent) })} disabled={update.isPending}>Save consent</Button>
              <Button onClick={() => setConsent(null)}>Cancel</Button>
            </div>
          </div>
        ) : null}
      </Section>

      <Section title="Sequences">
        <Table head={["Sequence", "Status", "Next step", "Enrolled", "Stopped because"]} empty={enrollments.length === 0}>
          {enrollments.map((e) => (
            <tr key={e.id}>
              <td style={td}><Link to={`/silo/ks/marketing/sequences/${e.sequence_id}`} style={linkStyle}>{e.sequence_name}</Link></td>
              <td style={td}><Badge value={e.status === "stopped" ? "cancelled" : e.status === "completed" ? "done" : "active"} /> {e.status}</td>
              <td style={td}>{e.status === "active" ? `Step ${e.next_step + 1}, ${date(e.next_send_at, true)}` : "-"}</td>
              <td style={td}>{date(e.enrolled_at)}</td>
              <td style={td}>{e.stopped_reason ?? "-"}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Emails">
        <Table head={["Email", "From", "Status", "Sent", "Opened", "Clicked"]} empty={sends.length === 0}>
          {sends.map((s) => (
            <tr key={s.id}>
              <td style={td}>{s.subject ?? "-"}</td>
              <td style={td}>{s.campaign_name ? `Campaign: ${s.campaign_name}` : s.sequence_name ? `${s.sequence_name}, step ${(s.step_index ?? 0) + 1}` : "-"}</td>
              <td style={td}>{s.status === "blocked" ? `Blocked: ${BLOCK_LABELS[s.block_reason ?? ""] ?? s.block_reason}` : s.bounced_at ? "Bounced" : s.status}</td>
              <td style={td}>{date(s.sent_at, true)}</td>
              <td style={td}>{date(s.opened_at, true)}</td>
              <td style={td}>{date(s.clicked_at, true)}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Timeline">
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }} data-testid="ks-mkt-timeline">
          {events.map((e) => (
            <li key={e.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--ui-border)", fontSize: 14 }}>
              <span style={{ color: "var(--ui-text-muted)", marginRight: 8 }}>{date(e.at, true)}</span>
              {e.summary}
            </li>
          ))}
          {events.length === 0 ? <li style={{ color: "var(--ui-text-muted)", fontSize: 14 }}>Nothing yet.</li> : null}
        </ol>
      </Section>
    </>
  );
}
