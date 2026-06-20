// BF_PORTAL_BLOCK_v625_INBOX_COMPOSE_FULL_v1 — full compose: To/CC/BCC,
// subject, HTML-aware body, file attachments (≤3MB each, ≤10 total),
// "Insert app link" button that pastes a portal deep-link into the body,
// signature is auto-appended server-side (v635) so we just show an
// indicator. Server-side /api/o365/mail/send (v634/v645) now passes
// attachments through to Graph as fileAttachment objects.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { api } from "@/api";

type MailboxOption = { value: string; label: string };
type AppOption = { id: string; label: string };
type ComposeTemplate = {
  id: string;
  name: string;
  subject?: string | null;
  body_text?: string | null;
  body_html?: string | null;
  category?: string | null;
  is_active?: boolean | null;
};
type CollateralOption = {
  id: string;
  name: string;
  url?: string | null;
  description?: string | null;
  is_active?: boolean | null;
};
type Attachment = { name: string; contentType: string; contentBytes: string; size: number };
type OutlookDraftSummary = { id: string; subject: string; to: string[] };

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

function normalizeItems<T extends { id: string }>(value: unknown): T[] {
  const maybeItems = value && typeof value === "object" && "items" in value ? (value as { items?: unknown }).items : value;
  return Array.isArray(maybeItems)
    ? maybeItems.filter((item): item is T => Boolean(item && typeof item === "object" && typeof (item as T).id === "string"))
    : [];
}

function escapeToHtml(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
}

// BF_PORTAL_BOOKING_BUTTON_SANITIZE_v1 — collapse a mangled/nested "Book a meeting" anchor
// (from the prior double-wrap bug) back to a single clean button whenever a body is loaded
// into the editor (init / reply / edit-sent / draft), so a half-broken body can't carry the
// raw `">Book a meeting` artifact forward.
const BOOKING_BTN_STYLE =
  "display:inline-block;margin:4px 0;padding:10px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-family:Segoe UI,Arial,sans-serif";
