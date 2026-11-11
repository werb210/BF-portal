// BF_PORTAL_v945_KS_OUTREACH - Keystone silo > Marketing: Channels (the scoreboard that decides what to keep and what to
// drop, and the events / communities / pitches / ad campaigns / listings / videos / partners inside each channel),
// the owner Call list, and Referrals.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { openDialer } from "@/dialer/store";
import { Badge, Button, cents, date, ErrorBox, Field, input, linkStyle, Loading, Section, Stat, Table, td } from "../../ksUi";
import { LogTouch } from "./KsBrokerages";
import { CHANNEL_ITEM_KIND, dollarsToCents, ITEM_KIND_LABELS, outreachApi, type Call, type Channel } from "./outreachApi";

const today = () => new Date().toISOString().slice(0, 10);
const useRefresh = () => { const qc = useQueryClient(); return () => void qc.invalidateQueries({ queryKey: ["ks-outreach"] }); };

function testText(c: Channel): string {
  if (c.decision !== "testing") return c.decision === "keep" ? "Kept" : "Dropped";
  if (!c.test_started_on) return "Not started";
  if ((c.test_days_left ?? 0) <= 0) return "Test over: decide";
  return `${c.test_days_left} days left`;
}

function ChannelItems({ channel }: { channel: Channel }) {
  const refresh = useRefresh();
  const items = useQuery({ queryKey: ["ks-outreach", "items", channel.key], queryFn: () => outreachApi.items(channel.key) });
  const kind = CHANNEL_ITEM_KIND[channel.key] ?? "other";
  const [f, setF] = useState({ kind, name: "", url: "", happens_on: "", cost: "" });
  const add = useMutation({
    mutationFn: () => outreachApi.addItem({ channel_key: channel.key, kind: f.kind, name: f.name, url: f.url || null, happens_on: f.happens_on || null, cost_cents: dollarsToCents(f.cost) }),
    onSuccess: () => { setF({ kind, name: "", url: "", happens_on: "", cost: "" }); refresh(); },
  });
  const set = useMutation({ mutationFn: (v: { id: string; status: string }) => outreachApi.saveItem(v.id, { status: v.status }), onSuccess: refresh });
  return (
    <div style={{ padding: "8px 0 4px" }} data-testid={`channel-items-${channel.key}`}>
      <Table head={["What", "Kind", "Date", "Cost", "Status", "Touches", "Clicks", "Owner talks, demos, sign-ups"]} empty={!items.data?.items.length}>
        {items.data?.items.map((i) => (
          <tr key={i.id}>
            <td style={td}>{i.url ? <a href={i.url} target="_blank" rel="noreferrer" style={linkStyle}>{i.name}</a> : i.name}</td>
            <td style={td}>{ITEM_KIND_LABELS[i.kind] ?? i.kind}</td><td style={td}>{i.happens_on ? date(i.happens_on) : "—"}</td><td style={td}>{cents(i.cost_cents)}</td>
            <td style={td}><select aria-label={`Status of ${i.name}`} style={{ ...input, width: 130 }} value={i.status} onChange={(e) => set.mutate({ id: i.id, status: e.target.value })}>{[["planned", "Planned"], ["in_progress", "In progress"], ["live", "Live"], ["done", "Done"], ["dropped", "Dropped"]].map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
            <td style={td}>{i.touches}</td><td style={td}>{i.clicks}</td><td style={td}>{i.wins}</td>
          </tr>
        ))}
      </Table>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", marginTop: 8 }}>
        <Field name="Add"><select aria-label="Kind" style={{ ...input, width: 170 }} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{Object.entries(ITEM_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field name="Name"><input aria-label="Item name" style={{ ...input, width: 240 }} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field name="Link"><input aria-label="Item link" style={{ ...input, width: 220 }} placeholder="https://" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></Field>
        <Field name="Date"><input aria-label="Item date" type="date" style={{ ...input, width: 150 }} value={f.happens_on} onChange={(e) => setF({ ...f, happens_on: e.target.value })} /></Field>
        <Field name="Cost ($)"><input aria-label="Item cost" style={{ ...input, width: 90 }} value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /></Field>
        <Button kind="primary" testId={`item-add-${channel.key}`} disabled={add.isPending || !f.name.trim()} onClick={() => add.mutate()}>Add</Button>
      </div>
      {add.error ? <ErrorBox error={add.error} /> : null}
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Log something on this channel that is not tied to one firm</div>
        <LogTouch channels={[channel]} fixedChannel={channel.key} onDone={refresh} />
      </div>
    </div>
  );
}

export default function KsChannels() {
  const refresh = useRefresh();
  const q = useQuery({ queryKey: ["ks-outreach", "channels"], queryFn: outreachApi.channels });
  const [open, setOpen] = useState<string | null>(null);
  const [budget, setBudget] = useState<Record<string, string>>({});
  const save = useMutation({ mutationFn: (v: { key: string; body: Record<string, unknown> }) => outreachApi.saveChannel(v.key, v.body), onSuccess: refresh });
  if (q.isLoading) return <Loading what="channels" />;
  if (q.error) return <ErrorBox error={q.error} />;
  const rows = q.data?.channels ?? [];
  const live = rows.filter((c) => c.decision !== "drop");
  return (
    <div data-testid="ks-channels">
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ui-text-muted)" }}>
        Every channel gets the same test: four weeks, a fixed budget, and one measure, owner conversations. Start a test, log what happens, then keep or drop.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <Stat title="Owner conversations" value={live.reduce((a, c) => a + c.owner_conversations, 0)} />
        <Stat title="Demos" value={live.reduce((a, c) => a + c.demos, 0)} />
        <Stat title="Sign-ups" value={live.reduce((a, c) => a + c.signups, 0)} />
        <Stat title="Spent" value={cents(rows.reduce((a, c) => a + c.cost_cents, 0))} />
      </div>
      <Table head={["Channel", "Test", "Sent or done", "Firms", "Replies", "Clicks", "Owner talks", "Demos", "Sign-ups", "Spent", "Cost per owner talk", "Decision", ""]} empty={!rows.length}>
        {rows.flatMap((c) => [
          <tr key={c.key} data-testid={`channel-${c.key}`} style={{ opacity: c.decision === "drop" ? 0.55 : 1 }}>
            <td style={td}><strong>{c.name}</strong></td>
            <td style={td}>{testText(c)}{c.test_ends_on && c.decision === "testing" ? <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>ends {date(c.test_ends_on)}</div> : null}</td>
            <td style={td}>{c.touches}</td><td style={td}>{c.firms}</td><td style={td}>{c.replies}</td><td style={td}>{c.clicks}</td>
            <td style={td}><strong>{c.owner_conversations}</strong></td><td style={td}>{c.demos}</td><td style={td}>{c.signups}</td>
            <td style={{ ...td, color: c.over_budget ? "#b91c1c" : undefined }}>{cents(c.cost_cents)}{c.budget_cents ? ` of ${cents(c.budget_cents)}` : ""}</td>
            <td style={td}>{c.cost_per_owner_conversation_cents === null ? "—" : cents(c.cost_per_owner_conversation_cents)}</td>
            <td style={td}><Badge value={c.decision === "testing" ? "Testing" : c.decision === "keep" ? "Keep" : "Drop"} /></td>
            <td style={{ ...td, whiteSpace: "nowrap" }}><Button testId={`channel-open-${c.key}`} onClick={() => setOpen(open === c.key ? null : c.key)}>{open === c.key ? "Close" : "Open"}</Button></td>
          </tr>,
          open === c.key ? (
            <tr key={`${c.key}-open`}><td style={td} colSpan={13}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
                {c.test_started_on ? null : <Button kind="primary" testId={`channel-start-${c.key}`} onClick={() => save.mutate({ key: c.key, body: { test_started_on: today(), decision: "testing" } })}>Start the 4-week test today</Button>}
                <Field name="Test budget ($)"><input aria-label={`Budget for ${c.name}`} style={{ ...input, width: 110 }} value={budget[c.key] ?? (c.budget_cents ? String(c.budget_cents / 100) : "")} onChange={(e) => setBudget({ ...budget, [c.key]: e.target.value })} /></Field>
                <Button onClick={() => save.mutate({ key: c.key, body: { budget_cents: dollarsToCents(budget[c.key] ?? "") } })}>Save budget</Button>
                <Button kind={c.decision === "keep" ? "primary" : "secondary"} testId={`channel-keep-${c.key}`} onClick={() => save.mutate({ key: c.key, body: { decision: "keep" } })}>Keep</Button>
                <Button kind={c.decision === "drop" ? "danger" : "secondary"} testId={`channel-drop-${c.key}`} onClick={() => save.mutate({ key: c.key, body: { decision: "drop" } })}>Drop</Button>
                {c.decision !== "testing" ? <Button onClick={() => save.mutate({ key: c.key, body: { decision: "testing", test_started_on: today() } })}>Test again</Button> : null}
              </div>
              {save.error ? <ErrorBox error={save.error} /> : null}
              {c.key === "phone" ? <p style={{ fontSize: 13 }}>Calls are made from the <Link to="/silo/ks/marketing/call-list" style={linkStyle}>Call list</Link>.</p> : null}
              {c.key === "referrals" ? <p style={{ fontSize: 13 }}>Referrals are tracked on the <Link to="/silo/ks/marketing/referrals" style={linkStyle}>Referrals</Link> tab.</p> : null}
              {c.key === "email" ? <p style={{ fontSize: 13 }}>Email is sent from Campaigns and Sequences; its sends, clicks and replies are counted here.</p> : null}
              <ChannelItems channel={c} />
            </td></tr>
          ) : null,
        ])}
      </Table>
    </div>
  );
}

const CALL_OUTCOMES: Array<[string, string]> = [["no_answer", "No answer"], ["voicemail", "Voicemail"], ["conversation", "Spoke, not the owner"], ["owner_conversation", "Owner conversation"], ["not_interested", "Not interested"], ["do_not_contact", "Do not call again"]];

export function KsCallList() {
  const refresh = useRefresh();
  const q = useQuery({ queryKey: ["ks-outreach", "call-list"], queryFn: () => outreachApi.callList(25) });
  const [note, setNote] = useState<Record<string, string>>({});
  const log = useMutation({
    mutationFn: (v: { c: Call; outcome: string }) => outreachApi.addTouch({ channel_key: "phone", brokerage_id: v.c.brokerage_id, person_id: v.c.person_id, outcome: v.outcome, summary: note[v.c.person_id] || null }),
    onSuccess: refresh,
  });
  if (q.isLoading) return <Loading what="call list" />;
  if (q.error) return <ErrorBox error={q.error} />;
  const calls = q.data?.calls ?? [];
  const dial = (c: Call, num: string) => openDialer({ phone: num, contactName: `${c.name} (${c.brokerage})`, source: "ks_outreach" });
  return (
    <div data-testid="ks-call-list">
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ui-text-muted)" }}>
        The next 25 owners and decision-makers to call, best firms first, one person per firm. Numbers marked do-not-call are never shown. A firm drops off the list for three days once it is called. The aim of the call is a 15-minute conversation, not a sale.
      </p>
      <Section title="Opening line">
        <p style={{ margin: 0, fontSize: 14 }}>"Hi [name], it's [you] from Keystone. We run a finance brokerage ourselves and built the system we wished we could buy: one place for the pipeline, calls, documents and commissions. I'd like 15 minutes to show you what it would replace at [firm] and what it would cost. Is later this week any good?"</p>
      </Section>
      {log.error ? <ErrorBox error={log.error} /> : null}
      <Table head={["Priority", "Who", "Firm", "Call", "Uses today", "Note", "What happened"]} empty={!calls.length}>
        {calls.map((c) => (
          <tr key={c.person_id} data-testid={`call-${c.person_id}`}>
            <td style={td}><strong>{c.fit_score}</strong></td>
            <td style={td}>{c.name}{c.is_owner ? <> <Badge value="Owner" /></> : null}<div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{c.title ?? ""}</div></td>
            <td style={td}><Link to={`/silo/ks/marketing/brokerages/${c.brokerage_id}`} style={linkStyle}>{c.brokerage}</Link><div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{[c.province_state, c.country].filter(Boolean).join(", ")}{c.calls ? ` · called ${c.calls} time${c.calls === 1 ? "" : "s"}` : ""}</div></td>
            <td style={td}>{[c.direct_phone, c.mobile_phone].filter((n): n is string => !!n).map((n) => <div key={n}><Button onClick={() => dial(c, n)}>{n}</Button></div>)}</td>
            <td style={td}>{c.current_tools?.length ? c.current_tools.join(", ") : "Ask"}</td>
            <td style={td}><input aria-label={`Note for ${c.name}`} style={{ ...input, width: 200 }} value={note[c.person_id] ?? ""} onChange={(e) => setNote({ ...note, [c.person_id]: e.target.value })} /></td>
            <td style={td}><div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 420 }}>{CALL_OUTCOMES.map(([k, v]) => <Button key={k} kind={k === "owner_conversation" ? "primary" : k === "do_not_contact" ? "danger" : "secondary"} testId={`call-${c.person_id}-${k}`} disabled={log.isPending} onClick={() => log.mutate({ c, outcome: k })}>{v}</Button>)}</div></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

const REFERRAL_STATUS: Array<[string, string]> = [["open", "Code given"], ["referred", "Brokerage referred"], ["signed_up", "Referred firm signed up"], ["reward_owed", "Reward owed"], ["reward_applied", "Reward applied"], ["void", "Void"]];

export function KsReferrals() {
  const refresh = useRefresh();
  const q = useQuery({ queryKey: ["ks-outreach", "referrals"], queryFn: outreachApi.referrals });
  const [f, setF] = useState({ referrer_name: "", referred_name: "", reward: "One month free per seat", amount: "" });
  const add = useMutation({
    mutationFn: () => outreachApi.addReferral({ referrer_name: f.referrer_name, referred_name: f.referred_name || null, reward: f.reward || null, reward_cents: dollarsToCents(f.amount) }),
    onSuccess: () => { setF({ referrer_name: "", referred_name: "", reward: "One month free per seat", amount: "" }); refresh(); },
  });
  const set = useMutation({ mutationFn: (v: { id: string; status: string }) => outreachApi.saveReferral(v.id, { status: v.status }), onSuccess: refresh });
  if (q.isLoading) return <Loading what="referrals" />;
  if (q.error) return <ErrorBox error={q.error} />;
  return (
    <div data-testid="ks-referrals">
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ui-text-muted)" }}>Who referred whom, and the reward owed. Rewards are applied to the customer's bill by hand; mark them applied here when done.</p>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}><Stat title="Rewards owed" value={cents(q.data?.owed_cents ?? 0)} /><Stat title="Referrals" value={q.data?.referrals.length ?? 0} /></div>
      <Section title="Add a referral">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <Field name="Customer who referred"><input aria-label="Referrer" style={{ ...input, width: 220 }} value={f.referrer_name} onChange={(e) => setF({ ...f, referrer_name: e.target.value })} /></Field>
          <Field name="Brokerage they referred"><input aria-label="Referred brokerage" style={{ ...input, width: 220 }} value={f.referred_name} onChange={(e) => setF({ ...f, referred_name: e.target.value })} /></Field>
          <Field name="Reward"><input aria-label="Reward" style={{ ...input, width: 220 }} value={f.reward} onChange={(e) => setF({ ...f, reward: e.target.value })} /></Field>
          <Field name="Worth ($)"><input aria-label="Reward amount" style={{ ...input, width: 90 }} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Button kind="primary" testId="referral-add" disabled={add.isPending || !f.referrer_name.trim()} onClick={() => add.mutate()}>Add</Button>
        </div>
        {add.error ? <ErrorBox error={add.error} /> : null}
      </Section>
      <Table head={["Code", "Referred by", "Brokerage referred", "Reward", "Status", "Added"]} empty={!q.data?.referrals.length}>
        {q.data?.referrals.map((r) => (
          <tr key={r.id} data-testid={`referral-${r.id}`}>
            <td style={td}><code>{r.code}</code></td><td style={td}>{r.referrer_name}</td><td style={td}>{r.referred_brokerage ?? r.referred_name ?? "—"}</td>
            <td style={td}>{r.reward ?? "—"}{r.reward_cents ? ` (${cents(r.reward_cents)})` : ""}{r.reward_applied_at ? <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>applied {date(r.reward_applied_at)}</div> : null}</td>
            <td style={td}><select aria-label={`Status of referral ${r.code}`} style={{ ...input, width: 210 }} value={r.status} onChange={(e) => set.mutate({ id: r.id, status: e.target.value })}>{REFERRAL_STATUS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
            <td style={td}>{date(r.created_at)}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
