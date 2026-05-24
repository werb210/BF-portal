// BF_PORTAL_BLOCK_v625_INBOX_COMPOSE_FULL_v1 — full compose: To/CC/BCC,
// subject, HTML-aware body, file attachments (≤3MB each, ≤10 total),
// "Insert app link" button that pastes a portal deep-link into the body,
// signature is auto-appended server-side (v635) so we just show an
// indicator. Server-side /api/o365/mail/send (v634/v645) now passes
// attachments through to Graph as fileAttachment objects.
import { useEffect, useRef, useState } from "react";
import { api } from "@/api";

type MailboxOption = { value: string; label: string };
type AppOption = { id: string; label: string };
type Attachment = { name: string; contentType: string; contentBytes: string; size: number };

const MAX_ATTACH_BYTES = 3 * 1024 * 1024;
const MAX_ATTACH_COUNT = 10;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf("base64,");
      resolve(idx >= 0 ? result.slice(idx + 7) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function O365ComposeModal({
  open,
  initialTo = "",
  fromOptions = [],
  defaultFrom = "",
  appOptions = [],
  onClose,
  onSent,
}: {
  open: boolean;
  initialTo?: string;
  fromOptions?: MailboxOption[];
  defaultFrom?: string;
  appOptions?: AppOption[];
  onClose: () => void;
  onSent?: () => void;
}) {
  const [composeTo, setComposeTo] = useState(initialTo);
  const [composeCc, setComposeCc] = useState("");
  const [composeBcc, setComposeBcc] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [composeFrom, setComposeFrom] = useState(defaultFrom);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [linkAppId, setLinkAppId] = useState("");
  const [composeSending, setComposeSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setComposeTo(initialTo);
    setComposeCc("");
    setComposeBcc("");
    setShowCcBcc(false);
    setComposeFrom(defaultFrom);
    setComposeSubject("");
    setComposeBody("");
    setAttachments([]);
    setLinkAppId("");
    setComposeError(null);
  }, [open, initialTo, defaultFrom]);

  function parseAddrs(s: string): string[] {
    return s.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setComposeError(null);
    const next: Attachment[] = [];
    for (const f of Array.from(files)) {
      if (attachments.length + next.length >= MAX_ATTACH_COUNT) {
        setComposeError(`Maximum ${MAX_ATTACH_COUNT} attachments.`);
        break;
      }
      if (f.size > MAX_ATTACH_BYTES) {
        setComposeError(`"${f.name}" is over 3MB. Attachments must be ≤3MB each.`);
        continue;
      }
      try {
        const contentBytes = await fileToBase64(f);
        next.push({ name: f.name, contentType: f.type || "application/octet-stream", contentBytes, size: f.size });
      } catch {
        setComposeError(`Couldn't read "${f.name}".`);
      }
    }
    if (next.length) setAttachments((prev) => [...prev, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  function insertAppLink() {
    if (!linkAppId) return;
    const clientBase = (typeof window !== "undefined" && (window as any).BF_CLIENT_BASE) ||
      "https://client.boreal.financial";
    const url = `${clientBase}/portal/${encodeURIComponent(linkAppId)}`;
    setComposeBody((prev) => prev + (prev && !prev.endsWith("\n") ? "\n" : "") + url + "\n");
  }

  async function sendComposed() {
    const to = parseAddrs(composeTo);
    const cc = parseAddrs(composeCc);
    const bcc = parseAddrs(composeBcc);
    if (to.length === 0) {
      setComposeError("Recipient required.");
      return;
    }
    if (!composeSubject.trim()) {
      setComposeError("Subject required.");
      return;
    }
    setComposeSending(true);
    setComposeError(null);
    try {
      const body_html = composeBody
        .split("\n")
        .map((line) => line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))
        .join("<br/>");
      await api("/api/o365/mail/send", {
        method: "POST",
        body: {
          from: composeFrom || undefined,
          to,
          cc,
          bcc,
          subject: composeSubject.trim(),
          body_html,
          attachments: attachments.map(({ name, contentType, contentBytes }) => ({ name, contentType, contentBytes })),
        },
      });
      onClose();
      onSent?.();
    } catch (e: any) {
      setComposeError(e?.message ?? "Send failed.");
    } finally {
      setComposeSending(false);
    }
  }

  if (!open) return null;

  const totalAttachBytes = attachments.reduce((sum, a) => sum + a.size, 0);
  const sizeKb = Math.round(totalAttachBytes / 1024);

  return (
    <div
      onClick={() => !composeSending && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 8, padding: 20, width: "min(680px, 92vw)", maxHeight: "92vh", overflow: "auto", color: "#000", display: "flex", flexDirection: "column", gap: 10 }}
      >
        <h3 style={{ margin: 0, fontSize: 18 }}>New message</h3>

        <select
          value={composeFrom}
          onChange={(e) => setComposeFrom(e.target.value)}
          style={{ padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, fontSize: 14, background: "#fff" }}
        >
          {fromOptions.map((option) => (
            <option key={option.value || "self"} value={option.value}>{option.label}</option>
          ))}
          {fromOptions.length === 0 && <option value="">No mailbox available</option>}
        </select>

        <input type="text" placeholder="To (comma-separated)" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} style={{ padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, fontSize: 14 }} />

        {showCcBcc ? (
          <>
            <input type="text" placeholder="Cc (comma-separated)" value={composeCc} onChange={(e) => setComposeCc(e.target.value)} style={{ padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, fontSize: 14 }} />
            <input type="text" placeholder="Bcc (comma-separated)" value={composeBcc} onChange={(e) => setComposeBcc(e.target.value)} style={{ padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, fontSize: 14 }} />
          </>
        ) : (
          <button type="button" onClick={() => setShowCcBcc(true)} style={{ alignSelf: "flex-start", padding: "4px 8px", border: "none", background: "transparent", color: "#0066cc", cursor: "pointer", fontSize: 13 }}>+ Cc / Bcc</button>
        )}

        <input type="text" placeholder="Subject" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} style={{ padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, fontSize: 14 }} />

        <textarea placeholder="Message" value={composeBody} onChange={(e) => setComposeBody(e.target.value)} rows={9} style={{ padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, fontSize: 14, resize: "vertical", fontFamily: "inherit" }} />

        {appOptions.length > 0 && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select
              value={linkAppId}
              onChange={(e) => setLinkAppId(e.target.value)}
              style={{ padding: 6, border: "1px solid #cbd6e2", borderRadius: 4, fontSize: 13, flex: 1 }}
            >
              <option value="">Link to application…</option>
              {appOptions.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
            <button type="button" onClick={insertAppLink} disabled={!linkAppId} style={{ padding: "6px 10px", border: "1px solid #cbd6e2", borderRadius: 4, background: "#fff", cursor: linkAppId ? "pointer" : "default", fontSize: 13 }}>Insert link</button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input ref={fileRef} type="file" multiple onChange={(e) => void handleFiles(e.target.files)} style={{ display: "none" }} />
            <button type="button" onClick={() => fileRef.current?.click()} style={{ padding: "6px 10px", border: "1px solid #cbd6e2", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 13 }}>📎 Attach file</button>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              {attachments.length === 0
                ? "Up to 10 files, 3MB each"
                : `${attachments.length} file${attachments.length === 1 ? "" : "s"} · ${sizeKb} KB`}
            </span>
          </div>
          {attachments.length > 0 && (
            <ul style={{ margin: 0, padding: "4px 8px", listStyle: "none", border: "1px dashed #cbd6e2", borderRadius: 4, background: "#f9fafb" }}>
              {attachments.map((a, idx) => (
                <li key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: "2px 0" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name} <span style={{ color: "#94a3b8" }}>({Math.round(a.size / 1024)} KB)</span></span>
                  <button type="button" onClick={() => removeAttachment(idx)} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: "0 4px" }} aria-label={`Remove ${a.name}`}>✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>
          Your email signature is added automatically.
        </div>

        {composeError && <div style={{ color: "#b00020", fontSize: 13 }}>{composeError}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} disabled={composeSending} style={{ padding: "8px 14px", border: "1px solid #cbd6e2", borderRadius: 4, background: "#fff", cursor: composeSending ? "default" : "pointer" }}>Cancel</button>
          <button type="button" onClick={() => void sendComposed()} disabled={composeSending} style={{ padding: "8px 14px", border: "none", borderRadius: 4, background: "#0066cc", color: "#fff", fontWeight: 600, cursor: composeSending ? "default" : "pointer" }}>{composeSending ? "Sending..." : "Send"}</button>
        </div>
      </div>
    </div>
  );
}
