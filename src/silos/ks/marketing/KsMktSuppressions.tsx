// BF_PORTAL_v865_KS_MARKETING - the Keystone suppression list: everyone who must never get Keystone marketing email
// (unsubscribed, hard bounce, spam report, opted out in the CRM, added by staff). Checked before every send. Only
// entries staff added can be removed here.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, confirmAction, date, ErrorBox, Field, input, Loading, Section, Table, td } from "../ksUi";
import { mktApi } from "./ksMarketingApi";

const REASONS: Record<string, string> = {
  unsubscribed: "Unsubscribed", hard_bounce: "Hard bounce", spam_report: "Spam report", crm_opt_out: "Opted out in the CRM", manual: "Added by staff",
};

export default function KsMktSuppressions() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const list = useQuery({ queryKey: ["ks", "mkt", "suppressions", q], queryFn: () => mktApi.suppressions(q) });
  const done = () => void qc.invalidateQueries({ queryKey: ["ks", "mkt", "suppressions"] });
  const add = useMutation({ mutationFn: () => mktApi.suppress(email.trim(), note.trim()), onSuccess: () => { setEmail(""); setNote(""); done(); } });
  const remove = useMutation({ mutationFn: (e: string) => mktApi.unsuppress(e), onSuccess: done });
  const rows = list.data?.suppressions ?? [];
  return (
    <>
      <Section title="Add to the suppression list">
        <ErrorBox error={add.error} />
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <Field name="Email">
            <input style={{ ...input, width: 260 }} value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email to suppress" />
          </Field>
          <Field name="Note">
            <input style={{ ...input, width: 260 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Asked by phone not to be emailed" />
          </Field>
          <Button kind="primary" onClick={() => add.mutate()} disabled={!email.trim() || add.isPending}>Suppress</Button>
        </div>
      </Section>
      <Section title="Suppressed" actions={<input style={{ ...input, width: 220 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search suppressions" />}>
        {list.isLoading ? <Loading what="the suppression list" /> : null}
        <ErrorBox error={list.error ?? remove.error} />
        <Table head={["Email", "Why", "Source", "Note", "When", ""]} empty={!list.isLoading && rows.length === 0}>
          {rows.map((s) => (
            <tr key={s.email}>
              <td style={td}>{s.email}</td>
              <td style={td}>{REASONS[s.reason] ?? s.reason}</td>
              <td style={td}>{s.source ?? "-"}</td>
              <td style={td}>{s.note ?? "-"}</td>
              <td style={td}>{date(s.created_at, true)}</td>
              <td style={td}>
                {s.reason === "manual" ? (
                  <Button onClick={() => confirmAction(`Allow marketing email to ${s.email} again (if they have consent)?`) && remove.mutate(s.email)}>Remove</Button>
                ) : null}
              </td>
            </tr>
          ))}
        </Table>
      </Section>
    </>
  );
}
