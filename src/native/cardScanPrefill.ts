// v114-card-scan-mount
// Pure mapping from a scanned business card (parsed object OR raw OCR lines)
// to a CRM contact form prefill. No native or React dependencies.

export type ContactPrefill = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  website: string;
};

const EMPTY: ContactPrefill = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  title: '',
  website: '',
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function pick(src: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = str(src[k]);
    if (v) return v;
  }
  return '';
}

export function normalizePhone(raw: unknown): string {
  const s = str(raw);
  if (!s) return '';
  const digits = s.replace(/[^0-9]/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.charAt(0) === '1') return '+' + digits;
  if (digits.length > 11) return '+' + digits;
  return s;
}

export function splitName(full: unknown): { firstName: string; lastName: string } {
  const s = str(full).replace(/\s+/g, ' ');
  if (!s) return { firstName: '', lastName: '' };
  const parts = s.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const URL_RE = /(?:https?:\/\/|www\.)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i;
const ORG_RE = /\b(inc|ltd|llc|corp|corporation|company|co|group|holdings|services|solutions|financial|capital|partners)\b/i;

export function fromLines(lines: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const rest: string[] = [];
  for (const raw of lines) {
    const line = str(raw);
    if (!line) continue;
    const em = line.match(EMAIL_RE);
    if (em && !out.email) {
      out.email = em[0];
      continue;
    }
    const digits = line.replace(/[^0-9]/g, '');
    if (digits.length >= 10 && digits.length <= 15 && !out.phone) {
      out.phone = line;
      continue;
    }
    const u = line.match(URL_RE);
    if (u && !out.website) {
      out.website = u[0];
      continue;
    }
    rest.push(line);
  }
  if (rest.length) out.fullName = rest[0];
  const tail = rest.slice(1);
  const org = tail.filter((l) => ORG_RE.test(l))[0];
  if (org) out.company = org;
  const title = tail.filter((l) => l !== org)[0];
  if (title) out.title = title;
  return out;
}

export function toContactPrefill(card: unknown): ContactPrefill {
  if (Array.isArray(card)) return toContactPrefill(fromLines(card as string[]));
  if (!card || typeof card !== 'object') return { ...EMPTY };
  const c = card as Record<string, unknown>;
  let firstName = pick(c, ['firstName', 'first_name', 'givenName']);
  let lastName = pick(c, ['lastName', 'last_name', 'familyName', 'surname']);
  if (!firstName && !lastName) {
    const s = splitName(pick(c, ['fullName', 'full_name', 'name']));
    firstName = s.firstName;
    lastName = s.lastName;
  }
  return {
    firstName,
    lastName,
    email: pick(c, ['email', 'emailAddress', 'email_address']).toLowerCase(),
    phone: normalizePhone(pick(c, ['mobile', 'cell', 'phone', 'phoneNumber', 'phone_number', 'tel'])),
    company: pick(c, ['company', 'companyName', 'company_name', 'organization', 'org', 'employer']),
    title: pick(c, ['title', 'jobTitle', 'job_title', 'role', 'position']),
    website: pick(c, ['website', 'url', 'web', 'site']),
  };
}

// Non-destructive merge: never clobbers a value the user already typed.
export function mergePrefill<T extends Record<string, unknown>>(
  current: T,
  prefill: ContactPrefill,
  overwrite = false,
): T {
  const out: Record<string, unknown> = { ...(current || {}) };
  const keys = Object.keys(prefill) as (keyof ContactPrefill)[];
  for (const k of keys) {
    const v = prefill[k];
    if (!v) continue;
    const existing = out[k as string];
    if (overwrite || existing === undefined || existing === null || existing === '') {
      out[k as string] = v;
    }
  }
  return out as T;
}