function sanitizeBookingHtml(html: string): string {
  if (!html || html.indexOf("Book a meeting") === -1) return html;
  return html.replace(
    /<a href="<a href="([^"]*)"[^>]*>Book a meeting<\/a>"[^>]*>Book a meeting<\/a>/g,
    (_m, url) => `<a href="${url}" style="${BOOKING_BTN_STYLE}">Book a meeting</a>`,
  );
}

const tbBtn: CSSProperties = {
  padding: "3px 9px",
  border: "1px solid #cbd6e2",
  borderRadius: 4,
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
  lineHeight: 1.2,
};

export default function O365ComposeModal({
  open,
  initialTo = "",
  initialSubject = "",
  initialBody = "",
  fromOptions = [],
  defaultFrom = "",
  appOptions = [],
  onClose,
  onSent,
  logScope,
}: {
  open: boolean;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  fromOptions?: MailboxOption[];
  defaultFrom?: string;
  appOptions?: AppOption[];
  onClose: () => void;
  onSent?: () => void;
  logScope?: { kind: "contact" | "company"; id: string }; // BF_PORTAL_BLOCK_v734
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
  const [templates, setTemplates] = useState<ComposeTemplate[]>([]); // v694
  const [templateId, setTemplateId] = useState(""); // v694
  const [bookingUrl, setBookingUrl] = useState(""); // v694
  const [collateral, setCollateral] = useState<CollateralOption[]>([]); // v694
  const [collateralIds, setCollateralIds] = useState<string[]>([]); // v694
  const [selfMailboxes, setSelfMailboxes] = useState<MailboxOption[]>([]); // BF_PORTAL_BLOCK_v730 — used when caller passes no fromOptions
  const [composeSending, setComposeSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [requestReadReceipt, setRequestReadReceipt] = useState(false);
  const [requestDeliveryReceipt, setRequestDeliveryReceipt] = useState(false);
  const [importance, setImportance] = useState<"low" | "normal" | "high">("normal");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<OutlookDraftSummary[]>([]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [scheduleAt, setScheduleAt] = useState(""); // scheduleSend-marker-v320
  const lastAutosaveKeyRef = useRef("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setComposeTo(initialTo);
    setComposeCc("");
    setComposeBcc("");
    setShowCcBcc(false);
    setComposeFrom(defaultFrom);
    setComposeSubject(initialSubject);
    const initHtml = sanitizeBookingHtml(/<[a-z][\s\S]*>/i.test(initialBody) ? initialBody : escapeToHtml(initialBody));
    setComposeBody(initHtml);
    if (bodyRef.current) bodyRef.current.innerHTML = initHtml;
    setRequestReadReceipt(false);
    setRequestDeliveryReceipt(false);
    setImportance("normal");
    setDraftId(null);
    setDraftSavedAt(null);
    lastAutosaveKeyRef.current = "";
    setScheduleAt("");
    setAttachments([]);
    setLinkAppId("");
    setTemplateId("");
    setCollateralIds([]);
    setComposeError(null);
  }, [open, initialTo, initialSubject, initialBody, defaultFrom]);

  // Load the user's recent Outlook drafts so they can be reopened here.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        const r: any = await api<any>("/api/o365/mail/drafts");
        const items = r?.items ?? r?.data?.items ?? [];
        if (alive) {
          setDrafts(Array.isArray(items)
            ? items
              .filter((item: any) => item && typeof item === "object" && typeof item.id === "string")
              .map((item: any) => ({
                id: item.id,
                subject: typeof item.subject === "string" && item.subject.trim() ? item.subject : "(no subject)",
                to: normalizeDraftRecipients(item.to ?? item.toRecipients),
              }))
            : []);
        }
      } catch { /* drafts list is best-effort */ }
    })();
    return () => { alive = false; };
  }, [open]);

  // Debounced autosave: keep the in-progress message in Outlook so an accidental
  // close or crash never loses work. Fires ~25s after the last edit.
  useEffect(() => {
    if (!open) return;
    const hasContent = !!((composeBody || "").replace(/<[^>]*>/g, "").trim() || composeSubject.trim());
    if (!hasContent || composeSending || savingDraft) return;
    const autosaveKey = draftContentKey();
    if (lastAutosaveKeyRef.current === autosaveKey) return;
    const t = setTimeout(() => { void saveDraft(); }, 25000);
    return () => clearTimeout(t);
  }, [open, composeBody, composeSubject, composeTo, composeCc, composeBcc, composeFrom, importance, requestReadReceipt, requestDeliveryReceipt, composeSending, savingDraft]);

  // BF_PORTAL_BLOCK_v730 — when the caller passes no mailboxes (CRM / BI "Email"
  // actions), self-fetch them so the composer is fully drop-in everywhere and
  // never shows "No mailbox available".
  useEffect(() => {
    if (!open || fromOptions.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await api<{ mine?: { address: string; display_name?: string } | null; shared?: { address: string; display_name?: string }[] }>("/api/crm/shared-mailboxes");
        if (cancelled) return;
        const opts: MailboxOption[] = [];
        // BF_PORTAL_BLOCK_v732 — "" = send as self (/me/sendMail). Sending the
        // literal address made the server treat it as a shared-mailbox send and
        // 403 with from_not_allowed when it didn't match the Graph /me mailbox.
        if (r?.mine?.address) opts.push({ value: "", label: `${r.mine.display_name || r.mine.address} (mine)` });
        for (const s of r?.shared ?? []) if (s?.address) opts.push({ value: s.address, label: s.display_name || s.address });
        setSelfMailboxes(opts);
        const firstMailbox = opts[0]?.value;
        if (firstMailbox) setComposeFrom((curr) => curr || firstMailbox);
      } catch { /* leave empty -> "No mailbox available" */ }
    })();
    return () => { cancelled = true; };
  }, [open, fromOptions.length]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const [templateResponse, collateralResponse, bookingResponse] = await Promise.allSettled([
          api<unknown>("/api/templates"),
          api<unknown>("/api/collateral"),
          api<{ bookingUrl?: string | null; booking_url?: string | null }>("/api/o365/me/booking-url"),
        ]);
        if (cancelled) return;
        if (templateResponse.status === "fulfilled") {
          setTemplates(normalizeItems<ComposeTemplate>(templateResponse.value).filter((template) => template.is_active !== false && (((template as { channel?: string }).channel ?? "email") === "email")));
        }
        if (collateralResponse.status === "fulfilled") {
          setCollateral(normalizeItems<CollateralOption>(collateralResponse.value).filter((item) => item.is_active !== false));
        }
        if (bookingResponse.status === "fulfilled") {
          setBookingUrl(bookingResponse.value?.bookingUrl ?? bookingResponse.value?.booking_url ?? "");
        }
      } catch {
        // Individual Promise.allSettled results above keep compose usable if optional comms metadata fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

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

  function syncBody() { setComposeBody(bodyRef.current?.innerHTML ?? ""); }
  function exec(cmd: string, value?: string) {
    bodyRef.current?.focus();
    document.execCommand(cmd, false, value);
    syncBody();
  }
  function insertHtmlAtCursor(html: string) {
    bodyRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    syncBody();
  }
  function insertLinkPrompt() {
    const url = window.prompt("Link URL:", "https://");
    if (url) exec("createLink", url);
  }

  function insertAppLink() {
    if (!linkAppId) return;
    const clientBase = (typeof window !== "undefined" && (window as any).BF_CLIENT_BASE) ||
      "https://client.boreal.financial";
    const url = `${clientBase}/portal/${encodeURIComponent(linkAppId)}`;
    insertHtmlAtCursor(`<a href="${url}">${url}</a><br/>`);
  }

  function applyTemplate(nextTemplateId: string) {
    setTemplateId(nextTemplateId);
    const template = templates.find((item) => item.id === nextTemplateId);
    if (!template) return;
    if (template.subject) setComposeSubject(template.subject);
    const html = template.body_html ?? (template.body_text ? escapeToHtml(template.body_text) : "");
    if (html) insertHtmlAtCursor(html);
  }

  function insertBookingUrl() {
    if (!bookingUrl) return;
    const btn = `<a href="${bookingUrl}" style="display:inline-block;margin:4px 0;padding:10px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-family:Segoe UI,Arial,sans-serif">Book a meeting</a>`;
    insertHtmlAtCursor(btn + "<br/>");
  }

  function draftContentKey(bodyHtml = composeBody) {
    return JSON.stringify({
      from: composeFrom || "",
      to: parseAddrs(composeTo),
      cc: parseAddrs(composeCc),
      bcc: parseAddrs(composeBcc),
      subject: composeSubject,
      body_html: bodyHtml,
      importance,
      requestReadReceipt,
      requestDeliveryReceipt,
    });
  }

  async function saveDraft() {
    setSavingDraft(true);
    setComposeError(null);
    try {
      const body_html = bodyRef.current?.innerHTML ?? composeBody;
      const r: any = await api<any>("/api/o365/mail/draft", {
        method: "POST",
        body: {
          draftId: draftId || undefined,
          from: composeFrom || undefined,
          to: parseAddrs(composeTo),
          cc: parseAddrs(composeCc),
          bcc: parseAddrs(composeBcc),
          subject: composeSubject,
          body_html,
          importance,
          isReadReceiptRequested: requestReadReceipt,
          isDeliveryReceiptRequested: requestDeliveryReceipt,
        },
      });
      const id = (r?.id ?? r?.data?.id) || null;
      if (id) {
        setDraftId(id);
        setDrafts((prev) => {
          const summary = { id, subject: composeSubject.trim() || "(no subject)", to: parseAddrs(composeTo) };
          const rest = prev.filter((item) => item.id !== id);
          return [summary, ...rest];
        });
      }
      lastAutosaveKeyRef.current = draftContentKey(body_html);
      setDraftSavedAt(Date.now());
    } catch (e: any) {
      setComposeError(e?.message ?? "Couldn't save draft.");
    } finally {
      setSavingDraft(false);
    }
  }

  function normalizeDraftRecipients(value: any): string[] {
    if (Array.isArray(value)) {
      return value
        .map((item) => typeof item === "string" ? item : item?.emailAddress?.address ?? item?.address)
        .filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
    }
    if (typeof value === "string") return parseAddrs(value);
    return [];
  }

  async function loadDraft(nextDraftId: string) {
    if (!nextDraftId) return;
    setComposeError(null);
    try {
      const r: any = await api<any>(`/api/o365/mail/draft/${encodeURIComponent(nextDraftId)}`);
      const draft = r?.item ?? r?.draft ?? r?.data?.item ?? r?.data ?? r;
      const to = normalizeDraftRecipients(draft?.to ?? draft?.toRecipients);
      const cc = normalizeDraftRecipients(draft?.cc ?? draft?.ccRecipients);
      const bcc = normalizeDraftRecipients(draft?.bcc ?? draft?.bccRecipients);
      const html = sanitizeBookingHtml(draft?.body_html ?? draft?.bodyHtml ?? draft?.body?.content ?? draft?.body_text ?? draft?.bodyPreview ?? "");
      setDraftId(nextDraftId);
      setComposeTo(to.join(", "));
      setComposeCc(cc.join(", "));
      setComposeBcc(bcc.join(", "));
      setShowCcBcc(cc.length > 0 || bcc.length > 0);
      const fromAddress = typeof draft?.from === "string" ? draft.from : draft?.from?.emailAddress?.address ?? draft?.from?.address;
      if (fromAddress) setComposeFrom(fromAddress);
      setComposeSubject(draft?.subject ?? "");
      setComposeBody(html);
      if (bodyRef.current) bodyRef.current.innerHTML = html;
      if (draft?.importance === "low" || draft?.importance === "normal" || draft?.importance === "high") setImportance(draft.importance);
      if (typeof draft?.isReadReceiptRequested === "boolean") setRequestReadReceipt(draft.isReadReceiptRequested);
      if (typeof draft?.isDeliveryReceiptRequested === "boolean") setRequestDeliveryReceipt(draft.isDeliveryReceiptRequested);
      setDraftSavedAt(null);
      setScheduleAt("");
    } catch (e: any) {
      setComposeError(e?.message ?? "Couldn't open draft.");
    }
  }

  async function discardDraft(id: string) {
    try {
      await api(`/api/o365/mail/draft/${encodeURIComponent(id)}`, { method: "DELETE" });
      setDrafts((prev) => prev.filter((item) => item.id !== id));
    } catch { /* draft cleanup is best-effort after send */ }
  }

  function toggleCollateral(id: string) {
    setCollateralIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  }

  async function sendComposed(scheduleIso?: string) {
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
      // Rich-text editor: the body is already HTML. Convert any {{meeting_link}}
      // token (and legacy pasted booking URL) into the styled booking button.
      let body_html = bodyRef.current?.innerHTML ?? composeBody;
      if (bookingUrl) {
        // BF_PORTAL_BOOKING_BUTTON_NO_DOUBLE_WRAP_v1 — the toolbar "Book a meeting"
        // button already inserts a full <a href="bookingUrl" ...> anchor. Replacing
        // every bare occurrence of bookingUrl with the whole button nested a button
        // inside that anchor's href and mangled the tag (raw `">Book a meeting` leaked
        // as text). Replace the token always; only buttonize a BARE pasted URL when it
        // isn't already wrapped in an anchor href.
        const bookingButton = `<a href="${bookingUrl}" style="display:inline-block;margin:4px 0;padding:10px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-family:Segoe UI,Arial,sans-serif">Book a meeting</a>`;
        body_html = body_html.split("{{meeting_link}}").join(bookingButton);
        if (!body_html.includes(`href="${bookingUrl}"`)) {
          body_html = body_html.split(bookingUrl).join(bookingButton);
        }
      } else {
        body_html = body_html.split("{{meeting_link}}").join("");
      }
      // Refresh the server's O365 token right before sending. MSAL refreshes
      // silently (no re-login) for the SSO session; the server can't refresh on
      // its own because a browser SPA never receives a refresh token, so the
      // stored access token would otherwise die ~hourly and Graph would reject
      // the send (graph_send_failed).
      try {
        const { msalClient } = await import("@/auth/msal");
        const accounts = msalClient.getAllAccounts?.() ?? [];
        if (accounts.length) {
          const scopes = ["User.Read", "Mail.Send", "Mail.ReadWrite", "Mail.Send.Shared", "Calendars.ReadWrite", "Tasks.ReadWrite", "offline_access"];
          const result = await msalClient.acquireTokenSilent({ scopes, account: accounts[0] });
          if (result?.accessToken) {
            await api("/api/users/me/o365-tokens", {
              method: "POST",
              body: {
                access_token: result.accessToken,
                expires_in: result.expiresOn ? Math.max(0, Math.floor((result.expiresOn.getTime() - Date.now()) / 1000)) : null,
                account_id: accounts[0]?.homeAccountId ?? null,
              },
            });
          }
        }
      } catch { /* best-effort: if silent refresh fails the send will surface a clear error */ }
      await api("/api/o365/mail/send", {
        method: "POST",
        body: {
          from: composeFrom || undefined,
          to,
          cc,
          bcc,
          subject: composeSubject.trim(),
          body_html,
          isReadReceiptRequested: requestReadReceipt,
          isDeliveryReceiptRequested: requestDeliveryReceipt,
          importance,
          ...(scheduleIso ? { scheduleAt: scheduleIso } : {}),
          log_contact_id: logScope?.kind === "contact" ? logScope.id : undefined, // BF_PORTAL_BLOCK_v734
          log_company_id: logScope?.kind === "company" ? logScope.id : undefined,
          attachments: attachments.map(({ name, contentType, contentBytes }) => ({ name, contentType, contentBytes })),
          collateralIds,
        },
      });
      if (draftId) await discardDraft(draftId);
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
      onClick={() => {
        if (composeSending || savingDraft) return;
        const dirty = !!((composeBody || "").replace(/<[^>]*>/g, "").trim() || composeSubject.trim() || composeTo.trim());
        if (dirty && !window.confirm("Discard this message? Use \u201cSave draft\u201d to keep it.")) return;
        onClose();
      }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 8, padding: 20, width: "min(680px, 92vw)", maxHeight: "92vh", overflow: "auto", color: "#000", display: "flex", flexDirection: "column", gap: 10 }}
      >
        <h3 style={{ margin: 0, fontSize: 18 }}>New message</h3>

        {drafts.length > 0 && (
          <select
            value=""
            onChange={(e) => { const id = e.target.value; if (id) void loadDraft(id); }}
            disabled={composeSending || savingDraft}
            style={{ padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, fontSize: 14, background: "#fff" }}
            aria-label="Open a saved draft"
          >
            <option value="">Open a saved draft…</option>
            {drafts.map((draft) => (
              <option key={draft.id} value={draft.id}>
                {(draft.subject || "(no subject)")}{draft.to?.length ? ` — ${draft.to.join(", ")}` : ""}
              </option>
            ))}
          </select>
        )}

        <select
          value={composeFrom}
          onChange={(e) => setComposeFrom(e.target.value)}
          style={{ padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, fontSize: 14, background: "#fff" }}
        >
          {/* BF_PORTAL_BLOCK_v730 — fall back to self-fetched mailboxes */}
          {(fromOptions.length ? fromOptions : selfMailboxes).map((option) => (
            <option key={option.value || "self"} value={option.value}>{option.label}</option>
          ))}
          {fromOptions.length === 0 && selfMailboxes.length === 0 && <option value="">No mailbox available</option>}
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

        <style>{`[contenteditable][data-placeholder]:empty:before{content:attr(data-placeholder);color:#9aa5b4;}[contenteditable] ul,[contenteditable] ol{margin:4px 0 4px 22px;padding:0;}`}</style>
        {/* BF_PORTAL_BLOCK_v740_TOOLBAR_STICKY */}
        <div style={{ border: "1px solid #cbd6e2", borderRadius: 4 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, padding: 5, borderBottom: "1px solid #e2e8f0", background: "#f8fafc", position: "sticky", top: 0, zIndex: 5, borderTopLeftRadius: 4, borderTopRightRadius: 4 }}>
            <button type="button" title="Bold" onMouseDown={(e) => { e.preventDefault(); exec("bold"); }} style={tbBtn}><b>B</b></button>
            <button type="button" title="Italic" onMouseDown={(e) => { e.preventDefault(); exec("italic"); }} style={tbBtn}><i>I</i></button>
            <button type="button" title="Underline" onMouseDown={(e) => { e.preventDefault(); exec("underline"); }} style={tbBtn}><u>U</u></button>
            <button type="button" title="Bulleted list" onMouseDown={(e) => { e.preventDefault(); exec("insertUnorderedList"); }} style={tbBtn}>• List</button>
            <button type="button" title="Numbered list" onMouseDown={(e) => { e.preventDefault(); exec("insertOrderedList"); }} style={tbBtn}>1. List</button>
            <button type="button" title="Insert link" onMouseDown={(e) => { e.preventDefault(); insertLinkPrompt(); }} style={tbBtn}>🔗</button>
            <button type="button" title="Clear formatting" onMouseDown={(e) => { e.preventDefault(); exec("removeFormat"); }} style={tbBtn}>✕ⁿ</button>
          </div>
          <div
            ref={bodyRef}
            contentEditable
            suppressContentEditableWarning
            onInput={syncBody}
            data-placeholder="Message"
            style={{ minHeight: 170, maxHeight: 340, overflowY: "auto", padding: 8, fontSize: 14, outline: "none", lineHeight: 1.45 }}
          />
        </div>

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

        {/* BF_PORTAL_BLOCK_v694_COMMS — templates, booking URL, and collateral. */}
        {(templates.length > 0 || bookingUrl || collateral.length > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, border: "1px solid #e2e8f0", borderRadius: 6, background: "#f8fafc" }}>
            {templates.length > 0 && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <select
                  value={templateId}
                  onChange={(e) => applyTemplate(e.target.value)}
                  style={{ padding: 6, border: "1px solid #cbd6e2", borderRadius: 4, fontSize: 13, flex: 1, background: "#fff" }}
                >
                  <option value="">Insert template…</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}{template.category ? ` · ${template.category}` : ""}</option>
                  ))}
                </select>
              </div>
            )}
            {bookingUrl && (
              <button type="button" onClick={insertBookingUrl} style={{ alignSelf: "flex-start", padding: "6px 10px", border: "1px solid #cbd6e2", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 13 }}>Insert booking button</button>
            )}
            {collateral.length > 0 && (
              /* BF_PORTAL_BLOCK_v698_COLLATERAL_PULLDOWN_v1 — dropdown picker + removable chips (was checkboxes) */
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Collateral to include</span>
                <select
                  value=""
                  onChange={(e) => { const id = e.target.value; if (id) toggleCollateral(id); }}
                  style={{ padding: 6, border: "1px solid #cbd6e2", borderRadius: 4, fontSize: 13, background: "#fff" }}
                  aria-label="Add collateral"
                >
                  <option value="">Add collateral…</option>
                  {collateral.filter((item) => !collateralIds.includes(item.id)).map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                {collateralIds.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                    {collateralIds.map((id) => {
                      const item = collateral.find((c) => c.id === id);
                      if (!item) return null;
                      return (
                        <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#334155", background: "#e2e8f0", borderRadius: 12, padding: "2px 8px" }} title={item.description ?? item.url ?? undefined}>
                          {item.name}
                          <button type="button" onClick={() => toggleCollateral(id)} aria-label={`Remove ${item.name}`} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: 13 }}>✕</button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", fontSize: 13, color: "#334155" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} title="Asks the recipient's mail client to confirm when they open it. Recipients can decline, and many (e.g. most Gmail) never send one.">
            <input type="checkbox" checked={requestReadReceipt} onChange={(e) => setRequestReadReceipt(e.target.checked)} />
            Request read receipt
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} title="Confirms the recipient's mail server accepted the message (delivery, not read).">
            <input type="checkbox" checked={requestDeliveryReceipt} onChange={(e) => setRequestDeliveryReceipt(e.target.checked)} />
            Delivery receipt
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            Importance
            <select value={importance} onChange={(e) => setImportance(e.target.value as "low" | "normal" | "high")} style={{ padding: 4, border: "1px solid #cbd6e2", borderRadius: 4, fontSize: 13, background: "#fff" }}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>
          Your email signature is added automatically.
        </div>

        {composeError && <div style={{ color: "#b00020", fontSize: 13 }}>{composeError}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {draftId ? "Outlook draft linked" : ""}
            {draftSavedAt ? ` · Saved ${new Date(draftSavedAt).toLocaleTimeString()}` : ""}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#334155" }}>
              Schedule
              <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} disabled={composeSending || savingDraft} style={{ padding: 4, border: "1px solid #cbd6e2", borderRadius: 4, fontSize: 13 }} />
            </label>
            <button type="button" disabled={composeSending || savingDraft || !scheduleAt} onClick={() => { const iso = scheduleAt ? new Date(scheduleAt).toISOString() : ""; if (iso) void sendComposed(iso); }} style={{ padding: "8px 14px", border: "1px solid #2563eb", borderRadius: 4, background: "#fff", color: "#2563eb", fontWeight: 600, cursor: composeSending || savingDraft || !scheduleAt ? "default" : "pointer" }}>Schedule send</button>
            <button type="button" onClick={onClose} disabled={composeSending || savingDraft} style={{ padding: "8px 14px", border: "1px solid #cbd6e2", borderRadius: 4, background: "#fff", cursor: composeSending || savingDraft ? "default" : "pointer" }}>Cancel</button>
            <button type="button" onClick={() => void saveDraft()} disabled={composeSending || savingDraft} style={{ padding: "8px 14px", border: "1px solid #cbd6e2", borderRadius: 4, background: "#fff", cursor: composeSending || savingDraft ? "default" : "pointer" }}>{savingDraft ? "Saving..." : "Save draft"}</button>
            <button type="button" onClick={() => void sendComposed()} disabled={composeSending || savingDraft} style={{ padding: "8px 14px", border: "none", borderRadius: 4, background: "#0066cc", color: "#fff", fontWeight: 600, cursor: composeSending || savingDraft ? "default" : "pointer" }}>{composeSending ? "Sending..." : "Send"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
