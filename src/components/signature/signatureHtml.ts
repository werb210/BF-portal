// BF_PORTAL_v864_SIGNATURE_BUILDER - email-safe signature HTML from a few fields and the company's brand.
// Email clients (Outlook especially) ignore most CSS: the output is nested tables with inline styles only, Arial,
// absolute image URLs, no classes, no <style>, no flexbox. Every value is escaped. The fields are kept in an HTML
// comment at the start so the builder can reopen a saved signature (the comment is invisible in every client).

export type SignatureFields = {
  name: string;
  title: string;
  company: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  bookingUrl: string;
  bookingLabel: string;
  linkedin: string;
  x: string;
  facebook: string;
  instagram: string;
  logoUrl: string;
  color: string;
  logoWidth: number;
};

export const EMPTY_FIELDS: SignatureFields = {
  name: "", title: "", company: "", phone: "", mobile: "", email: "", website: "", bookingUrl: "", bookingLabel: "Book a meeting",
  linkedin: "", x: "", facebook: "", instagram: "", logoUrl: "", color: "#1E3A8A", logoWidth: 120,
};

/** Brand defaults per business (silo). Colours match the portal's accents and the branded email template. */
export const SILO_BRANDS: Record<string, { company: string; color: string; website: string; logoUrl: string }> = {
  BF: { company: "Boreal Financial", color: "#1E3A8A", website: "https://boreal.financial", logoUrl: "https://staff.boreal.financial/images/300_300.png" },
  BI: { company: "Boreal Insurance", color: "#2FA86A", website: "https://boreal.insure", logoUrl: "https://staff.boreal.financial/images/300_300.png" },
  SLF: { company: "Site Level Financial", color: "#B45309", website: "", logoUrl: "" },
};

const MARKER = "boreal-signature:";

export function esc(value: string): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Only http(s) and mailto/tel links reach the HTML; anything else (javascript:, data:) is dropped. */
export function safeUrl(raw: string): string {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  if (/^(mailto:|tel:)/i.test(v)) return v;
  const withScheme = /^https?:\/\//i.test(v) ? v : /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(v) ? "https://" + v : "";
  try {
    const u = new URL(withScheme);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

export function safeColor(raw: string, fallback = "#1E3A8A"): string {
  const v = String(raw ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : /^#[0-9a-f]{3}$/i.test(v) ? ("#" + v.slice(1).split("").map((c) => c + c).join("")).toUpperCase() : fallback;
}

function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [x = 0, y = 0] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Readable text: the brand colour on white when it passes 4.5:1, otherwise a dark grey. */
export function textColorOnWhite(color: string): string {
  return contrast(color, "#FFFFFF") >= 4.5 ? color : "#111827";
}

/** White or near-black lettering on a brand-coloured button, whichever reads better. */
export function textColorOn(color: string): string {
  return contrast(color, "#FFFFFF") >= contrast(color, "#111827") ? "#FFFFFF" : "#111827";
}

function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? "tel:" + digits : "";
}

function displayHost(url: string): string {
  try { return new URL(url).host.replace(/^www\./, ""); } catch { return url; }
}

/** The fields stored with the HTML, so the builder can reopen it. */
export function encodeFields(f: SignatureFields): string {
  return "<!--" + MARKER + encodeURIComponent(JSON.stringify(f)) + "-->";
}

export function decodeFields(html: string): SignatureFields | null {
  const m = /<!--boreal-signature:([^>]*?)-->/.exec(String(html ?? ""));
  if (!m) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(m[1] ?? ""));
    return parsed && typeof parsed === "object" ? { ...EMPTY_FIELDS, ...parsed } : null;
  } catch {
    return null;
  }
}

export function buildSignatureHtml(input: SignatureFields): string {
  const f = { ...EMPTY_FIELDS, ...input };
  const color = safeColor(f.color);
  const ink = textColorOnWhite(color); // brand-coloured text only where it stays readable on white
  const onBrand = textColorOn(color);
  const font = "font-family:Arial,Helvetica,sans-serif;";
  const logo = safeUrl(f.logoUrl);
  const width = Math.max(60, Math.min(200, Math.round(Number(f.logoWidth) || 120)));
  const rows: string[] = [];
  const line = (label: string, text: string, href: string) => {
    if (!text) return;
    const inner = href ? `<a href="${esc(href)}" style="color:#1F2937;text-decoration:none;">${esc(text)}</a>` : esc(text);
    rows.push(`<tr><td style="${font}font-size:13px;line-height:20px;color:#1F2937;padding:0;"><span style="color:${ink};font-weight:bold;">${esc(label)}</span>&nbsp;${inner}</td></tr>`);
  };
  line("P", f.phone, telHref(f.phone));
  line("M", f.mobile, telHref(f.mobile));
  line("E", f.email, f.email.includes("@") ? "mailto:" + f.email.trim() : "");
  const site = safeUrl(f.website);
  if (site) line("W", displayHost(site), site);

  const socials = ([["LinkedIn", f.linkedin], ["X", f.x], ["Facebook", f.facebook], ["Instagram", f.instagram]] as Array<[string, string]>)
    .map(([label, url]) => [label, safeUrl(url)] as [string, string])
    .filter(([, url]) => !!url)
    .map(([label, url]) => `<a href="${esc(url)}" style="${font}font-size:12px;color:${ink};text-decoration:none;font-weight:bold;">${esc(label)}</a>`);
  const booking = safeUrl(f.bookingUrl);

  const details = [
    f.name ? `<tr><td style="${font}font-size:16px;line-height:22px;font-weight:bold;color:#111827;padding:0;">${esc(f.name)}</td></tr>` : "",
    f.title ? `<tr><td style="${font}font-size:13px;line-height:18px;color:#4B5563;padding:0;">${esc(f.title)}</td></tr>` : "",
    f.company ? `<tr><td style="${font}font-size:13px;line-height:18px;font-weight:bold;color:${ink};padding:0 0 6px 0;">${esc(f.company)}</td></tr>` : "",
    ...rows,
    booking
      ? `<tr><td style="padding:8px 0 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td style="background:${color};border-radius:4px;padding:6px 12px;"><a href="${esc(booking)}" style="${font}font-size:12px;font-weight:bold;color:${onBrand};text-decoration:none;">${esc(f.bookingLabel || "Book a meeting")}</a></td></tr></table></td></tr>`
      : "",
    socials.length ? `<tr><td style="padding:8px 0 0 0;${font}font-size:12px;color:#6B7280;">${socials.join("&nbsp;&nbsp;|&nbsp;&nbsp;")}</td></tr>` : "",
  ].filter(Boolean).join("");

  const logoCell = logo
    ? `<td valign="top" style="padding:0 14px 0 0;border-right:2px solid ${color};"><img src="${esc(logo)}" alt="${esc(f.company || "Logo")}" width="${width}" style="display:block;width:${width}px;max-width:${width}px;height:auto;border:0;" /></td>`
    : "";
  const textPad = logo ? "padding:0 0 0 14px;" : "padding:0;";
  return (
    encodeFields(f) +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;${font}"><tr>` +
    logoCell +
    `<td valign="top" style="${textPad}"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${details}</table></td>` +
    `</tr></table>`
  );
}
