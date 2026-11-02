// BF_PORTAL_v865_KS_MARKETING - Keystone drip sequences: steps of "wait N days, then send a template"; turned on or
// paused; prospects enrolled from a segment (only those with valid consent). An enrolment stops by itself when the
// prospect replies, signs up or books a demo after enrolling, unsubscribes or loses consent; staff can stop one too.
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, confirmAction, date, ErrorBox, Field, input, linkStyle, Loading, Section, Table, td } from "../ksUi";
import { SegmentFilterEditor, SenderWarnings } from "./KsMarketing";
import { AudienceCount } from "./KsMktCampaigns";
import { blockedSummary, mktApi, type SegmentFilters, type SequenceStep } from "./ksMarketingApi";

const STOP_LABELS: Record<string, string> = {
  replied: "Replied", signed_up: "Signed up", demo_booked: "Booked a demo", unsubscribed: "Unsubscribed", suppressed: "Suppressed",
  staff: "Stopped by staff", send_failed: "Email could not be sent", template_missing: "Template missing", missing: "Removed",
};
const stopLabel = (r: string | null) => (r ? STOP_LABELS[r] ?? (r.startsWith("blocked:") ? `Not allowed to email (${r.slice(8)})` : r) : "-");

export default function KsMktSequences() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["ks", "mkt", "sequences"], queryFn: () => mktApi.sequences() });
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: () => mktApi.createSequence({ name: name.trim(), steps: [] }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["ks", "mkt", "sequences"] });
      navigate(`/silo/ks/marketing/sequences/${r.sequence.id}`);
    },
  });
  const rows = list.data?.sequences ?? [];
  return (
    <>
      <SenderWarnings compact />
      <Section title="New sequence">
        <ErrorBox error={create.error} />
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <Field name="Sequence name">
            <input style={{ ...input, width: 300 }} value={name} onChange={(e) => setName(e.target.value)} aria-label="Sequence name" />
          </Field>
          <Button kind="primary" onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>Create</Button>
        </div>
      </Section>
      <Section title="Sequences">
        {list.isLoading ? <Loading what="sequences" /> : null}
        <ErrorBox error={list.error} />
        <Table head={["Sequence", "Status", "Steps", "Active", "Enrolled"]} empty={!list.isLoading && rows.length === 0}>
          {rows.map((s) => (
            <tr key={s.id}>
              <td style={td}><Link to={`/silo/ks/marketing/sequences/${s.id}`} style={linkStyle}>{s.name}</Link></td>
              <td style={td}><Badge value={s.status === "active" ? "active" : s.status === "paused" ? "waiting" : "pending"} /> {s.status}</td>
              <td style={td}>{s.steps.length}</td>
              <td style={td}>{s.active ?? 0}</td>
              <td style={td}>{s.enrolled ?? 0}</td>
            </tr>
          ))}
        </Table>
      </Section>
    </>
  );
}

