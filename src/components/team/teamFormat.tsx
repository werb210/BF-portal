// BF_PORTAL_TEAM_PHASE_B_v661 - Team chat formatting: **bold**, _italic_, ~strike~, `code`,
// fenced code blocks, "- " bullet and "1. " numbered lists, clickable links and @mentions.
// The same plain-text markers are typed on the iPhone (the dialler renders them the same way),
// so nothing new is stored: messages stay plain text.
import type { CSSProperties, ReactNode } from "react";

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(~[^~\s][^~\n]*~)|(_[^_\s][^_\n]*_)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

function mentionize(text: string, names: string[], key: string): ReactNode[] {
  const valid = names.filter(Boolean).sort((a, b) => b.length - a.length);
  const out: ReactNode[] = [];
  let buf = ""; let i = 0; let k = 0;
  while (i < text.length) {
    if (text[i] === "@") {
      const hit = valid.find((n) => text.slice(i + 1).startsWith(n));
      if (hit) {
        if (buf) { out.push(buf); buf = ""; }
        out.push(<span key={key + "m" + k++} style={{ fontWeight: 700, textDecoration: "underline" }}>{"@" + hit}</span>);
        i += 1 + hit.length;
        continue;
      }
    }
    buf += text[i]; i += 1;
  }
  if (buf) out.push(buf);
  return out;
}

const codeStyle: CSSProperties = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.9em", background: "rgba(127,127,127,0.18)", borderRadius: 4, padding: "0 4px" };

export function renderInline(text: string, names: string[], key = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0; let k = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(...mentionize(text.slice(last, at), names, key + k++));
    const tok = m[0];
    const kk = key + "t" + k++;
    if (m[1]) out.push(<code key={kk} style={codeStyle}>{tok.slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={kk}>{renderInline(tok.slice(2, -2), names, kk)}</strong>);
    else if (m[3]) out.push(<s key={kk}>{renderInline(tok.slice(1, -1), names, kk)}</s>);
    else if (m[4]) out.push(<em key={kk}>{renderInline(tok.slice(1, -1), names, kk)}</em>);
    else out.push(<a key={kk} href={tok} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>{tok}</a>);
    last = at + tok.length;
  }
  if (last < text.length) out.push(...mentionize(text.slice(last), names, key + k++));
  return out;
}

/** Message body -> React, block by block (code fences, lists, paragraphs). */
export function renderTeamText(text: string, names: string[] = []): ReactNode {
  const lines = String(text ?? "").split("\n");
  const at = (n: number): string => lines[n] ?? "";
  const blocks: ReactNode[] = [];
  let i = 0; let k = 0;
  while (i < lines.length) {
    const line = at(i);
    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      const first = line.trim().slice(3);
      if (first.endsWith("```") && first.length >= 3) { blocks.push(<pre key={k++} style={{ ...codeStyle, display: "block", padding: 8, margin: "4px 0", whiteSpace: "pre-wrap" }}>{first.slice(0, -3)}</pre>); i += 1; continue; }
      if (first) code.push(first);
      i += 1;
      while (i < lines.length && !at(i).trim().endsWith("```")) { code.push(at(i)); i += 1; }
      if (i < lines.length) { const tail = at(i).trim().slice(0, -3); if (tail) code.push(tail); i += 1; }
      blocks.push(<pre key={k++} style={{ ...codeStyle, display: "block", padding: 8, margin: "4px 0", whiteSpace: "pre-wrap" }}>{code.join("\n")}</pre>);
      continue;
    }
    const bullet = /^\s*[-*\u2022]\s+(.*)$/;
    const numbered = /^\s*(\d+)[.)]\s+(.*)$/;
    if (bullet.test(line)) {
      const items: string[] = [];
      while (i < lines.length && bullet.test(at(i))) { items.push(at(i).replace(bullet, "$1")); i += 1; }
      blocks.push(<ul key={k++} style={{ margin: "2px 0", paddingLeft: 20 }}>{items.map((t, j) => <li key={j}>{renderInline(t, names, "b" + k + j)}</li>)}</ul>);
      continue;
    }
    if (numbered.test(line)) {
      const start = Number(line.replace(numbered, "$1")) || 1;
      const items: string[] = [];
      while (i < lines.length && numbered.test(at(i))) { items.push(at(i).replace(numbered, "$2")); i += 1; }
      blocks.push(<ol key={k++} start={start} style={{ margin: "2px 0", paddingLeft: 22 }}>{items.map((t, j) => <li key={j}>{renderInline(t, names, "n" + k + j)}</li>)}</ol>);
      continue;
    }
    blocks.push(<div key={k++} style={{ minHeight: line ? undefined : "1em" }}>{renderInline(line, names, "p" + k)}</div>);
    i += 1;
  }
  return <>{blocks}</>;
}

