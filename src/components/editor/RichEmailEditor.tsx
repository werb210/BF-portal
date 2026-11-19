// BF_PORTAL_TEMPLATE_RICH_EDITOR_v1 - a formatting editor for email templates (Settings > Content > Templates and
// anywhere else an email body is written once and sent many times). Bold, italic, underline, headings, bullet and
// numbered lists, links, clear formatting, and an "Add meeting button" that inserts the {{meeting_link}} token,
// which the server turns into each sender's own "Book a meeting" button when the email goes out.
import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties } from "react";

export type RichEmailEditorHandle = { insertText: (text: string) => void; focus: () => void };

type Props = {
  value: string;
  onChange: (html: string) => void;
  /** Changes when a different template is opened, so the editor reloads its content. */
  docKey?: string;
  minHeight?: number;
  ariaLabel?: string;
  /** What "+ Meeting button" inserts. Defaults to the {{meeting_link}} token (portal templates). */
  meetingButtonHtml?: string;
  /** The help line under the editor. */
  note?: string;
};

const looksLikeHtml = (s: string) => /<(br|p|div|ul|ol|li|a|strong|em|b|i|u|h[1-6]|span|table)\b/i.test(s);
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
/** A template saved as plain text (the old textarea) opens with its line breaks kept. */
export const toEditorHtml = (raw: string): string => (!raw ? "" : looksLikeHtml(raw) ? raw : escapeHtml(raw));

/** Lists get inline markers so they show in the portal (whose base styles hide them) and in the recipient's email. */
export function styleEditorLists(root: HTMLElement | null): void {
  if (!root) return;
  root.querySelectorAll("ul").forEach((ul) => { ul.style.listStyleType = "disc"; ul.style.paddingLeft = "1.5em"; ul.style.margin = "0 0 0.5em"; });
  root.querySelectorAll("ol").forEach((ol) => { ol.style.listStyleType = "decimal"; ol.style.paddingLeft = "1.5em"; ol.style.margin = "0 0 0.5em"; });
}

const btn: CSSProperties = {
  padding: "4px 9px", border: "1px solid var(--ui-border)", borderRadius: 4, background: "var(--ui-surface-strong)",
  color: "var(--ui-text)", cursor: "pointer", fontSize: 13, lineHeight: 1.2, minWidth: 30,
};
const sel: CSSProperties = { ...btn, padding: "3px 6px", fontSize: 12 };

const RichEmailEditor = forwardRef<RichEmailEditorHandle, Props>(function RichEmailEditor(
  { value, onChange, docKey, minHeight = 220, ariaLabel = "Email body", meetingButtonHtml = "<p>{{meeting_link}}</p>", note = "{{meeting_link}} becomes the sender's “Book a meeting” button when the email is sent." },
  ref,
) {
  const box = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);

  // Load content when the editor opens or a different template is picked; never on every keystroke (the caret
  // would jump to the start).
  useEffect(() => {
    if (!box.current) return;
    box.current.innerHTML = toEditorHtml(value ?? "");
    styleEditorLists(box.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey]);

  const emit = () => {
    styleEditorLists(box.current);
    onChange(box.current?.innerHTML ?? "");
  };
  const remember = () => {
    const s = window.getSelection();
    if (s && s.rangeCount && box.current?.contains(s.anchorNode)) savedRange.current = s.getRangeAt(0).cloneRange();
  };
  const restore = () => {
    box.current?.focus();
    const s = window.getSelection();
    if (!s) return;
    if (savedRange.current && box.current?.contains(savedRange.current.startContainer)) {
      s.removeAllRanges();
      s.addRange(savedRange.current);
    } else if (box.current) {
      const r = document.createRange();
      r.selectNodeContents(box.current);
      r.collapse(false);
      s.removeAllRanges();
      s.addRange(r);
    }
  };
  const run = (cmd: string, arg?: string) => {
    restore();
    document.execCommand(cmd, false, arg);
    emit();
    remember();
  };
  const insertHtml = (html: string) => run("insertHTML", html);

  useImperativeHandle(ref, () => ({
    insertText: (text: string) => run("insertText", text),
    focus: () => box.current?.focus(),
  }));

  const addLink = () => {
    remember();
    const url = window.prompt("Link address (https://…)");
    if (!url) return;
    const clean = /^(https?:|mailto:|tel:|\{\{)/i.test(url.trim()) ? url.trim() : "https://" + url.trim();
    if (savedRange.current && !savedRange.current.collapsed) run("createLink", clean);
    else insertHtml(`<a href="${clean.replace(/"/g, "&quot;")}">${escapeHtml(clean)}</a>`);
  };

  // mousedown keeps the selection in the editor while a toolbar button is pressed.
  const keep = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div style={{ border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface, #fff)", color: "var(--ui-text, #0f172a)" }}>
      <div role="toolbar" aria-label="Formatting" style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 6, borderBottom: "1px solid var(--ui-border)" }}>
        <select
          aria-label="Text style"
          style={sel}
          value=""
          onMouseDown={remember}
          onChange={(e) => { const v = e.target.value; e.target.value = ""; if (v) run("formatBlock", v); }}
        >
          <option value="">Text style</option>
          <option value="P">Normal</option>
          <option value="H2">Heading</option>
          <option value="H3">Subheading</option>
        </select>
        <button type="button" style={{ ...btn, fontWeight: 700 }} aria-label="Bold" title="Bold" onMouseDown={keep} onClick={() => run("bold")}>B</button>
        <button type="button" style={{ ...btn, fontStyle: "italic" }} aria-label="Italic" title="Italic" onMouseDown={keep} onClick={() => run("italic")}>I</button>
        <button type="button" style={{ ...btn, textDecoration: "underline" }} aria-label="Underline" title="Underline" onMouseDown={keep} onClick={() => run("underline")}>U</button>
        <button type="button" style={btn} aria-label="Bulleted list" title="Bulleted list" onMouseDown={keep} onClick={() => run("insertUnorderedList")}>• List</button>
        <button type="button" style={btn} aria-label="Numbered list" title="Numbered list" onMouseDown={keep} onClick={() => run("insertOrderedList")}>1. List</button>
        <button type="button" style={btn} aria-label="Insert link" title="Insert link" onMouseDown={keep} onClick={addLink}>Link</button>
        <button type="button" style={btn} aria-label="Clear formatting" title="Clear formatting" onMouseDown={keep} onClick={() => run("removeFormat")}>Clear</button>
        <button
          type="button"
          style={{ ...btn, background: "#0B1F3A", color: "#fff", borderColor: "#0B1F3A", fontWeight: 600 }}
          aria-label="Add meeting button"
          title="Adds your Book a meeting button. Each sender's own booking link is used when the email goes out."
          onMouseDown={keep}
          onClick={() => insertHtml(meetingButtonHtml)}
        >
          + Meeting button
        </button>
      </div>
      <div
        ref={box}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onKeyUp={remember}
        onMouseUp={remember}
        onBlur={remember}
        style={{ minHeight, padding: 10, fontSize: 14, lineHeight: 1.5, outline: "none", color: "var(--ui-text)", overflowWrap: "anywhere" }}
      />
      <div style={{ padding: "4px 10px 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>
        {note}
      </div>
    </div>
  );
});

export default RichEmailEditor;
