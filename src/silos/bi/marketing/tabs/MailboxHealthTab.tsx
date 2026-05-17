// BF_PORTAL_BLOCK_BI_ROUND8_MARKETING_UI_v1
import { useEffect, useState } from "react";
import { api } from "@/api";

type Mailbox = {
  mailbox: string;
  channel: "sms" | "email";
  sent: number;
  delivered: number;
  opened: number;
  replied: number;
  bounced: number;
  delivery_rate: number | null;
  open_rate: number | null;
  reply_rate: number | null;
  bounce_rate: number | null;
};

const pct = (v: number | null) => (v == null ? "-" : `${(v * 100).toFixed(1)}%`);

type ApolloMailbox = { id: string; email: string | null; status: string; daily_limit: number | null; sent_today: number; bounce_rate: number | null; reply_rate: number | null };

function ApolloMailboxesSection() {
  const [boxes, setBoxes] = useState<ApolloMailbox[] | null>(null);
  const [source, setSource] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    try {
      const r = await api<{ mailboxes: ApolloMailbox[]; source?: string }>("/api/v1/bi/admin/apollo/mailboxes");
      setBoxes(Array.isArray(r.mailboxes) ? r.mailboxes : []);
      setSource(r.source || "");
      setError(null);
    } catch (e) {
      setBoxes([]);
      setError(e instanceof Error ? e.message : "Failed to load Apollo mailboxes");
    }
  };
  useEffect(() => { void load(); }, []);
  const statusColor = (s: string) => s === "active" ? "text-emerald-300" : s === "warming" ? "text-amber-300" : s === "paused" ? "text-white/50" : "text-red-300";
  return (
    <div className="bg-brand-bgAlt border border-card rounded-xl p-4 space-y-2 mb-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Apollo mailboxes</h3>
        <button onClick={() => void load()} className="text-xs text-blue-300 hover:text-blue-200">Refresh</button>
      </div>
      {error && <div className="text-xs text-red-300">{error}</div>}
      {source && <div className="text-[10px] text-white/40">source: {source}</div>}
      {boxes === null && <div className="text-xs text-white/40 italic">Loading</div>}
      {boxes !== null && boxes.length === 0 && !error && <div className="text-xs text-white/40 italic">No Apollo mailboxes connected.</div>}
      {boxes !== null && boxes.length > 0 && (
        <table className="w-full text-xs text-white">
          <thead className="text-white/50">
            <tr><th className="text-left py-1">Email</th><th className="text-left">Status</th><th className="text-right">Sent today</th><th className="text-right">Limit</th><th className="text-right">Bounce</th><th className="text-right">Reply</th></tr>
          </thead>
          <tbody>
            {boxes.map((m) => (
              <tr key={m.id} className="border-t border-white/5">
                <td className="py-1.5">{m.email || "(no email)"}</td>
                <td className={statusColor(m.status)}>{m.status}</td>
                <td className="text-right">{m.sent_today}</td>
                <td className="text-right">{m.daily_limit ?? "-"}</td>
                <td className="text-right">{m.bounce_rate != null ? (m.bounce_rate * 100).toFixed(1) + "%" : "-"}</td>
                <td className="text-right">{m.reply_rate != null ? (m.reply_rate * 100).toFixed(1) + "%" : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function MailboxHealthTab() {
  return (
    <div>
      <ApolloMailboxesSection />
      <MailboxHealthInternalSection />
    </div>
  );
}

function MailboxHealthInternalSection() {
  const [rows, setRows] = useState<Mailbox[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const r = await api<{ mailboxes: Mailbox[] }>("/api/v1/bi/marketing/mailbox-health");
        setRows(r.mailboxes || []);
      } catch {
        setRows([]);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Mailbox health (last 30 days)</h3>
      {rows.length === 0 && <p className="text-white/50 italic">No marketing sends in the last 30 days.</p>}
      {rows.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/50 text-xs">
              <th className="py-2">Mailbox</th>
              <th>Channel</th>
              <th>Sent</th>
              <th>Delivered</th>
              <th>Open rate</th>
              <th>Reply rate</th>
              <th>Bounce rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const warn = (r.bounce_rate ?? 0) > 0.05;
              return (
                <tr key={`${r.mailbox}:${r.channel}`} className={"border-t border-card " + (warn ? "bg-rose-500/5" : "")}>
                  <td className="py-2 font-mono text-xs">{r.mailbox}</td>
                  <td className="text-xs">{r.channel}</td>
                  <td>{r.sent}</td>
                  <td>{r.delivered} <span className="text-white/40 text-xs">({pct(r.delivery_rate)})</span></td>
                  <td>{pct(r.open_rate)}</td>
                  <td>{pct(r.reply_rate)}</td>
                  <td className={warn ? "text-rose-300" : ""}>{pct(r.bounce_rate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
