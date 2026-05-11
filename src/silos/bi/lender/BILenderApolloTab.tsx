// BF_PORTAL_BLOCK_v125_BI_LENDER_APOLLO_PHASE1_v1
import { useEffect, useMemo, useState } from "react";
import {
  listSequences,
  listEmailAccounts,
  listReplies,
  type ApolloSequence,
  type ApolloEmailAccount,
  type ApolloReply,
} from "../api/biApollo";

type Sub = "sequences" | "replies" | "mailboxes";

function fmtPct(n?: number) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}
function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

function HealthBadge({ status }: { status?: string }) {
  const ok = !status || /^(active|connected|healthy|ready)$/i.test(status);
  const cls = ok
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
    : "bg-amber-500/15 text-amber-300 border-amber-500/40";
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${cls}`}>
      {status || "active"}
    </span>
  );
}

function SequencesView() { const [data,setData]=useState<{sequences:ApolloSequence[];total:number}|null>(null); const [err,setErr]=useState<string|null>(null); const [busy,setBusy]=useState(true);
useEffect(()=>{let live=true; setBusy(true); listSequences({page:1,per_page:100}).then((r)=>{if(!live) return; setData({sequences:r.sequences||[],total:r.pagination?.total_entries ?? (r.sequences?.length||0)}); setErr(null);}).catch((e:any)=>{if(live) setErr(e?.message||"Failed to load sequences");}).finally(()=>{if(live) setBusy(false);}); return ()=>{live=false;};},[]);
if (busy) return <div className="text-white/70 text-sm">Loading sequences…</div>; if (err) return <div className="text-red-300 text-sm">{err}</div>; if (!data || data.sequences.length===0) return <div className="text-white/60 text-sm">No sequences yet. Create one in Apollo to see it here.</div>;
return <div><div className="text-xs text-white/60 mb-3">{data.total} sequence{data.total===1?"":"s"}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{data.sequences.map((s)=><div key={s.id} className="rounded-lg border border-white/10 bg-white/5 p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-white">{s.name||s.id}</div><div className="text-xs text-white/60 mt-1">{(s.num_steps??0)} step{(s.num_steps??0)===1?"":"s"} · {(s.num_active_contacts??0)} active · {(s.num_completed_contacts??0)} completed</div></div><HealthBadge status={s.active===false?"paused":s.archived?"archived":"active"} /></div><div className="text-xs text-white/40 mt-3">Updated {fmtDate(s.updated_at)}</div></div>)}</div></div>; }

function RepliesView() { const [data,setData]=useState<ApolloReply[]|null>(null); const [err,setErr]=useState<string|null>(null); const [busy,setBusy]=useState(true);
useEffect(()=>{let live=true; setBusy(true); listReplies({page:1,per_page:100}).then((r)=>{if(live){setData(r.replies||[]); setErr(null);}}).catch((e:any)=>{if(live) setErr(e?.message||"Failed to load replies");}).finally(()=>{if(live) setBusy(false);}); return ()=>{live=false;};},[]);
if (busy) return <div className="text-white/70 text-sm">Loading replies…</div>; if (err) return <div className="text-red-300 text-sm">{err}</div>; if (!data||data.length===0) return <div className="text-white/60 text-sm">No replies yet. Apollo will populate this view as recipients respond.</div>;
return <div className="space-y-2">{data.map((m)=><div key={m.id} className="rounded-lg border border-white/10 bg-white/5 p-4"><div className="flex justify-between gap-3 mb-1"><div className="font-semibold text-white">{m.from_email||"(unknown sender)"}</div><div className="text-xs text-white/60">{fmtDate(m.replied_at)}</div></div><div className="text-sm text-white/80">{m.subject||"(no subject)"}</div>{m.body_preview&&(<div className="text-sm text-white/60 mt-1 line-clamp-2">{m.body_preview}</div>)}{m.sequence_name&&(<div className="text-xs text-white/40 mt-2">From sequence: {m.sequence_name}</div>)}</div>)}</div>; }

function MailboxesView() { const [data,setData]=useState<ApolloEmailAccount[]|null>(null); const [err,setErr]=useState<string|null>(null); const [busy,setBusy]=useState(true);
useEffect(()=>{let live=true; setBusy(true); listEmailAccounts().then((r)=>{if(live){setData(r.email_accounts||[]); setErr(null);}}).catch((e:any)=>{if(live) setErr(e?.message||"Failed to load mailboxes");}).finally(()=>{if(live) setBusy(false);}); return ()=>{live=false;};},[]);
if (busy) return <div className="text-white/70 text-sm">Loading mailboxes…</div>; if (err) return <div className="text-red-300 text-sm">{err}</div>; if (!data||data.length===0) return <div className="text-white/60 text-sm">No mailboxes connected. Add one in Apollo to send sequences.</div>;
return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{data.map((m)=>{const limit=m.send_limit_per_day??0; const sent=m.emails_sent_today??0; const used=limit>0?Math.min(1,sent/limit):0; return <div key={m.id} className="rounded-lg border border-white/10 bg-white/5 p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-white">{m.email||m.id}</div><div className="text-xs text-white/60 mt-1">Bounce {fmtPct(m.bounce_rate)} · Reply {fmtPct(m.reply_rate)}</div></div><HealthBadge status={m.status} /></div><div className="mt-3"><div className="text-xs text-white/60 mb-1">Today: {sent}/{limit||"—"}</div><div className="h-1.5 bg-white/10 rounded"><div className="h-1.5 bg-emerald-500 rounded" style={{width:`${Math.round(used*100)}%`}} /></div></div></div>;})}</div>; }

export default function BILenderApolloTab() {
  const [sub, setSub] = useState<Sub>("sequences");
  const tabs = useMemo<{ key: Sub; label: string }[]>(() => [
    { key: "sequences", label: "Sequences" },
    { key: "replies", label: "Replies" },
    { key: "mailboxes", label: "Mailbox Health" },
  ], []);
  return <div><div className="flex gap-2 border-b border-white/10 mb-4">{tabs.map((t)=><button key={t.key} type="button" onClick={()=>setSub(t.key)} className={"px-4 py-2 text-sm border-b-2 "+(sub===t.key?"border-emerald-400 text-white":"border-transparent text-white/60 hover:text-white")}>{t.label}</button>)}</div>{sub==="sequences"&&<SequencesView />}{sub==="replies"&&<RepliesView />}{sub==="mailboxes"&&<MailboxesView />}</div>;
}
