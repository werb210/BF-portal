// BF_PORTAL_v789_CONTRAST - every text token must reach WCAG AA (4.5:1) on every surface token, in the
// light theme, the dark theme (the default) and the .ui-surface-light scope. The token values are
// parsed from the stylesheet the app ships.
import { describe, it, expect } from "vitest";
import css from "@/styles/globals.css?raw";

type Tokens = Record<string, string>;

/** Custom properties declared directly in the first block whose selector matches. */
function block(source: string, selector: RegExp, from = 0): Tokens {
  const rest = source.slice(from);
  const m = selector.exec(rest);
  if (!m) throw new Error(`selector not found: ${selector}`);
  const open = rest.indexOf("{", m.index);
  let depth = 0;
  let end = open;
  for (let i = open; i < rest.length; i += 1) {
    if (rest[i] === "{") depth += 1;
    if (rest[i] === "}") { depth -= 1; if (depth === 0) { end = i; break; } }
  }
  const body = rest.slice(open + 1, end).replace(/\/\*[\s\S]*?\*\//g, "");
  const out: Tokens = {};
  for (const decl of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[decl[1]!] = decl[2]!.trim();
  return out;
}

function resolve(tokens: Tokens, value: string, depth = 0): string {
  if (depth > 10) throw new Error(`var() loop at ${value}`);
  const m = /^var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)$/.exec(value.trim());
  if (!m) return value.trim();
  const name = m[1]!;
  const next = tokens[name] ?? m[2];
  if (!next) throw new Error(`unresolved ${name}`);
  return resolve(tokens, next, depth + 1);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

export function luminance(hex: string): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const root = block(css, /(^|\n):root\s*\{/);
const darkMedia = block(css, /:root\s*\{/, css.indexOf("@media (prefers-color-scheme: dark)"));
const themes: Record<string, Tokens> = {
  "light (default :root)": root,
  "dark (prefers-color-scheme)": { ...root, ...darkMedia },
  'dark (data-theme="dark")': { ...root, ...block(css, /:root\[data-theme="dark"\]\s*\{/) },
  'light (data-theme="light")': { ...root, ...block(css, /:root\[data-theme="light"\]\s*\{/) },
  ".ui-surface-light under dark": { ...root, ...block(css, /:root\[data-theme="dark"\]\s*\{/), ...block(css, /\.ui-surface-light\s*\{/) },
};

const TEXT = ["--ui-text", "--ui-text-muted", "--ui-text-danger", "--ui-text-success"];
const SURFACES = ["--ui-bg", "--ui-surface", "--ui-surface-strong", "--ui-surface-muted", "--ui-surface-input"];

describe("contrast helper", () => {
  it("matches the WCAG reference values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    expect(contrast("#ffffff", "#ffffff")).toBe(1);
  });
});

describe.each(Object.entries(themes))("theme %s", (_name, tokens) => {
  for (const text of TEXT) {
    for (const surface of SURFACES) {
      it(`${text} on ${surface} is at least 4.5:1`, () => {
        const fg = resolve(tokens, `var(${text})`);
        const bg = resolve(tokens, `var(${surface})`);
        expect(contrast(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
