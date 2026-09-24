// BF_PORTAL_MAYA_MARKDOWN_v439
// Maya emits a narrow, predictable subset of markdown. Rather than take on a
// parser plus a sanitiser for four constructs, render those four directly as
// React nodes - no HTML string is ever built, so there is nothing to sanitise.
// Mirrors bf-client's src/components/mayaMarkdown.tsx (v438); keep them in step.
import type { CSSProperties, ReactNode } from "react";

const BOLD_OR_LINK = /(\*\*[^*]+\*\*)|(\[[^\]]+\]\((https?:\/\/[^)\s]+)\))/g;
const listStyle: CSSProperties = { margin: "4px 0", paddingLeft: 18 };
// BF_PORTAL_BLOCK_v484_MAYA_LIST_NUMBERS - Tailwind's base reset sets
// list-style: none on every ol/ul, so Maya's numbered lists lost their numbers.
const olStyle: CSSProperties = { ...listStyle, listStyleType: "decimal", listStylePosition: "outside" };
const ulStyle: CSSProperties = { ...listStyle, listStyleType: "disc", listStylePosition: "outside" };

export function renderInline(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of line.matchAll(BOLD_OR_LINK)) {
    const at = match.index ?? 0;
    if (at > last) out.push(line.slice(last, at));
    if (match[1]) {
      out.push(<strong key={`b${key++}`}>{match[1].slice(2, -2)}</strong>);
    } else if (match[2]) {
      const label = match[2].slice(1, match[2].indexOf("]"));
      // Only http(s) reaches here - the pattern refuses javascript: and data:.
      out.push(<a key={`l${key++}`} href={match[3] ?? "#"} target="_blank" rel="noopener noreferrer">{label}</a>);
    }
    last = at + match[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out.length ? out : [line];
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

export function toBlocks(message: string): Block[] {
  const text = String(message ?? "")
    .replace(/\s+(\d{1,2})\.\s+/g, "\n$1. ")
    .replace(/\s+-\s+(?=[A-Z*])/g, "\n- ");
  const blocks: Block[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const ol = /^(\d{1,2})\.\s+(.*)$/.exec(line);
    const ul = /^[-•]\s+(.*)$/.exec(line);
    const tail = blocks[blocks.length - 1];
    // BF_PORTAL_MAYA_MARKDOWN_TYPES_v443 - RegExp.exec indexes as
    // string | undefined under noUncheckedIndexedAccess, and `if (ol)` narrows
    // the match object, not its groups. Capture once.
    if (ol) {
      const item = ol[2] ?? "";
      if (tail?.kind === "ol") tail.items.push(item);
      else blocks.push({ kind: "ol", items: [item] });
    } else if (ul) {
      const item = ul[1] ?? "";
      if (tail?.kind === "ul") tail.items.push(item);
      else blocks.push({ kind: "ul", items: [item] });
    } else if (tail?.kind === "p") {
      tail.lines.push(line);
    } else {
      blocks.push({ kind: "p", lines: [line] });
    }
  }
  return blocks;
}

export function MayaMessage({ message }: { message: string }) {
  const blocks = toBlocks(message);
  if (blocks.length === 0) return <>{message}</>;
  return (
    <>
      {blocks.map((block, index) => {
        if (block.kind === "ul") {
          return <ul key={index} style={ulStyle}>{block.items.map((item, i) => <li key={i}>{renderInline(item)}</li>)}</ul>;
        }
        if (block.kind === "ol") {
          return <ol key={index} style={olStyle}>{block.items.map((item, i) => <li key={i}>{renderInline(item)}</li>)}</ol>;
        }
        return (
          <p key={index} style={{ margin: index > 0 ? "6px 0 0" : 0 }}>
            {block.lines.map((line, i) => <span key={i}>{i > 0 ? " " : null}{renderInline(line)}</span>)}
          </p>
        );
      })}
    </>
  );
}
