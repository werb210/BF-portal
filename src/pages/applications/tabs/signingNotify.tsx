// BF_PORTAL_v857_SIGNING_NOTIFY
// What "Send for signing" actually did, signer by signer: who was emailed and texted (to which address / number, at
// what time), or exactly why not. Replaces the bare "Signing sent" line, which showed even when nobody was told.
// BF-Server (v857) returns these from POST /api/applications/:id/resend-signing and keeps the last one on the
// application (GET .../signing-readiness -> signing.notify) so the card shows it after a reload too.

export type ChannelResult = { to: string | null; status: "sent" | "failed" | "skipped"; at: string | null; reason: string | null };
export type SignerNotice = {
  index: number;
  role: string;
  name: string | null;
  isApplicant: boolean;
  alreadySigned: boolean;
  waitingFor: string | null;
  email: ChannelResult;
  sms: ChannelResult;
};
export type SigningNotify = { at?: string | null; allSigned?: boolean; replaced?: boolean; signers: SignerNotice[] };

export function readSigningNotify(v: unknown): SigningNotify | null {
  if (!v || typeof v !== "object") return null;
  const signers = (v as { signers?: unknown }).signers;
  if (!Array.isArray(signers)) return null;
  return v as SigningNotify;
}

/** "3:02 pm" today, "Oct 24, 3:02 pm" on another day. */
export function clockTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours();
  const time = (h % 12 === 0 ? 12 : h % 12) + ":" + String(d.getMinutes()).padStart(2, "0") + (h < 12 ? " am" : " pm");
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  return sameDay ? time : d.toLocaleDateString("en-CA", { month: "short", day: "numeric" }) + ", " + time;
}

export function channelLine(kind: "Email" | "Text", c: ChannelResult | null | undefined, now: Date = new Date()): string {
  if (!c) return kind + " not sent";
  if (c.status === "sent") return kind + " sent to " + (c.to ?? "?") + (c.at ? " " + clockTime(c.at, now) : "");
  if (c.status === "failed") return kind + " FAILED" + (c.to ? " to " + c.to : "") + (c.reason ? " - " + c.reason : "");
  return kind + " not sent" + (c.to ? " to " + c.to : "") + (c.reason ? " - " + c.reason : "");
}

export type SignerRow = { key: string; who: string; parts: string[]; tone: "ok" | "warn" | "bad" };
export function signerRows(n: SigningNotify, now: Date = new Date()): SignerRow[] {
  return n.signers.map((s) => {
    const who = (s.name || s.role) + (s.isApplicant ? " (applicant)" : " (" + String(s.role || "owner").toLowerCase() + ")");
    if (s.alreadySigned) return { key: String(s.index), who, parts: ["already signed"], tone: "ok" as const };
    const parts = [channelLine("Email", s.email, now), channelLine("Text", s.sms, now)];
    if (s.waitingFor) parts.push("their link opens once " + s.waitingFor + " has signed");
    const sent = [s.email, s.sms].filter((c) => c?.status === "sent").length;
    return { key: String(s.index), who, parts, tone: sent === 2 ? ("ok" as const) : sent === 1 ? ("warn" as const) : ("bad" as const) };
  });
}

export function notifySummary(n: SigningNotify): { ok: boolean; heading: string } {
  if (n.allSigned) return { ok: true, heading: "Everyone has signed - nothing to send." };
  const waiting = n.signers.filter((s) => !s.alreadySigned);
  if (waiting.length === 0) return { ok: n.signers.length > 0, heading: n.signers.length ? "Everyone has signed - nothing to send." : "Nobody was notified." };
  const reached = waiting.filter((s) => s.email?.status === "sent" || s.sms?.status === "sent");
  if (reached.length === waiting.length) return { ok: true, heading: "Signing request sent to every signer" };
  if (reached.length === 0) return { ok: false, heading: "Signing request NOT sent - nobody was reached" };
  return { ok: false, heading: "Signing request NOT sent to every signer" };
}

const TONE: Record<SignerRow["tone"], string> = { ok: "var(--ui-text)", warn: "var(--ui-text)", bad: "var(--ui-text-danger)" };

export function SigningNotifyCard({ notify }: { notify: SigningNotify }) {
  const sum = notifySummary(notify);
  const rows = signerRows(notify);
  return (
    <div
      data-testid="signing-notify"
      role="status"
      style={{ background: "var(--ui-surface-muted)", border: "1px solid " + (sum.ok ? "var(--ui-border)" : "#f87171"), borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, lineHeight: 1.5 }}
    >
      <div style={{ fontWeight: 700, color: sum.ok ? "var(--ui-text-success)" : "var(--ui-text-danger)" }}>
        {sum.heading}{notify.at ? " (" + clockTime(notify.at) + ")" : ""}
      </div>
      {notify.replaced && (
        <div data-testid="signing-notify-replaced" style={{ color: "var(--ui-text-muted)" }}>
          A new signing document was made: the old one was built with different signer details.
        </div>
      )}
      <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
        {rows.map((r) => (
          <li key={r.key} data-testid={"signing-notify-" + r.key} style={{ color: TONE[r.tone] }}>
            <strong>{r.who}:</strong> {r.parts.join("; ")}
          </li>
        ))}
      </ul>
    </div>
  );
}
