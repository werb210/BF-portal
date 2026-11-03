// BF_PORTAL_v884_SETUP_NOTICE - staff never see raw server setting names (STRIPE_SECRET_KEY, ONFIDO_API_TOKEN, QBO_*,
// KS_*, CORPORATIONS_CANADA_API_KEY, IPINFO_TOKEN, ACTIVE_CONTRACTS_CLIENT_ENABLED ...). Everywhere except the Admin
// Settings pages the text is cleaned to a plain sentence ("Not set up yet - ask an Admin."). On the Admin Settings pages
// the plain sentence comes first and the names sit under a small "Technical details" disclosure for whoever adds them.
import type { CSSProperties, ReactNode } from "react";
import { useIsAdmin } from "@/dealTools/ui";

export const NOT_SET_UP = "Not set up yet - ask an Admin.";

// A server setting name: capitals, digits and at least one underscore (STRIPE_SECRET_KEY, KS_OPS_URL).
const SETTING_RE = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g;

/** The server setting names a piece of text mentions, in order, without repeats. */
export function settingNamesIn(text: string | null | undefined): string[] {
  const out: string[] = [];
  for (const m of String(text ?? "").match(SETTING_RE) ?? []) if (!out.includes(m)) out.push(m);
  return out;
}

/** The same text with the setting names (and the brackets and "Missing: ..." lists that held them) taken out. */
export function withoutSettingNames(text: string | null | undefined): string {
  let s = String(text ?? "");
  if (!settingNamesIn(s).length) return s;
  // "Missing: A, B, C." / "add A, B and C" / "Server settings it needs: A, B." lose the whole list.
  s = s.replace(/\b(Missing|Needs|Server settings it needs|Set|add|needs)\b:?\s*((?:[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)(?:\s*(?:,|and|or)\s*(?:[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+))*)/g, (m, word: string) =>
    /^(Missing|Needs|Server settings it needs)$/i.test(word) ? "" : `${word} the server settings`);
  s = s.replace(SETTING_RE, "");
  // Tidy what is left: "( , and )" -> "", "((x))" -> "(x)", double spaces, space before punctuation.
  for (let i = 0; i < 3; i += 1) {
    s = s.replace(/\(\s*(?:(?:,|and|or|&)\s*)*/g, "(").replace(/\s*(?:(?:,|and|or|&)\s*)*\)/g, ")");
    s = s.replace(/\(\s*\)/g, "").replace(/\(\(([^()]*)\)\)/g, "($1)").replace(/\(\s*\(([^()]*)\)\s*\)/g, "($1)");
  }
  s = s.replace(/(?:\s*(?:,|\band\b|\bor\b)\s*){2,}/g, ", ").replace(/^[\s,;:&]+/, "").replace(/^(?:and|or)\s+/i, "");
  s = s.replace(/\s{2,}/g, " ").replace(/\s+([.,;:!?)])/g, "$1").replace(/\(\s+/g, "(").replace(/([.:;])\s*\./g, "$1").replace(/:\s*\./g, ".");
  s = s.trim();
  return /^\([^()]*\)$/.test(s) ? s.slice(1, -1) : s;
}

/** Plain text for any staff screen: cleaned of setting names; a sentence that was only setting names becomes NOT_SET_UP. */
export function plainSetupText(text: string | null | undefined): string {
  const raw = String(text ?? "");
  if (!settingNamesIn(raw).length) return raw;
  const clean = withoutSettingNames(raw);
  if (!clean || clean.replace(/[^A-Za-z]/g, "").length < 8) return NOT_SET_UP;
  return /ask an admin/i.test(clean) || /settings\s*>/i.test(clean) ? clean : `${clean} ${NOT_SET_UP.replace(/^Not set up yet - a/, "A")}`;
}

const detailsStyle: CSSProperties = { marginTop: 4, fontSize: 12, color: "var(--ui-text-muted)" };
const codeStyle: CSSProperties = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, color: "var(--ui-text)", overflowWrap: "anywhere" };

/** The small "Technical details" disclosure Admin Settings pages use for the setting names. */
export function TechnicalDetails({ names, children }: { names: string[]; children?: ReactNode }) {
  if (!names.length && !children) return null;
  return (
    <details data-testid="technical-details" style={detailsStyle}>
      <summary style={{ cursor: "pointer" }}>Technical details</summary>
      {names.length ? <p style={{ margin: "4px 0 0" }}>Server settings: <span style={codeStyle}>{names.join(", ")}</span></p> : null}
      {children}
    </details>
  );
}

/**
 * Text from the server that may name server settings. `adminPage` is true only on the Admin Settings pages: Admins
 * there get the plain sentence plus "Technical details"; everyone else, and every other screen, gets the plain sentence.
 */
export function SetupText({ text, adminPage = false, as = "span", style, testId }: {
  text: string | null | undefined; adminPage?: boolean; as?: "span" | "p" | "div"; style?: CSSProperties; testId?: string;
}) {
  const isAdmin = useIsAdmin();
  const names = settingNamesIn(text);
  const Tag = as;
  if (!names.length) return <Tag style={style} data-testid={testId}>{text}</Tag>;
  const showDetails = adminPage && isAdmin;
  return (
    <Tag style={style} data-testid={testId}>
      {showDetails ? withoutSettingNames(text) || NOT_SET_UP : plainSetupText(text)}
      {showDetails ? <TechnicalDetails names={names} /> : null}
    </Tag>
  );
}

// Plain names for settings that appear as the subject of a sentence ("KS_MARKETING_FROM is not set: ...").
const SETTING_WORDS: Record<string, string> = {
  KS_MARKETING_FROM: "The Keystone sender address",
  KS_MARKETING_ADDRESS: "the Keystone mailing address",
  KS_MARKETING_WEBHOOK_PUBLIC_KEY: "the SendGrid webhook key",
};

/** Swaps setting names for plain words (known ones by name, others "a server setting"), keeping the sentence. */
export function settingNamesToWords(text: string | null | undefined): string {
  return String(text ?? "")
    .replace(/\(\s*([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\s*\)/g, "")
    .replace(SETTING_RE, (m, offset: number, all: string) => {
      const word = SETTING_WORDS[m] ?? "a server setting";
      const start = offset === 0 || /[.:!?]\s*$/.test(all.slice(0, offset));
      return start ? word.charAt(0).toUpperCase() + word.slice(1) : word.charAt(0).toLowerCase() + word.slice(1);
    })
    .replace(/\s{2,}/g, " ").replace(/\s+([.,;:)])/g, "$1").trim();
}
