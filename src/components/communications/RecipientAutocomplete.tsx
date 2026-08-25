// BF_PORTAL_RECIPIENT_AUTOSUGGEST_v53
// The To field was a plain text input with placeholder "To (comma-separated)".
// Both lookups it needed already existed on the server and neither was wired up:
//   GET /api/tasks/staff              teammates, name + email, staff roles only
//   GET /api/crm/contacts?search=     contacts by name, email or phone
//
// Teammates are fetched once on mount (the list is small and near-static) and
// filtered client-side, so typing "andrew.p" resolves with no round trip.
// Contacts are searched server-side on a debounce because that table is large.
//
// Multiple recipients stay comma-separated - the send path splits on commas, so
// changing to a chip control would mean touching the send contract too.
import { useEffect, useMemo, useRef, useState } from "react";
// BF_PORTAL_AUTOSUGGEST_API_FIX_v56
// v53 used raw fetch("/api/..."), which resolves against the page origin -
// staff.boreal.financial - where no API exists. The portal is a static web app;
// the API is on server.boreal.financial. Worse, a raw fetch carries no auth
// token, so even the right URL would have returned 401. Both lookups failed
// silently behind their .catch and the box simply never suggested anything.
// api() resolves the base URL per silo and attaches the bearer token.
import { api } from "@/api";

type Person = { id: string; name: string; email: string; kind: "staff" | "contact" };

// BF_PORTAL_AUTOSUGGEST_SHAPE_FIX_v57
// This codebase has several response envelopes in circulation: a bare array,
// { items }, { data }, { data: { items } }, and respondOk's { <name>: rows }.
// Rather than guess per endpoint, look through all of them and take the first
// actual array.
function pickList(body: any, namedKey: string): any[] {
  const candidates = [
    body,
    body?.[namedKey],
    body?.data,
    body?.items,
    body?.data?.[namedKey],
    body?.data?.items,
  ];
  for (const c of candidates) if (Array.isArray(c)) return c;
  return [];
}

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
  value,
  onChange,
  placeholder = "To (comma-separated)",
  style,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const [staff, setStaff] = useState<Person[]>([]);
  const [contacts, setContacts] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const tail = splitTail(value).tail.trim();

  useEffect(() => {
    api<any>("/api/tasks/staff")
      .then((body) => {
        // BF_PORTAL_AUTOSUGGEST_SHAPE_FIX_v57
        // The route answers respondOk(res, { staff: rows }) - the array is under
        // "staff", which was not in the list of keys this checked. It landed on
        // the wrapper object, Array.isArray failed, and the suggestions stayed
        // empty with no error to show for it. Both known envelopes are handled
        // now, and pickList throws away anything that is not an array so a
        // future shape change degrades to "no suggestions" rather than a crash.
        const list = pickList(body, "staff");
        setStaff(
          (Array.isArray(list) ? list : [])
            .filter((u: any) => u?.email)
            .map((u: any) => ({ id: String(u.id), name: u.name || u.email, email: u.email, kind: "staff" as const })),
        );
      })
      .catch((e) => {
        // BF_PORTAL_AUTOSUGGEST_API_FIX_v56 - a silent catch is what made the
        // original bug invisible: the field looked fine and simply never
        // suggested. Log it so the next failure is findable.
        console.warn("[recipient-autocomplete] staff load failed", e);
        setStaff([]);
      });
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (tail.length < 2) { setContacts([]); return; }
    timer.current = setTimeout(() => {
      api<any>(`/api/crm/contacts?search=${encodeURIComponent(tail)}&limit=8`)
        .then((body) => {
          // BF_PORTAL_AUTOSUGGEST_SHAPE_FIX_v57 - /api/crm/contacts returns a
          // bare array on some paths and an envelope on others.
          const list = pickList(body, "contacts");
          setContacts(
            (Array.isArray(list) ? list : [])
              .filter((c: any) => c?.email)
              .map((c: any) => ({ id: String(c.id), name: c.name || c.email, email: c.email, kind: "contact" as const })),
          );
        })
        .catch((e) => {
          console.warn("[recipient-autocomplete] contact search failed", e);
          setContacts([]);
        });
    }, 200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [tail]);

  const already = useMemo(
    () => new Set(value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)),
    [value],
  );

  const matches = useMemo(() => {
    if (tail.length < 1) return [];
    const t = tail.toLowerCase();
    // Teammates first: they are who you type most often, and the whole point of
    // this is not typing a colleague's address thirty times a day.
    const s = staff.filter((p) =>
      (p.name.toLowerCase().includes(t) || p.email.toLowerCase().includes(t)) &&
      !already.has(p.email.toLowerCase()));
    const c = contacts.filter((p) => !already.has(p.email.toLowerCase()));
    const seen = new Set(s.map((p) => p.email.toLowerCase()));
    return [...s, ...c.filter((p) => !seen.has(p.email.toLowerCase()))].slice(0, 8);
  }, [staff, contacts, tail, already]);

  useEffect(() => { setActive(0); }, [tail]);

  function pick(p: Person) {
    const { head } = splitTail(value);
    onChange(`${head}${head ? " " : ""}${p.email}, `);
    setOpen(false);
    setContacts([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % matches.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + matches.length) % matches.length); }
    else if (e.key === "Enter" || e.key === "Tab") {
      // Enter picks the highlighted match. If nothing is highlighted the key
      // falls through so a typed-out address still submits normally.
      const selected = matches[active];
      if (selected) { e.preventDefault(); pick(selected); }
    } else if (e.key === "Escape") { setOpen(false); }
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
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        style={style}
      />
      {open && matches.length > 0 && (
        <div
          style={{
            position: "absolute", zIndex: 60, left: 0, right: 0, top: "100%",
            background: "var(--ui-surface, #fff)",
            border: "1px solid var(--ui-border)", borderRadius: 6,
            maxHeight: 260, overflowY: "auto",
            boxShadow: "0 8px 24px rgba(11,31,58,0.14)",
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
                background: i === active ? "var(--ui-hover, #F5F8FC)" : "transparent",
                fontSize: 13, color: "var(--ui-text)",
              }}
            >
              <span style={{ fontWeight: 600 }}>{p.name}</span>
              <span style={{ color: "var(--ui-text-muted)" }}> &nbsp;{p.email}</span>
              {p.kind === "staff" ? (
                <span style={{ float: "right", fontSize: 11, color: "var(--ui-text-muted)" }}>team</span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecipientAutocomplete;
