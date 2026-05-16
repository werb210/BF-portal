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

export default function MailboxHealthTab() {
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
