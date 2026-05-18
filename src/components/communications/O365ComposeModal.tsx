import { useEffect, useState } from "react";
import { api } from "@/api";

export default function O365ComposeModal({
  open,
  initialTo = "",
  onClose,
  onSent,
}: {
  open: boolean;
  initialTo?: string;
  onClose: () => void;
  onSent?: () => void;
}) {
  const [composeTo, setComposeTo] = useState(initialTo);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeSending, setComposeSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setComposeTo(initialTo);
    setComposeSubject("");
    setComposeBody("");
    setComposeError(null);
  }, [open, initialTo]);

  async function sendComposed() {
    const to = composeTo.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
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
      await api("/api/o365/mail/send", {
        method: "POST",
        body: {
          message: {
            subject: composeSubject.trim(),
            body: { contentType: "Text", content: composeBody },
            toRecipients: to.map((addr) => ({ emailAddress: { address: addr } })),
          },
          saveToSentItems: true,
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

  return (
    <div
      onClick={() => !composeSending && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 8, padding: 20, width: "min(640px, 92vw)", maxHeight: "92vh", overflow: "auto", color: "#000", display: "flex", flexDirection: "column", gap: 12 }}
      >
        <h3 style={{ margin: 0, fontSize: 18 }}>New message</h3>
        <input type="text" placeholder="To (comma-separated)" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} style={{ padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, fontSize: 14 }} />
        <input type="text" placeholder="Subject" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} style={{ padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, fontSize: 14 }} />
        <textarea placeholder="Message" value={composeBody} onChange={(e) => setComposeBody(e.target.value)} rows={10} style={{ padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, fontSize: 14, resize: "vertical", fontFamily: "inherit" }} />
        {composeError && <div style={{ color: "#b00020", fontSize: 13 }}>{composeError}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} disabled={composeSending} style={{ padding: "8px 14px", border: "1px solid #cbd6e2", borderRadius: 4, background: "#fff", cursor: composeSending ? "default" : "pointer" }}>Cancel</button>
          <button type="button" onClick={() => void sendComposed()} disabled={composeSending} style={{ padding: "8px 14px", border: "none", borderRadius: 4, background: "#0066cc", color: "#fff", fontWeight: 600, cursor: composeSending ? "default" : "pointer" }}>{composeSending ? "Sending..." : "Send"}</button>
        </div>
      </div>
    </div>
  );
}
