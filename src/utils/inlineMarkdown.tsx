// BF_PORTAL_v884_INLINE_MARKDOWN - AI-written text (credit summary sections) sometimes carries markdown: **bold**, *italic*,
// "# Heading" lines and "- " bullets. Staff should see the formatting, never the asterisks. This renders that small subset
// as React elements (no HTML strings, so nothing is injected) and leaves everything else as plain text.
import { Fragment, type ReactNode } from "react";

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  // No look-behind: older iPad WebKit cannot parse it. Group 3 keeps the character before an *italic* run.
  const re = /\*\*([^*]+?)\*\*|__([^_]+?)__|(^|[^*\w])\*([^*\n]+?)\*(?![*\w])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined || m[2] !== undefined) out.push(<strong key={`${keyBase}-b${i++}`}>{m[1] ?? m[2]}</strong>);
    else { if (m[3]) out.push(m[3]); out.push(<em key={`${keyBase}-i${i++}`}>{m[4]}</em>); }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Plain text with the markdown marks removed (for places that cannot show bold, such as a title attribute). */
export function stripInlineMarkdown(text: string): string {
  return String(text ?? "")
    .replace(/\*\*([^*]+?)\*\*/g, "$1")
    .replace(/__([^_]+?)__/g, "$1")
    .replace(/(^|[^*\w])\*([^*\n]+?)\*(?![*\w])/g, "$1$2")
    .replace(/^#{1,6}\s+/gm, "");
}

/** Renders text keeping its line breaks; bold/italic and heading lines are shown as formatting. */
export function renderInlineMarkdown(text: string | null | undefined): ReactNode {
  const s = String(text ?? "");
  if (!s) return null;
  const lines = s.split("\n");
  return lines.map((line, n) => {
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    const body = heading ? <strong>{inline(heading[1]!, `h${n}`)}</strong> : inline(line, `l${n}`);
    return <Fragment key={n}>{body}{n < lines.length - 1 ? "\n" : null}</Fragment>;
  });
}
