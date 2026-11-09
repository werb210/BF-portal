// CALL_TRANSCRIPT_SEARCH_v1 - a search box inside one open call transcript. It searches only that call's summary and
// transcript, highlights every match, shows "2 of 7" and steps between matches with the arrows or Enter / Shift+Enter.
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

export function findMatches(text: string, query: string): number[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hay = text.toLowerCase();
  const out: number[] = [];
  let i = hay.indexOf(q);
  while (i !== -1) {
    out.push(i);
    i = hay.indexOf(q, i + q.length);
  }
  return out;
}

function Highlighted({ text, query, offset, active, markRefs }: {
  text: string; query: string; offset: number; active: number; markRefs: React.MutableRefObject<Record<number, HTMLElement | null>>;
}) {
  const q = query.trim();
  const starts = findMatches(text, q);
  if (!starts.length) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let last = 0;
  starts.forEach((s, n) => {
    const idx = offset + n;
    parts.push(<Fragment key={`t${n}`}>{text.slice(last, s)}</Fragment>);
    parts.push(
      <mark
        key={`m${n}`}
        data-testid="transcript-match"
        ref={(el) => { markRefs.current[idx] = el; }}
        style={{ background: idx === active ? "#F59E0B" : "#FDE68A", color: "#111827", borderRadius: 2, padding: "0 1px" }}
      >
        {text.slice(s, s + q.length)}
      </mark>,
    );
    last = s + q.length;
  });
  parts.push(<Fragment key="end">{text.slice(last)}</Fragment>);
  return <>{parts}</>;
}

export default function TranscriptSearch({ summary, text }: { summary?: string | null; text?: string | null }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const markRefs = useRef<Record<number, HTMLElement | null>>({});
  const summaryCount = useMemo(() => findMatches(summary || "", query).length, [summary, query]);
  const total = useMemo(() => summaryCount + findMatches(text || "", query).length, [summaryCount, text, query]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    const el = markRefs.current[active];
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [active, query]);

  const step = (d: number) => { if (total) setActive((a) => (a + d + total) % total); };
  const btn: React.CSSProperties = { border: "1px solid var(--ui-border, #d1d5db)", background: "transparent", borderRadius: 6, width: 28, height: 28, cursor: total ? "pointer" : "default", color: "var(--ui-text)" };

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <input
          type="search"
          aria-label="Search this transcript"
          placeholder="Search this transcript"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); step(e.shiftKey ? -1 : 1); } }}
          style={{ flex: 1, minWidth: 0, fontSize: 13, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--ui-border, #d1d5db)", background: "var(--ui-surface, #fff)", color: "var(--ui-text)" }}
        />
        {query.trim() && (
          <span data-testid="transcript-match-count" style={{ fontSize: 12, color: "var(--ui-text-muted)", whiteSpace: "nowrap" }}>
            {total ? `${active + 1} of ${total}` : "No matches"}
          </span>
        )}
        <button type="button" aria-label="Previous match" onClick={() => step(-1)} disabled={!total} style={btn}>↑</button>
        <button type="button" aria-label="Next match" onClick={() => step(1)} disabled={!total} style={btn}>↓</button>
      </div>
      {summary && (
        <div style={{ fontSize: 13, color: "var(--ui-text-muted)", fontStyle: "italic", marginBottom: 6 }}>
          <Highlighted text={summary} query={query} offset={0} active={active} markRefs={markRefs} />
        </div>
      )}
      {text && (
        <div style={{ fontSize: 13, color: "var(--ui-text)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
          <Highlighted text={text} query={query} offset={summaryCount} active={active} markRefs={markRefs} />
        </div>
      )}
    </div>
  );
}
