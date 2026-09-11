// BF_PORTAL_BLOCK_v113_IPAD_PENCIL_QUICKLOOK_CARDSCAN
export type ParsedCard = {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  website?: string;
};

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/;
const URL_RE = /((?:https?:\/\/)?(?:www\.)?[A-Z0-9-]+\.[A-Z]{2,}(?:\/\S*)?)/i;
const TITLE_WORDS =
  /\b(ceo|cfo|coo|cto|president|vp|vice president|director|manager|owner|principal|partner|founder|broker|agent|advisor|controller|analyst|sales|account)\b/i;
const ORG_SUFFIX =
  /\b(inc|ltd|llc|llp|corp|corporation|company|co|group|holdings|enterprises|solutions|services|partners|associates)\b\.?/i;

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Formats North American numbers; anything else is returned as typed. */
export function normalizePhone(raw: string): string {
  const d = digits(raw);
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith("1")) {
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return raw.trim();
}

export function splitName(fullName: string): { firstName?: string; lastName?: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/** Extracts fields from Vision's top-to-bottom, unstructured text lines. */
export function parseBusinessCard(lines: string[]): ParsedCard {
  const clean = lines.map((line) => line.trim()).filter((line) => line.length > 0);
  const claimed = new Set<number>();
  const card: ParsedCard = {};

  clean.forEach((line, i) => {
    const hit = line.match(EMAIL);
    if (hit && !card.email) {
      card.email = hit[0].toLowerCase();
      claimed.add(i);
    }
  });
  clean.forEach((line, i) => {
    if (claimed.has(i) || card.phone) return;
    const hit = line.match(PHONE);
    if (hit && digits(hit[0]).length >= 10) {
      card.phone = normalizePhone(hit[0]);
      claimed.add(i);
    }
  });
  clean.forEach((line, i) => {
    if (!claimed.has(i) && !card.title && TITLE_WORDS.test(line) && !ORG_SUFFIX.test(line)) {
      card.title = line;
      claimed.add(i);
    }
  });
  clean.forEach((line, i) => {
    if (!claimed.has(i) && !card.company && ORG_SUFFIX.test(line)) {
      card.company = line;
      claimed.add(i);
    }
  });
  clean.forEach((line, i) => {
    if (claimed.has(i) || card.website) return;
    const hit = line.match(URL_RE);
    if (hit && !EMAIL.test(line)) {
      card.website = hit[0].toLowerCase();
      claimed.add(i);
    }
  });

  const nameIndex = clean.findIndex((line, i) => {
    const words = line.split(/\s+/).length;
    return !claimed.has(i) && !/\d/.test(line) && words >= 2 && words <= 4;
  });
  if (nameIndex >= 0) {
    const fullName = clean[nameIndex]!;
    card.fullName = fullName;
    Object.assign(card, splitName(fullName));
    claimed.add(nameIndex);
  }
  if (!card.company) {
    const index = clean.findIndex((line, i) => !claimed.has(i) && !/\d/.test(line));
    if (index >= 0) card.company = clean[index];
  }
  return card;
}
