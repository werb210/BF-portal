import { useEffect, useState, type CSSProperties } from "react";
import { PopupShell, popupInputStyle } from "./PopupShell";
import { crmApi, type Scope, type SharedMailbox } from "@/api/crm";

export function EmailPopup({ scope, defaultTo, onClose, onSent }: {
  scope: Scope;
  defaultTo?: string;
  onClose: () => void;
  onSent: () => void;
}): JSX.Element {
  const [mine, setMine] = useState<SharedMailbox | null>(null);
  const [shared, setShared] = useState<SharedMailbox[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(defaultTo ?? "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await crmApi.sharedMailboxes();
        if (cancelled) return;
        setMine(r.mine);
        setShared(r.shared);
        setFrom(r.mine?.address ?? r.shared[0]?.address ?? "");
      } catch {
        if (!cancelled) {
          setErr("Couldn't load mailboxes. Connect Microsoft 365 in Settings → My Profile.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function send(): Promise<void> {
    setSending(true); setErr(null);
    try {
      await crmApi.emails.send(scope, {
        from,
        to: splitList(to),
        cc: splitList(cc),
        bcc: splitList(bcc),
        subject,
        body_html: body,
      });
      onSent();
      onClose();
    } catch (e) {
      const detail = (e as { body?: { message?: string; error?: string }; message?: string });
      setErr(detail?.body?.message ?? detail?.body?.error ?? detail?.message ?? "Send failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <PopupShell
      title="Email"
      onClose={onClose}
      width={640}
      primaryAction={{
        label: sending ? "Sending…" : "Send",
        disabled: !from || !to.trim() || !subject.trim() || sending,
        onClick: send,
      }}
    >
      <Field label="From">
        <select value={from} onChange={(e) => setFrom(e.target.value)} style={popupInputStyle}>
          {mine && (
            <option value={mine.address}>
              {mine.display_name} &lt;{mine.address}&gt;
            </option>
          )}
          {shared.map(m => (
            <option key={m.address} value={m.address}>
              {m.display_name} &lt;{m.address}&gt;
            </option>
          ))}
        </select>
      </Field>
      <Field label="To"><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="comma-separated" style={popupInputStyle} /></Field>
      <Field label="Cc"><input value={cc} onChange={(e) => setCc(e.target.value)} style={popupInputStyle} /></Field>
      <Field label="Bcc"><input value={bcc} onChange={(e) => setBcc(e.target.value)} style={popupInputStyle} /></Field>
      <Field label="Subject"><input value={subject} onChange={(e) => setSubject(e.target.value)} style={popupInputStyle} /></Field>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={10}
        placeholder="Write your message…"
        style={{ ...popupInputStyle, marginTop: 8 }}
      />
      {err && <div style={{ color: "#b00020", marginTop: 8 }}>{err}</div>}
    </PopupShell>
  );
}

function splitList(s: string): string[] {
  return s.split(",").map(x => x.trim()).filter(Boolean);
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div style={fieldRow}>
      <label style={fieldLabel}>{label}</label>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

const fieldRow: CSSProperties = { display: "flex", gap: 8, alignItems: "center", marginBottom: 8 };
const fieldLabel: CSSProperties = { minWidth: 60, color: "#33475b" };
