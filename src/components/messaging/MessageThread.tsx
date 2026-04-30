// BF_PORTAL_v67_BLOCK_2_1 — shared iMessage-style thread.
// Sender (current user) on the right, recipient on the left.
// Used by mini-portal and staff Communications tabs.
import { useMemo } from "react";
import "./MessageThread.css";

export type ThreadMessage = {
  id: string;
  authorRole: "self" | "other";
  authorName?: string;
  body: string;
  createdAt: string; // ISO
};

type Props = {
  messages: ThreadMessage[];
  onHashtagClick?: (tag: string, label: string) => void;
  emptyText?: string;
};

const HASHTAG_RE = /(^|\s)#([a-zA-Z][\w-]*)/g;

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch { return iso; }
}

function initials(name?: string): string {
  if (!name) return "··";
  const parts = name.trim().split(/\s+/);
  // BF_PORTAL_v67_BLOCK_2_1_FIX — explicit string narrowing
  const first: string = parts[0] ?? "";
  const second: string = parts[1] ?? "";
  const a: string = first.length > 0 ? first.charAt(0) : "";
  const b: string = second.length > 0 ? second.charAt(0) : "";
  const combo = (a + b).toUpperCase();
  return combo || name.slice(0, 2).toUpperCase();
}

function renderBody(
  body: string,
  onHashtagClick?: (tag: string, label: string) => void
): JSX.Element {
  const out: Array<JSX.Element | string> = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  HASHTAG_RE.lastIndex = 0;
  while ((m = HASHTAG_RE.exec(body)) !== null) {
    // BF_PORTAL_v67_BLOCK_2_1_FIX — narrow regex group accesses for strict TS
    const lead = m[1] ?? "";
    const word = m[2] ?? "";
    if (!word) { lastIdx = m.index + m[0].length; continue; }
    const before = body.slice(lastIdx, m.index + lead.length);
    if (before) out.push(before);
    const tag = `#${word}`;
    const label = word.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    out.push(
      <button
        key={`${m.index}-${tag}`}
        type="button"
        className="msg-hashtag-chip"
        onClick={() => onHashtagClick?.(tag, label)}
      >
        {label}
      </button>
    );
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < body.length) out.push(body.slice(lastIdx));
  return <>{out}</>;
}

export default function MessageThread({ messages, onHashtagClick, emptyText }: Props) {
  const items = useMemo(
    () => messages.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages]
  );
  if (items.length === 0) {
    return <div className="msg-thread msg-thread--empty">{emptyText ?? "No messages yet."}</div>;
  }
  return (
    <div className="msg-thread" role="log" aria-live="polite">
      {items.map((m) => {
        const right = m.authorRole === "self";
        return (
          <div key={m.id} className={`msg-row ${right ? "msg-row--right" : "msg-row--left"}`}>
            {!right && (
              <div className="msg-avatar" aria-hidden>{initials(m.authorName)}</div>
            )}
            <div className="msg-bubble-wrap">
              <div className={`msg-bubble ${right ? "msg-bubble--self" : "msg-bubble--other"}`}>
                {renderBody(m.body, onHashtagClick)}
              </div>
              <div className="msg-meta">
                {m.authorName ? <span>{m.authorName}</span> : null}
                <span>{formatTimestamp(m.createdAt)}</span>
              </div>
            </div>
            {right && (
              <div className="msg-avatar msg-avatar--self" aria-hidden>{initials(m.authorName)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
