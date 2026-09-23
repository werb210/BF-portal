// BF_PORTAL_MAYA_MARKDOWN_v439
// Maya emits a narrow, predictable subset of markdown. Rather than take on a
// parser plus a sanitiser for four constructs, render those four directly as
// React nodes - no HTML string is ever built, so there is nothing to sanitise.
// Mirrors bf-client's src/components/mayaMarkdown.tsx (v438); keep them in step.
import type { CSSProperties, ReactNode } from "react";

const BOLD_OR_LINK = /(\*\*[^*]+\*\*)|(\[[^\]]+\]\((https?:\/\/[^)\s]+)\))/g;
const listStyle: CSSProperties = { margin: "4px 0", paddingLeft: 18 };

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
      out.push(<a key={`l${key++}`} href={match[3]} target="_blank" rel="noopener noreferrer">{label}</a>);
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
    if (ol) {
      if (tail?.kind === "ol") tail.items.push(ol[2]);
      else blocks.push({ kind: "ol", items: [ol[2]] });
    } else if (ul) {
      if (tail?.kind === "ul") tail.items.push(ul[1]);
      else blocks.push({ kind: "ul", items: [ul[1]] });
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
          return <ul key={index} style={listStyle}>{block.items.map((item, i) => <li key={i}>{renderInline(item)}</li>)}</ul>;
        }
        if (block.kind === "ol") {
          return <ol key={index} style={listStyle}>{block.items.map((item, i) => <li key={i}>{renderInline(item)}</li>)}</ol>;
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
