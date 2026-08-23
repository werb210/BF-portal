// BF_PORTAL_SNIPPETS_v44
// Snippets are short reusable fragments stored alongside templates
// (BF-Server v65). Two ways in:
//
//   1. the Snippet dropdown in ComposerPulldowns
//   2. typing a shortcut - "/thanks" then space or tab - which expands in place
//
// The second is the one that saves time. It works in a plain textarea or
// input, so every composer can use it without being rewritten.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api";

export type Snippet = {
  id: string;
  name: string;
  channel?: string | null;
  shortcut?: string | null;
  body_text?: string | null;
  body_html?: string | null;
  subject?: string | null;
};

function unwrap(payload: unknown): Snippet[] {
  if (Array.isArray(payload)) return payload as Snippet[];
  const items = (payload as { items?: unknown })?.items;
  return Array.isArray(items) ? (items as Snippet[]) : [];
}

export function snippetBody(s: Snippet): string {
  if (s.body_text) return s.body_text;
  if (!s.body_html) return "";
  // The stored body may be HTML; a shortcut expanding into markup in an SMS
  // box would be worse than useless.
  return s.body_html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
}

export function useSnippets(channel?: string) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const payload = await api<unknown>(
          `/api/templates?snippets=1${channel ? `&channel=${encodeURIComponent(channel)}` : ""}`,
        );
        if (alive) setSnippets(unwrap(payload));
      } catch {
        // Snippets are a convenience. Failing to load them must not break the
        // composer, so this stays empty and the dropdown hides itself.
        if (alive) setSnippets([]);
      }
    })();
    return () => { alive = false; };
  }, [channel]);

  return snippets;
}

// Expands "/shortcut" into its body when the user types space, tab or enter.
// Returns the new value and where the caret should land, or null when the
// token before the caret is not a shortcut - in which case the keystroke is
// left completely alone.
export function expandShortcut(
  value: string,
  caret: number,
  snippets: Snippet[],
): { value: string; caret: number } | null {
  const before = value.slice(0, caret);
  // Only the token immediately before the caret, and only if it starts a word.
  const m = before.match(/(^|\s)\/([a-z0-9_-]{1,40})$/i);
  if (!m || !m[2]) return null;

  const token = m[2].toLowerCase();
  const hit = snippets.find((s) => String(s.shortcut ?? "").toLowerCase() === token);
  if (!hit) return null;

  const body = snippetBody(hit);
  if (!body) return null;

  const slashAt = before.length - token.length - 1;
  const next = value.slice(0, slashAt) + body + value.slice(caret);
  return { value: next, caret: slashAt + body.length };
}

export function useShortcutExpansion(
  snippets: Snippet[],
  onReplace: (value: string, caret: number) => void,
) {
  const pending = useRef<number | null>(null);

  useEffect(() => () => {
    if (pending.current !== null) window.clearTimeout(pending.current);
  }, []);

  return useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      if (e.key !== " " && e.key !== "Tab" && e.key !== "Enter") return;
      const el = e.currentTarget;
      const caret = el.selectionStart ?? el.value.length;
      const result = expandShortcut(el.value, caret, snippets);
      if (!result) return;

      e.preventDefault();
      onReplace(result.value, result.caret);

      pending.current = window.setTimeout(() => {
        try {
          el.setSelectionRange(result.caret, result.caret);
        } catch {
          /* element may have unmounted */
        }
      }, 0);
    },
    [snippets, onReplace],
  );
}
