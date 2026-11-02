// BF_PORTAL_v865_KS_MARKETING - Keystone campaigns: a draft (content from a template, a segment of prospects, the
// audience count with who is blocked and why), a test send, then send now or schedule it (the BF composer's
// send-later picker, src/components/marketing/sendLater.ts). After sending: delivery, opens, clicks, bounces,
// unsubscribes and every recipient's result.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { describeSchedule, localInputMax, localInputMin, toIsoInstant } from "@/components/marketing/sendLater";
import { Badge, Button, confirmAction, date, ErrorBox, Field, input, linkStyle, Loading, Section, Stat, Table, td } from "../ksUi";
import { SegmentFilterEditor, SenderWarnings } from "./KsMarketing";
import { EmailEditor, fieldsOf } from "./KsMktTemplates";
import { BLOCK_LABELS, blockedSummary, EMPTY_FIELDS, mktApi, type SegmentFilters, type TemplateFields } from "./ksMarketingApi";

const STATUS_BADGE: Record<string, string> = { draft: "pending", scheduled: "trial", sending: "provisioning", sent: "done", cancelled: "cancelled" };

export function AudienceCount({ filters }: { filters: SegmentFilters }) {
  const [debounced, setDebounced] = useState(filters);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(filters), 400);
    return () => clearTimeout(t);
  }, [filters]);
  const a = useQuery({ queryKey: ["ks", "mkt", "audience", debounced], queryFn: () => mktApi.audience(debounced) });
  if (a.isLoading) return <Loading what="the audience" />;
  if (a.error) return <ErrorBox error={a.error} />;
  return (
    <p role="status" data-testid="ks-mkt-audience" style={{ fontSize: 14, margin: "8px 0 0" }}>
      <strong>{a.data!.eligible}</strong> of {a.data!.total} matching prospects can be emailed. Blocked: {blockedSummary(a.data!.blocked)}.
    </p>
  );
}

export default function KsMktCampaigns() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["ks", "mkt", "campaigns"], queryFn: () => mktApi.campaigns() });
  const templates = useQuery({ queryKey: ["ks", "mkt", "templates"], queryFn: () => mktApi.templates() });
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const create = useMutation({
    mutationFn: () => {
      const t = templates.data?.templates.find((x) => x.id === templateId);
      return mktApi.createCampaign({
        name: name.trim(),
        template_id: t?.id ?? null,
        subject: t?.subject ?? name.trim(),
        fields: fieldsOf(t?.fields),
        filters: {},
      });
    },
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["ks", "mkt", "campaigns"] });
      navigate(`/silo/ks/marketing/campaigns/${r.campaign.id}`);
    },
  });
  const rows = list.data?.campaigns ?? [];
  return (
    <>
      <SenderWarnings compact />
      <Section title="New campaign">
        <ErrorBox error={create.error} />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <Field name="Campaign name">
            <input style={{ ...input, width: 280 }} value={name} onChange={(e) => setName(e.target.value)} aria-label="Campaign name" />
          </Field>
          <Field name="Start from template">
            <select style={{ ...input, width: 240 }} value={templateId} onChange={(e) => setTemplateId(e.target.value)} aria-label="Template">
              <option value="">Blank</option>
              {(templates.data?.templates ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>
          <Button kind="primary" onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>Create draft</Button>
        </div>
      </Section>
      <Section title="Campaigns">
        {list.isLoading ? <Loading what="campaigns" /> : null}
        <ErrorBox error={list.error} />
        <Table head={["Campaign", "Status", "When", "Sent", "Opened", "Clicked", "Blocked"]} empty={!list.isLoading && rows.length === 0}>
          {rows.map((c) => (
            <tr key={c.id}>
              <td style={td}><Link to={`/silo/ks/marketing/campaigns/${c.id}`} style={linkStyle}>{c.name}</Link><div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{c.subject}</div></td>
              <td style={td}><Badge value={STATUS_BADGE[c.status] ?? c.status} /> {c.status}</td>
              <td style={td}>{date(c.finished_at ?? c.send_at ?? c.created_at, true)}</td>
              <td style={td}>{c.sent ?? 0}</td>
              <td style={td}>{c.opened ?? 0}</td>
              <td style={td}>{c.clicked ?? 0}</td>
              <td style={td}>{c.blocked ?? 0}</td>
            </tr>
          ))}
        </Table>
      </Section>
    </>
  );
}

function DraftEditor({ id, initial }: { id: string; initial: { name: string; subject: string; fields: TemplateFields; filters: SegmentFilters; template_id: string | null } }) {
  const qc = useQueryClient();
  const [name, setName] = useState(initial.name);
  const [subject, setSubject] = useState(initial.subject);
  const [fields, setFields] = useState<TemplateFields>(initial.fields);
  const [filters, setFilters] = useState<SegmentFilters>(initial.filters);
  const [when, setWhen] = useState<"now" | "later">("now");
  const [at, setAt] = useState("");
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["ks", "mkt", "campaign", id] });
    void qc.invalidateQueries({ queryKey: ["ks", "mkt", "campaigns"] });
  };
  const body = () => ({ name, template_id: initial.template_id, subject, fields, filters });
  const save = useMutation({ mutationFn: () => mktApi.updateCampaign(id, body()), onSuccess: refresh });
  const send = useMutation({
    mutationFn: async () => {
      await mktApi.updateCampaign(id, body());
      return mktApi.sendCampaign(id, when === "later" ? toIsoInstant(at) : null);
    },
    onSuccess: refresh,
  });
  const go = () => {
    const whenText = when === "later" ? describeSchedule(at) : "now";
    if (confirmAction(`Send "${subject}" ${when === "later" ? `- ${whenText}` : "now"}? Only prospects with valid consent who are not suppressed will get it.`)) send.mutate();
  };
  return (
    <>
      <Section title="Who gets it">
        <SegmentFilterEditor value={filters} onChange={setFilters} />
        <AudienceCount filters={filters} />
      </Section>
      <Section title="The email">
        <Field name="Campaign name">
          <input style={{ ...input, maxWidth: 420 }} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div style={{ height: 12 }} />
        <EmailEditor subject={subject} fields={fields} onSubject={setSubject} onFields={setFields} />
      </Section>
      <Section title="Send">
        <ErrorBox error={save.error ?? send.error} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14 }}>
            <input type="radio" checked={when === "now"} onChange={() => setWhen("now")} /> Send now
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14 }}>
            <input type="radio" checked={when === "later"} onChange={() => setWhen("later")} /> Schedule
          </label>
          {when === "later" ? (
            <input type="datetime-local" style={input} min={localInputMin()} max={localInputMax()} value={at} onChange={(e) => setAt(e.target.value)} aria-label="Send at" />
          ) : null}
        </div>
        {when === "later" && at ? <p style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>{describeSchedule(at)}</p> : null}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Save draft</Button>
          <Button kind="primary" onClick={go} disabled={send.isPending || !subject.trim() || (when === "later" && !toIsoInstant(at))} testId="ks-mkt-send">
            {when === "later" ? "Schedule" : "Send now"}
          </Button>
        </div>
        {save.isSuccess && !send.data ? <p role="status" style={{ fontSize: 14 }}>Draft saved.</p> : null}
      </Section>
    </>
  );
}

