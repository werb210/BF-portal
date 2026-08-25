// BF_PORTAL_RECIPIENT_RANKED_v58
// Rewritten against one ranked server endpoint instead of two client-merged
// lists. The old version called /api/tasks/staff and /api/crm/contacts and
// sorted alphabetically, so "andr" put Andrea Butters above Andrew Polturak.
// /api/recipients/suggest ranks by exact match, name prefix, correspondence
// volume and recency, which is what makes Apple Mail's version feel right.
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api";

type Person = {
  id: string; name: string; email: string;
  kind: "staff" | "contact"; company?: string | null;
};

// Everything before the last comma is committed; only the fragment after it is
// being typed. Without this, "andrew.p@boreal.financial, bi" would search on the
// whole string and never match.
function splitTail(value: string): { head: string; tail: string } {
  const i = value.lastIndexOf(",");
  return i === -1
    ? { head: "", tail: value }
    : { head: value.slice(0, i + 1), tail: value.slice(i + 1) };
}

export function RecipientAutocomplete({
  value, onChange, placeholder = "To (comma-separated)", style,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const [matches, setMatches] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const tail = splitTail(value).tail.trim();
  const already = useMemo(
    () => new Set(value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)),
    [value],
  );

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (tail.length < 1) { setMatches([]); return; }
    // 150ms: fast enough to feel instant while typing, slow enough not to fire
    // a query per keystroke.
    timer.current = setTimeout(() => {
      api<any>(`/api/recipients/suggest?q=${encodeURIComponent(tail)}&limit=10`)
        .then((body) => {
          const list = Array.isArray(body?.recipients) ? body.recipients
            : Array.isArray(body?.data?.recipients) ? body.data.recipients
            : Array.isArray(body?.data) ? body.data
            : [];
          setMatches(list.filter((p: Person) => p?.email && !already.has(String(p.email).toLowerCase())));
          setActive(0);
          setOpen(true);
        })
        .catch((e) => {
          // Logged, not swallowed: a silent catch is what hid the two earlier
          // failures here (wrong origin, then wrong response shape).
          console.warn("[recipient-suggest] failed", e);
          setMatches([]);
        });
    }, 150);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [tail, already]);

  function pick(p: Person) {
    const { head } = splitTail(value);
    onChange(`${head}${head ? " " : ""}${p.email}, `);
    setOpen(false);
    setMatches([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % matches.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + matches.length) % matches.length); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(matches[active]!); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (matches.length) setOpen(true); }}
        onKeyDown={onKeyDown}
        autoComplete="off"
        spellCheck={false}
        style={style}
      />
      {open && matches.length > 0 && (
        <div
          style={{
            position: "absolute", zIndex: 60, left: 0, right: 0, top: "100%",
            background: "var(--ui-surface, #fff)",
            border: "1px solid var(--ui-border)", borderRadius: 6,
            maxHeight: 300, overflowY: "auto",
            boxShadow: "0 8px 24px rgba(11,31,58,0.16)",
          }}
        >
          {matches.map((p, i) => (
            <button
              key={`${p.kind}-${p.id}`}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(p)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "7px 10px", border: "none", cursor: "pointer",
                background: i === active ? "var(--ui-accent, #0B1F3A)" : "transparent",
                color: i === active ? "#fff" : "var(--ui-text)",
                fontSize: 13,
              }}
            >
              {/* "Name — email", the format Apple Mail uses and the one that
                  lets you confirm the right person at a glance. */}
              <span style={{ fontWeight: 600 }}>{p.name}</span>
              <span style={{ opacity: i === active ? 0.85 : 0.6 }}> — {p.email}</span>
              {p.company ? (
                <span style={{ opacity: i === active ? 0.7 : 0.45, fontSize: 11 }}> · {p.company}</span>
              ) : null}
              {p.kind === "staff" ? (
                <span style={{ float: "right", fontSize: 11, opacity: 0.7 }}>team</span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecipientAutocomplete;
