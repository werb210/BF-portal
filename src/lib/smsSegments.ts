// BF_PORTAL_BLOCK_v500_SMS_SEGMENTS - how many texts a message will be billed as.
// Plain GSM characters: 160 per text (153 each when split). Any other character
// (emoji, curly quotes, accents outside GSM) switches the whole message to
// UCS-2: 70 per text (67 each when split).
const GSM = "@\u00a3$\u00a5\u00e8\u00e9\u00f9\u00ec\u00f2\u00c7\n\u00d8\u00f8\r\u00c5\u00e5\u0394_\u03a6\u0393\u039b\u03a9\u03a0\u03a8\u03a3\u0398\u039e\u00c6\u00e6\u00df\u00c9 !\"#\u00a4%&'()*+,-./0123456789:;<=>?\u00a1ABCDEFGHIJKLMNOPQRSTUVWXYZ\u00c4\u00d6\u00d1\u00dc\u00a7\u00bfabcdefghijklmnopqrstuvwxyz\u00e4\u00f6\u00f1\u00fc\u00e0";
const GSM_EXT = "^{}\\[~]|\u20ac";

export function smsSegments(text: string): { chars: number; segments: number; unicode: boolean } {
  const chars = [...text];
  const unicode = chars.some((c) => !GSM.includes(c) && !GSM_EXT.includes(c));
  if (unicode) {
    const n = chars.length;
    return { chars: n, unicode, segments: n === 0 ? 0 : n <= 70 ? 1 : Math.ceil(n / 67) };
  }
  const units = chars.reduce((sum, c) => sum + (GSM_EXT.includes(c) ? 2 : 1), 0);
  return { chars: chars.length, unicode, segments: units === 0 ? 0 : units <= 160 ? 1 : Math.ceil(units / 153) };
}
