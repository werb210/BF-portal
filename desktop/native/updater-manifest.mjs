#!/usr/bin/env node
// BF_PORTAL_v876_NATIVE_DESKTOP - writes the updater manifest (latest-<key>.json) for a release from the signed installers the
// build jobs produced. The app checks https://github.com/<repo>/releases/download/desktop-latest/latest-<key>.json.
//
//   node desktop/native/updater-manifest.mjs <dir with release files> <owner/repo> <tag> <version> <out.json>
//
// Expects <dir> to hold *-mac.app.tar.gz(.sig) (universal Mac build) and/or *-windows-x64-setup.exe(.sig).
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { updaterManifest } from "./brand-lib.mjs";

const [dir, repo, tag, version, out] = process.argv.slice(2);
if (!dir || !repo || !tag || !version || !out) {
  console.error("usage: updater-manifest.mjs <dir> <owner/repo> <tag> <version> <out.json>");
  process.exit(2);
}
const files = readdirSync(dir);
const find = (suffix) => files.find((f) => f.endsWith(suffix));
const entry = (name) => {
  if (!name || !existsSync(path.join(dir, `${name}.sig`))) return null;
  return {
    url: `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(name)}`,
    signature: readFileSync(path.join(dir, `${name}.sig`), "utf8"),
  };
};
const manifest = updaterManifest({
  version,
  notes: `Version ${version}`,
  files: { "darwin-universal": entry(find("-mac.app.tar.gz")), "windows-x86_64": entry(find("-windows-x64-setup.exe")) },
});
writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${out}: ${Object.keys(manifest.platforms).join(", ")}`);
