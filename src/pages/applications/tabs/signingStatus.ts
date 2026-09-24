// BF_PORTAL_BLOCK_v460_SIGNING_STARTED
// The first Send on an unsigned application does not send a package: it texts the
// applicant to sign in the client mini-portal (orchestrator stage A). Once they
// sign, BF-Server queues the package to the finalized lenders by itself. That is
// progress, not a failure, so it gets its own message instead of a red "Not sent".
// BF_PORTAL_BLOCK_v462_SIGNING_WHO - say who was texted, at what number, and when;
// a second Send resends the text (BF-Server v461), at most once every 2 minutes.
type Notice = { name?: string | null; phone?: string | null; smsSent?: boolean; resent?: boolean; throttled?: boolean; lastSentAt?: string | null };
type Orchestrator = { stageA?: { fired?: boolean; reason?: string; notice?: Notice }; stageB?: { fired?: boolean; reason?: string } };
export type SigningMessage = { tone: "success" | "error"; text: string };

export function formatPhone(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim();
  const d = s.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return s || null;
}

function formatTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function signingNotice(payload: unknown, lenderCount: number): SigningMessage | null {
  const orch = (payload as { orchestrator?: Orchestrator } | null)?.orchestrator;
  if (!orch || orch.stageB?.fired === true) return null;
  const a = orch.stageA ?? {};
  const waiting = a.reason === "already_started" && orch.stageB?.reason === "not_ready";
  if (a.fired !== true && !waiting) return null;

  const lenders = lenderCount === 1 ? "the selected lender" : "the selected lenders";
  const after = `The package goes to ${lenders} automatically once they sign.`;
  const n = a.notice;
  const who = n?.name?.trim() || "the applicant";
  const phone = formatPhone(n?.phone);
  const at = formatTime(n?.lastSentAt);

  if (n && !phone) {
    return { tone: "error", text: `${who} has no usable mobile number on the application, so the signing text could not be sent. Add their mobile number on the Application tab, then press Send again.` };
  }
  if (a.fired === true) {
    return { tone: "success", text: phone ? `Signing text sent to ${who} at ${phone}. ${after}` : `Signing request sent to the applicant. ${after}` };
  }
  if (n?.resent) return { tone: "success", text: `Signing text re-sent to ${who} at ${phone}. ${after}` };
  if (n?.throttled) return { tone: "success", text: `Waiting for ${who} to sign. The signing text went to ${phone}${at ? ` at ${at}` : ""}; you can resend it 2 minutes after the last one. ${after}` };
  if (n && !n.smsSent) return { tone: "error", text: `The signing text to ${who} at ${phone} could not be re-sent. Check the server log, then try again.` };
  return { tone: "success", text: `Waiting for the applicant to sign. ${after}` };
}