export function KsMktSequenceDetail() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ks", "mkt", "sequence", id], queryFn: () => mktApi.sequence(id) });
  const templates = useQuery({ queryKey: ["ks", "mkt", "templates"], queryFn: () => mktApi.templates() });
  const [steps, setSteps] = useState<SequenceStep[] | null>(null);
  const [filters, setFilters] = useState<SegmentFilters>({});
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["ks", "mkt", "sequence", id] });
    void qc.invalidateQueries({ queryKey: ["ks", "mkt", "sequences"] });
  };
  const update = useMutation({ mutationFn: (body: Partial<{ steps: SequenceStep[]; status: string }>) => mktApi.updateSequence(id, body), onSuccess: () => { setSteps(null); refresh(); } });
  const enroll = useMutation({ mutationFn: () => mktApi.enroll(id, filters), onSuccess: refresh });
  const stop = useMutation({ mutationFn: (enrollmentId: string) => mktApi.stopEnrollment(enrollmentId), onSuccess: refresh });

  if (q.isLoading) return <Loading what="the sequence" />;
  if (q.error) return <ErrorBox error={q.error} />;
  const { sequence: s, enrollments } = q.data!;
  const current = steps ?? s.steps;
  const tpls = templates.data?.templates ?? [];
  const setStep = (i: number, patch: Partial<SequenceStep>) => setSteps(current.map((st, j) => (j === i ? { ...st, ...patch } : st)));
  return (
    <>
      <p style={{ marginTop: 0 }}><Link to="/silo/ks/marketing/sequences" style={linkStyle}>All sequences</Link></p>
      <SenderWarnings compact />
      <Section
        title={s.name}
        actions={
          s.status === "active" ? (
            <Button onClick={() => update.mutate({ status: "paused" })}>Pause</Button>
          ) : (
            <Button kind="primary" onClick={() => update.mutate({ status: "active" })} disabled={s.steps.length === 0}>Turn on</Button>
          )
        }
      >
        <ErrorBox error={update.error} />
        <p style={{ marginTop: 0, fontSize: 14 }}>
          <Badge value={s.status === "active" ? "active" : s.status === "paused" ? "waiting" : "pending"} /> {s.status}. Each prospect stops getting
          this sequence as soon as they reply, sign up for Keystone or book a demo, and whenever they unsubscribe or their consent runs out.
        </p>
      </Section>

      <Section title="Steps">
        <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 10 }}>
          {current.map((st, i) => (
            <li key={i}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                <Field name={i === 0 ? "Days after enrolling" : "Days after the step before"}>
                  <input type="number" min={0} max={365} style={{ ...input, width: 110 }} value={st.wait_days} onChange={(e) => setStep(i, { wait_days: Math.max(0, Number(e.target.value) || 0) })} aria-label={`Step ${i + 1} wait`} />
                </Field>
                <Field name="Send template">
                  <select style={{ ...input, width: 260 }} value={st.template_id} onChange={(e) => setStep(i, { template_id: e.target.value })} aria-label={`Step ${i + 1} template`}>
                    <option value="">Choose a template</option>
                    {tpls.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </Field>
                <Button onClick={() => setSteps(current.filter((_, j) => j !== i))}>Remove</Button>
              </div>
            </li>
          ))}
        </ol>
        {current.length === 0 ? <p style={{ fontSize: 14, color: "var(--ui-text-muted)" }}>No steps yet.</p> : null}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <Button onClick={() => setSteps([...current, { wait_days: current.length ? 3 : 0, template_id: "" }])} disabled={current.length >= 20}>Add step</Button>
          <Button kind="primary" onClick={() => update.mutate({ steps: current })} disabled={!steps || update.isPending || current.some((x) => !x.template_id)}>Save steps</Button>
        </div>
        {tpls.length === 0 ? <p style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Make a template on the Templates tab first.</p> : null}
      </Section>

      <Section title="Enrol prospects">
        <SegmentFilterEditor value={filters} onChange={setFilters} />
        <AudienceCount filters={filters} />
        <ErrorBox error={enroll.error} />
        <div style={{ marginTop: 12 }}>
          <Button
            kind="primary"
            onClick={() => confirmAction("Enrol everyone in this segment who can be emailed?") && enroll.mutate()}
            disabled={enroll.isPending || s.steps.length === 0}
          >
            Enrol segment
          </Button>
        </div>
        {enroll.data ? (
          <p role="status" style={{ fontSize: 14 }}>
            Enrolled {enroll.data.enrolled}. Already in it: {enroll.data.already}. Not enrolled (no valid consent or suppressed): {blockedSummary(enroll.data.blocked)}.
            {s.status !== "active" ? " Turn the sequence on to start sending." : ""}
          </p>
        ) : null}
      </Section>

      <Section title={`Enrolled (${enrollments.length})`}>
        <ErrorBox error={stop.error} />
        <Table head={["Prospect", "Status", "Next", "Enrolled", "Stopped because", ""]} empty={enrollments.length === 0}>
          {enrollments.map((e) => (
            <tr key={e.id}>
              <td style={td}>{e.name || e.email}<div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{e.email}</div></td>
              <td style={td}>{e.status}</td>
              <td style={td}>{e.status === "active" ? `Step ${e.next_step + 1}, ${date(e.next_send_at, true)}` : "-"}</td>
              <td style={td}>{date(e.enrolled_at)}</td>
              <td style={td}>{stopLabel(e.stopped_reason)}</td>
              <td style={td}>{e.status === "active" ? <Button onClick={() => stop.mutate(e.id)}>Stop</Button> : null}</td>
            </tr>
          ))}
        </Table>
      </Section>
    </>
  );
}
