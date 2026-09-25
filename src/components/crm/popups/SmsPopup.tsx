// BF_PORTAL_BLOCK_v515_SMS_POPUP_PARITY - the contact-card SMS popup (ActionBar,
// used by BF CRM and the BI contact page) now matches the Communications SMS
// composer: one picture or PDF per text (BF-Server v497), emoji (v502) and the
// length / text counter (v500). BI texts go through the same BF-Server route.
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { PopupShell, popupInputStyle } from "./PopupShell";
import { api } from "@/api";
import { smsSegments } from "@/lib/smsSegments";
import EmojiPicker from "@/components/communications/EmojiPicker";

type Media = { name: string; contentType: string; dataUrl: string };
const ALLOWED = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024;

export function SmsPopup({ contactId, defaultPhone, onClose, onSent }: {
  contactId: string; defaultPhone?: string; onClose: () => void; onSent: () => void;
}): JSX.Element {
  const [to, setTo] = useState(defaultPhone ?? "");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<Media | null>(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function pick(file: File | undefined): void {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) { setErr("Only JPG, PNG, GIF or PDF can be sent by text."); return; }
    if (file.size > MAX_BYTES) { setErr("Files sent by text must be 5 MB or smaller."); return; }
    const reader = new FileReader();
    reader.onload = () => { setErr(null); setMedia({ name: file.name, contentType: file.type, dataUrl: String(reader.result ?? "") }); };
    reader.onerror = () => setErr("Could not read that file.");
    reader.readAsDataURL(file);
  }

  async function send(): Promise<void> {
    setSending(true); setErr(null);
    try {
      await api.post("/api/communications/sms", {
        contact_id: contactId,
        contactId,
        to,
        body,
        ...(media ? { media } : {}),
      });
      toast.success(media ? "Picture message sent" : "Text sent");
      onSent();
      onClose();
    } catch (e) {
      const details = (e as { details?: { error?: { message?: string } | string; message?: string } })?.details;
      const serverMsg = typeof details?.error === "object" ? details?.error?.message : details?.message;
      setErr(serverMsg || (e as Error)?.message || "Send failed.");
    } finally {
      setSending(false);
    }
  }

  const seg = smsSegments(body);
  return (
    <PopupShell
      title="SMS"
      onClose={onClose}
      primaryAction={{
        label: sending ? "Sending…" : "Send",
        disabled: !to || (!body.trim() && !media) || sending,
        onClick: send,
      }}
    >
      <input
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="+15551234567"
        style={{ ...popupInputStyle, marginBottom: 8 }}
      />
      <textarea spellCheck lang="en-CA" /* BF_PORTAL_SPELLCHECK_v54 */
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        placeholder={media ? `Attached: ${media.name} - add a message (optional)` : "Message…"}
        style={popupInputStyle}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,application/pdf"
          data-testid="sms-popup-attach-input"
          style={{ display: "none" }}
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }}
        />
        <button
          type="button"
          data-testid="sms-popup-attach"
          onClick={() => (media ? setMedia(null) : fileRef.current?.click())}
          title={media ? `Remove ${media.name}` : "Attach a picture or PDF"}
          style={{ padding: "4px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-text)", cursor: "pointer", fontSize: 13 }}
        >
          {media ? `\u2715 ${media.name}` : "\u{1F4CE} Picture / PDF"}
        </button>
        <EmojiPicker compact onPick={(emoji) => setBody((b) => b + emoji)} />
        <span data-testid="sms-popup-segments" style={{ marginLeft: "auto", fontSize: 11, color: seg.segments > 1 ? "#b45309" : "var(--ui-text-muted)" }}>
          {body.trim() ? `${seg.chars} characters \u00b7 ${seg.segments} text${seg.segments === 1 ? "" : "s"}` : ""}
        </span>
      </div>
      {err && <div style={{ color: "#b00020", marginTop: 8 }}>{err}</div>}
    </PopupShell>
  );
}
