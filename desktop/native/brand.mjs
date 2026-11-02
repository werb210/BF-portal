#!/usr/bin/env node
// BF_PORTAL_v876_NATIVE_DESKTOP - writes the brand files the native desktop app is built from (see brand-lib.mjs).
//
//   node desktop/native/brand.mjs [brands/<key>.json]
//
// Build settings come from the environment: DESKTOP_* overrides (brand-lib.mjs resolveBrand), APPLE_TEAM_ID,
// DESKTOP_PROVISIONED=1 (src-tauri/embedded.provisionprofile is in place), TAURI_UPDATER_PUBKEY,
// WINDOWS_CERT_THUMBPRINT, DESKTOP_ADHOC_SIGN=1 (no Developer ID certificate: ad-hoc sign so notifications work).
// Inside GitHub Actions the names the workflow needs are written to $GITHUB_OUTPUT.
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  associatedHosts, entitlementsPlist, infoPlist, portalCapability, releaseNames, resolveBrand, runtimeBrand, tauriOverlay,
} from "./brand-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const tauriDir = path.join(here, "src-tauri");
const brandFile = path.resolve(process.argv[2] || process.env.DESKTOP_BRAND || path.join(here, "brands", "boreal.json"));
const env = process.env;

const base = JSON.parse(readFileSync(brandFile, "utf8"));
const brand = resolveBrand(base, env);
const provisioned = env.DESKTOP_PROVISIONED === "1";
const opts = {
  teamId: env.APPLE_TEAM_ID || "",
  provisioned,
  updaterPubkey: env.TAURI_UPDATER_PUBKEY || "",
  windowsThumbprint: env.WINDOWS_CERT_THUMBPRINT || "",
  adhocSign: env.DESKTOP_ADHOC_SIGN === "1",
};
const json = (v) => `${JSON.stringify(v, null, 2)}\n`;

writeFileSync(path.join(tauriDir, "brand.json"), json(runtimeBrand(brand)));
writeFileSync(path.join(tauriDir, "tauri.brand.conf.json"), json(tauriOverlay(brand, opts)));
writeFileSync(path.join(tauriDir, "Entitlements.plist"), entitlementsPlist(brand, opts));
writeFileSync(path.join(tauriDir, "Info.plist"), infoPlist(brand));
writeFileSync(path.join(tauriDir, "capabilities", "portal.json"), json(portalCapability(brand)));

const names = releaseNames(brand);
const icon = brand.icon ? path.resolve(path.dirname(brandFile), brand.icon) : "";
const updater = tauriOverlay(brand, opts).bundle.createUpdaterArtifacts;
const hosts = associatedHosts(brand);
console.log(`Desktop brand: ${brand.app_name} (${brand.bundle_id}) v${brand.version}`);
console.log(`  portal: ${brand.portal_url || "found by work email or mobile number"}`);
console.log(`  passkeys (Associated Domains): ${provisioned && hosts.length ? hosts.join(", ") : "off (needs APPLE_TEAM_ID, a provisioning profile and a domain)"}`);
console.log(`  updater: ${updater ? `${names.channel}/${names.manifest}` : "off (needs TAURI_UPDATER_PUBKEY and release_repo)"}`);
if (env.GITHUB_OUTPUT) {
  const out = {
    key: brand.key, app_name: brand.app_name, bundle_id: brand.bundle_id, version: brand.version, tag: names.tag,
    manifest: names.manifest, channel: names.channel, updater: String(updater), icon, release_repo: brand.release_repo,
  };
  appendFileSync(env.GITHUB_OUTPUT, Object.entries(out).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");
}
