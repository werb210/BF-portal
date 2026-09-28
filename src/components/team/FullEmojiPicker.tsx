// BF_PORTAL_TEAM_PHASE_B_v661 - the full emoji picker for Team chat: every standard emoji by
// category, search by name, and your recently used ones first. Used for the composer and for
// reacting with any emoji. The iPhone dialler uses the iOS emoji keyboard instead.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { EMOJI_DATA_1 } from "./emojiData1";
import { EMOJI_DATA_2 } from "./emojiData2";

export type EmojiEntry = { char: string; name: string };
export type EmojiGroup = { group: string; icon: string; emojis: EmojiEntry[] };

const RECENT_KEY = "team_recent_emojis";

/** "1f600" -> the emoji; "ca" -> the Canada flag; single BMP symbols get FE0F so they draw as emoji. */
export function emojiFromCode(code: string): string {
  if (/^[a-z]{2}$/.test(code)) return String.fromCodePoint(...Array.from(code).map((c) => 0x1f1e6 + c.charCodeAt(0) - 97));
  const cps = code.split(".").map((h) => parseInt(h, 16)).filter((n) => Number.isFinite(n));
  if (cps.length === 1 && (cps[0] ?? 0) < 0x1f000) cps.push(0xfe0f);
  if (cps.length === 2 && cps[1] === 0x20e3) cps.splice(1, 0, 0xfe0f);
  return String.fromCodePoint(...cps);
}

let cache: EmojiGroup[] | null = null;
export function emojiGroups(): EmojiGroup[] {
  if (cache) return cache;
  cache = [...EMOJI_DATA_1, ...EMOJI_DATA_2].map((row) => {
    const [group, body] = [row.slice(0, row.indexOf("=")), row.slice(row.indexOf("=") + 1)];
    const emojis = body.split(";").filter(Boolean).map((e) => {
      const bar = e.indexOf("|");
      return { char: emojiFromCode(e.slice(0, bar)), name: e.slice(bar + 1) };
    });
    return { group, icon: emojis[0]?.char ?? "?", emojis };
  });
  return cache;
}

/** Every word of the query must start a word of the name ("thumb up" finds "thumbs up"). */
export function searchEmojis(query: string, limit = 120): EmojiEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const out: EmojiEntry[] = [];
  for (const g of emojiGroups()) for (const e of g.emojis) {
    const parts = e.name.split(/[\s-]+/);
    if (words.every((w) => parts.some((p) => p.startsWith(w)))) { out.push(e); if (out.length >= limit) return out; }
  }
  return out;
}

export function readRecent(): string[] {
  try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 24) : []; } catch { return []; }
}
export function rememberEmoji(char: string): void {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([char, ...readRecent().filter((c) => c !== char)].slice(0, 24))); } catch { /* storage full or blocked */ }
}

type Props = { onPick: (emoji: string) => void; label?: string; title?: string; buttonStyle?: CSSProperties; align?: "left" | "right" };

export default function FullEmojiPicker({ onPick, label = "\u{1F642}", title = "Emoji", buttonStyle, align = "left" }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const wrap = useRef<HTMLSpanElement | null>(null);
  const groups = useMemo(() => (open ? emojiGroups() : []), [open]);
  const results = useMemo(() => searchEmojis(q), [q]);

  useEffect(() => {
    if (!open) return;
    setRecent(readRecent());
    const close = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const pick = (char: string) => { rememberEmoji(char); onPick(char); setOpen(false); setQ(""); };
  const cell = (e: EmojiEntry | string, i: number) => {
    const char = typeof e === "string" ? e : e.char;
    return (
      <button key={char + i} type="button" title={typeof e === "string" ? "" : e.name} aria-label={typeof e === "string" ? char : e.name}
        onMouseDown={(ev) => { ev.preventDefault(); pick(char); }}
        style={{ width: 32, height: 32, fontSize: 20, lineHeight: "32px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }}>{char}</button>
    );
  };

  return (
    <span ref={wrap} style={{ position: "relative", display: "inline-flex" }}>
      <button type="button" title={title} aria-label={title} data-testid="team-emoji-button" onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        style={{ background: "var(--ui-surface-muted)", border: "1px solid var(--ui-border)", borderRadius: 8, cursor: "pointer", fontSize: 16, ...buttonStyle }}>{label}</button>
      {open && (
        <div data-testid="team-emoji-panel" style={{ position: "absolute", bottom: "calc(100% + 6px)", [align]: 0, width: 324, maxWidth: "90vw", height: 340, zIndex: 50, background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", overflow: "hidden" } as CSSProperties}>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search emoji" aria-label="Search emoji"
            style={{ margin: 8, padding: "6px 8px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13, background: "var(--ui-surface-strong)", color: "var(--ui-text)" }} />
          {!q && (
            <div style={{ display: "flex", borderBottom: "1px solid var(--ui-border)", padding: "0 4px" }}>
              {groups.map((g, i) => (
                <button key={g.group} type="button" title={g.group} aria-label={g.group} onMouseDown={(e) => { e.preventDefault(); setTab(i); }}
                  style={{ flex: 1, fontSize: 16, padding: "4px 0", background: "transparent", border: "none", borderBottom: tab === i ? "2px solid var(--ui-accent-blue)" : "2px solid transparent", cursor: "pointer" }}>{g.icon}</button>
              ))}
            </div>
          )}
          <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
            {q ? (
              results.length ? <div style={{ display: "flex", flexWrap: "wrap" }}>{results.map(cell)}</div>
                : <div style={{ padding: 12, fontSize: 13, color: "var(--ui-text-muted)" }}>No emoji found</div>
            ) : (
              <>
                {recent.length > 0 && tab === 0 && (
                  <>
                    <div style={{ fontSize: 11, color: "var(--ui-text-muted)", padding: "2px 4px" }}>Recently used</div>
                    <div style={{ display: "flex", flexWrap: "wrap" }}>{recent.map(cell)}</div>
                  </>
                )}
                <div style={{ fontSize: 11, color: "var(--ui-text-muted)", padding: "2px 4px" }}>{groups[tab]?.group}</div>
                <div style={{ display: "flex", flexWrap: "wrap" }}>{(groups[tab]?.emojis ?? []).map(cell)}</div>
              </>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