export function KsMktCampaignDetail() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["ks", "mkt", "campaign", id],
    queryFn: () => mktApi.campaign(id),
    refetchInterval: (query) => (["scheduled", "sending"].includes(String(query.state.data?.campaign.status)) ? 10_000 : false),
  });
  const cancel = useMutation({
    mutationFn: () => mktApi.cancelCampaign(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["ks", "mkt", "campaign", id] }),
  });
  if (q.isLoading) return <Loading what="the campaign" />;
  if (q.error) return <ErrorBox error={q.error} />;
  const { campaign: c, stats, recipients } = q.data!;
  return (
    <>
      <p style={{ marginTop: 0 }}><Link to="/silo/ks/marketing/campaigns" style={linkStyle}>All campaigns</Link></p>
      <SenderWarnings compact />
      <Section
        title={c.name}
        actions={
          ["scheduled", "sending"].includes(c.status) ? (
            <Button kind="danger" onClick={() => confirmAction("Cancel this campaign? Emails not sent yet will not go.") && cancel.mutate()}>Cancel campaign</Button>
          ) : null
        }
      >
        <ErrorBox error={cancel.error} />
        <p style={{ margin: 0, fontSize: 14 }}>
          <Badge value={STATUS_BADGE[c.status] ?? c.status} /> {c.status}
          {c.send_at && c.status !== "draft" ? ` - ${c.status === "scheduled" ? "goes out" : "started"} ${date(c.send_at, true)}` : ""}
          {c.finished_at ? `, finished ${date(c.finished_at, true)}` : ""}
        </p>
      </Section>
      {c.status === "draft" ? (
        <DraftEditor
          id={c.id}
          initial={{ name: c.name, subject: c.subject, fields: { ...EMPTY_FIELDS, ...(c.fields ?? {}) }, filters: c.filters ?? {}, template_id: c.template_id ?? null }}
        />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
            <Stat title="Sent" value={stats.sent} sub={stats.queued ? `${stats.queued} waiting` : undefined} />
            <Stat title="Delivered" value={stats.delivered} />
            <Stat title="Opened" value={stats.opened} />
            <Stat title="Clicked" value={stats.clicked} />
            <Stat title="Bounced" value={stats.bounced} />
            <Stat title="Unsubscribed" value={stats.unsubscribed} />
            <Stat title="Blocked" value={stats.blocked} sub={blockedSummary(stats.blocked_by_reason)} />
            <Stat title="Failed" value={stats.failed} />
          </div>
          <Section title="Recipients">
            <Table head={["Prospect", "Result", "Sent", "Opened", "Clicked"]} empty={recipients.length === 0}>
              {recipients.map((r) => (
                <tr key={r.id}>
                  <td style={td}><Link to={`/silo/ks/marketing/prospects/${r.prospect_id}`} style={linkStyle}>{r.name || r.email}</Link><div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{r.email}</div></td>
                  <td style={td}>
                    {r.status === "blocked" ? `Blocked: ${BLOCK_LABELS[r.block_reason ?? ""] ?? r.block_reason}` : r.bounced_at ? "Bounced" : r.unsubscribed_at ? "Unsubscribed" : r.status}
                    {r.error ? <div style={{ fontSize: 12, color: "var(--ui-text-danger)" }}>{r.error}</div> : null}
                  </td>
                  <td style={td}>{date(r.sent_at, true)}</td>
                  <td style={td}>{date(r.opened_at, true)}</td>
                  <td style={td}>{date(r.clicked_at, true)}</td>
                </tr>
              ))}
            </Table>
          </Section>
        </>
      )}
    </>
  );
}