export type FormatKind = "bold" | "italic" | "strike" | "code" | "bullet" | "numbered";
const WRAP: Record<string, string> = { bold: "**", italic: "_", strike: "~", code: "\u0060" };

/** Apply a toolbar format to the selected text (or insert empty markers at the caret). */
export function applyFormat(value: string, start: number, end: number, kind: FormatKind): { value: string; start: number; end: number } {
  const sel = value.slice(start, end);
  if (kind === "bullet" || kind === "numbered") {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const block = value.slice(lineStart, end) || "";
    const lines = block.split("\n");
    const next = lines.map((l, n) => (kind === "bullet" ? "- " : (n + 1) + ". ") + l.replace(/^\s*([-*\u2022]|\d+[.)])\s+/, "")).join("\n");
    const out = value.slice(0, lineStart) + next + value.slice(end);
    return { value: out, start: lineStart + next.length, end: lineStart + next.length };
  }
  if (kind === "code" && sel.includes("\n")) {
    const fence = "\u0060\u0060\u0060";
    const wrapped = fence + "\n" + sel + "\n" + fence;
    return { value: value.slice(0, start) + wrapped + value.slice(end), start: start + 4, end: start + 4 + sel.length };
  }
  const mark = WRAP[kind] ?? "";
  const out = value.slice(0, start) + mark + sel + mark + value.slice(end);
  return { value: out, start: start + mark.length, end: start + mark.length + sel.length };
}

const BUTTONS: Array<{ kind: FormatKind; label: string; title: string; style?: CSSProperties }> = [
  { kind: "bold", label: "B", title: "Bold", style: { fontWeight: 800 } },
  { kind: "italic", label: "I", title: "Italic", style: { fontStyle: "italic" } },
  { kind: "strike", label: "S", title: "Strikethrough", style: { textDecoration: "line-through" } },
  { kind: "code", label: "</>", title: "Code", style: { fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11 } },
  { kind: "bullet", label: "\u2022", title: "Bulleted list" },
  { kind: "numbered", label: "1.", title: "Numbered list" },
];

/** B / I / S / code / lists toolbar for a textarea. */
export function FormatBar({ target, value, onChange }: { target: { current: HTMLTextAreaElement | null }; value: string; onChange: (next: string) => void }) {
  return (
    <div data-testid="team-format-bar" style={{ display: "flex", gap: 2 }}>
      {BUTTONS.map((b) => (
        <button key={b.kind} type="button" title={b.title} aria-label={b.title}
          onMouseDown={(e) => {
            e.preventDefault();
            const el = target.current;
            const s = el?.selectionStart ?? value.length; const t = el?.selectionEnd ?? value.length;
            const r = applyFormat(value, s, t, b.kind);
            onChange(r.value);
            setTimeout(() => { try { el?.focus(); el?.setSelectionRange(r.start, r.end); } catch { /* unmounted */ } }, 0);
          }}
          style={{ minWidth: 28, height: 26, border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-muted)", color: "var(--ui-text)", cursor: "pointer", fontSize: 13, ...b.style }}>{b.label}</button>
      ))}
    </div>
  );
}
