// BF_PORTAL_v876_NATIVE_DESKTOP - turns a brand (brands/<key>.json plus build settings) into the files the native desktop app
// is built from: the runtime brand the app reads, the Tauri config overlay (name, bundle id, updater), the macOS
// entitlements (Associated Domains for passkeys) and Info.plist, and the capability that lets the portal page call
// the app. Pure functions; brand.mjs writes the files and the tests call these directly.

export const BUNDLE_ID_RE = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*){2,}$/;
export const APP_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 .,()-]{0,38}[A-Za-z0-9.)]$/;
export const KEY_RE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;
export const TEAM_ID_RE = /^[A-Z0-9]{10}$/;
export const SIGN_IN_HOSTS = ["login.microsoftonline.com", "login.microsoft.com", "login.windows.net", "login.live.com"];

/** "https://staff.example.com/login" -> "https://staff.example.com"; "" for anything that is not a plain https origin. */
export function httpsOrigin(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" || !u.hostname || u.username || u.password) return "";
    return u.origin;
  } catch {
    return "";
  }
}

/** A company name made safe for an app name ("Smith & Co's Capital" -> "Smith and Cos Capital Staff Portal"). */
export function appNameFor(company) {
  const cleaned = String(company ?? "")
    .replace(/&/g, " and ")
    .replace(/[^A-Za-z0-9 .,()-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const base = cleaned ? `${cleaned} Staff Portal` : "Staff Portal";
  return base.length <= 40 ? base : `${cleaned.slice(0, 27).trim()} Staff Portal`;
}

function splitList(raw) {
  if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter(Boolean);
  return String(raw ?? "").split(/[,\s]+/).map((v) => v.trim()).filter(Boolean);
}

/** A bare hostname for an associated domain ("https://x.example.com/" and "x.example.com" -> "x.example.com"). */
export function hostOf(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const origin = httpsOrigin(s.includes("://") ? s : `https://${s}`);
  return origin ? new URL(origin).hostname : "";
}

/**
 * The brand in force: the brand file, with build settings from the environment on top
 * (DESKTOP_KEY, DESKTOP_APP_NAME, DESKTOP_COMPANY_NAME, DESKTOP_BUNDLE_ID, DESKTOP_PORTAL_URL, DESKTOP_OPS_URL,
 * DESKTOP_PASSKEY_DOMAINS, DESKTOP_RELEASE_REPO, DESKTOP_VERSION). Throws with every problem found.
 */
export function resolveBrand(base, env = {}) {
  const pick = (name, fallback) => {
    const v = env[name];
    return v !== undefined && String(v).trim() !== "" ? String(v).trim() : fallback;
  };
  const companyName = pick("DESKTOP_COMPANY_NAME", "");
  const brand = {
    key: pick("DESKTOP_KEY", base.key),
    app_name: pick("DESKTOP_APP_NAME", companyName ? appNameFor(companyName) : base.app_name),
    bundle_id: pick("DESKTOP_BUNDLE_ID", base.bundle_id),
    portal_url: httpsOrigin(pick("DESKTOP_PORTAL_URL", base.portal_url ?? "")),
    ops_url: httpsOrigin(pick("DESKTOP_OPS_URL", base.ops_url ?? "")),
    passkey_domains: splitList(pick("DESKTOP_PASSKEY_DOMAINS", base.passkey_domains ?? [])).map(hostOf).filter(Boolean),
    release_repo: pick("DESKTOP_RELEASE_REPO", base.release_repo ?? ""),
    version: pick("DESKTOP_VERSION", base.version ?? "2.0.0"),
    icon: base.icon ?? "",
  };
  const errors = [];
  if (!KEY_RE.test(String(brand.key ?? ""))) errors.push(`key "${brand.key}" must be 3-32 lowercase letters, digits or dashes`);
  if (!APP_NAME_RE.test(String(brand.app_name ?? ""))) errors.push(`app_name "${brand.app_name}" may use letters, digits, spaces and . , ( ) - (2-40 characters)`);
  if (!BUNDLE_ID_RE.test(String(brand.bundle_id ?? ""))) errors.push(`bundle_id "${brand.bundle_id}" must look like com.example.portal (lowercase)`);
  if (pick("DESKTOP_PORTAL_URL", base.portal_url ?? "") && !brand.portal_url) errors.push("portal_url must be an https address");
  if (!brand.portal_url && !brand.ops_url) errors.push("a brand without portal_url finds the company through ops_url, so ops_url (https) is required");
  if (brand.release_repo && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(brand.release_repo)) errors.push(`release_repo "${brand.release_repo}" must be owner/repo`);
  if (!/^\d+\.\d+\.\d+$/.test(brand.version)) errors.push(`version "${brand.version}" must be x.y.z`);
  if (errors.length) throw new Error(`Desktop brand problems:\n  - ${errors.join("\n  - ")}`);
  return brand;
}

/** Hosts listed under Associated Domains: the portal (when fixed) and any extra passkey domains, de-duplicated. */
export function associatedHosts(brand) {
  const hosts = [];
  const add = (h) => { if (h && !hosts.includes(h)) hosts.push(h); };
  if (brand.portal_url) add(new URL(brand.portal_url).hostname);
  for (const h of brand.passkey_domains ?? []) add(h);
  return hosts;
}

/** What the app reads at run time (src-tauri/brand.json). */
export function runtimeBrand(brand) {
  return { app_name: brand.app_name, portal_url: brand.portal_url, ops_url: brand.ops_url };
}

/** The asset names a release carries for this brand. */
export function releaseNames(brand) {
  return {
    tag: `desktop-${brand.key}-v${brand.version}`,
    manifest: `latest-${brand.key}.json`,
    channel: "desktop-latest",
  };
}

/**
 * The tauri.conf.json overlay (`tauri build --config src-tauri/tauri.brand.conf.json`).
 * opts: updaterPubkey (enables update artifacts and the updater), provisioned (embed the macOS provisioning profile),
 * windowsThumbprint (sign the Windows installer with that certificate), adhocSign (no Developer ID: ad-hoc sign).
 */
export function tauriOverlay(brand, opts = {}) {
  const updater = Boolean(opts.updaterPubkey) && Boolean(brand.release_repo);
  const names = releaseNames(brand);
  const macOS = {};
  if (opts.provisioned) macOS.files = { "embedded.provisionprofile": "embedded.provisionprofile" };
  if (opts.adhocSign) macOS.signingIdentity = "-";
  const windows = {};
  if (opts.windowsThumbprint) windows.certificateThumbprint = String(opts.windowsThumbprint).replace(/\s+/g, "").toUpperCase();
  return {
    productName: brand.app_name,
    version: brand.version,
    identifier: brand.bundle_id,
    bundle: {
      createUpdaterArtifacts: updater,
      shortDescription: brand.app_name,
      macOS,
      windows,
    },
    plugins: {
      updater: {
        pubkey: updater ? String(opts.updaterPubkey).trim() : "",
        endpoints: updater ? [`https://github.com/${brand.release_repo}/releases/download/${names.channel}/${names.manifest}`] : [],
        windows: { installMode: "passive" },
      },
    },
  };
}

function plistString(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * macOS entitlements. Hardened runtime + microphone always. Associated Domains (webcredentials for passkeys and
 * AutoFill, applinks) only when the app is signed with a provisioning profile that grants them - a Developer ID app
 * carrying that entitlement without a profile is refused by macOS at launch.
 */
export function entitlementsPlist(brand, opts = {}) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
    "  <key>com.apple.security.device.audio-input</key>",
    "  <true/>",
    "  <key>com.apple.security.network.client</key>",
    "  <true/>",
  ];
  const team = String(opts.teamId ?? "").trim();
  const hosts = associatedHosts(brand);
  if (opts.provisioned && TEAM_ID_RE.test(team) && hosts.length) {
    lines.push(
      "  <key>com.apple.application-identifier</key>",
      `  <string>${team}.${plistString(brand.bundle_id)}</string>`,
      "  <key>com.apple.developer.team-identifier</key>",
      `  <string>${team}</string>`,
      "  <key>com.apple.developer.associated-domains</key>",
      "  <array>",
    );
    for (const h of hosts) lines.push(`    <string>webcredentials:${plistString(h)}</string>`, `    <string>applinks:${plistString(h)}</string>`);
    lines.push("  </array>");
  }
  lines.push("</dict>", "</plist>", "");
  return lines.join("\n");
}

/** Info.plist additions: the microphone prompt names the app. */
export function infoPlist(brand) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
    "  <key>NSMicrophoneUsageDescription</key>",
    `  <string>${plistString(brand.app_name)} uses the microphone for phone calls placed and answered in the dialler.</string>`,
    "</dict>",
    "</plist>",
    "",
  ].join("\n");
}

/** Which pages may call the app's commands: the portal (any https site while the company is not fixed). */
export function portalCapability(brand) {
  return {
    $schema: "../gen/schemas/desktop-schema.json",
    identifier: "portal",
    description: "The staff portal page: incoming-call pop-up, unread badge, notifications, links to the browser.",
    windows: ["main"],
    remote: { urls: [brand.portal_url ? `${brand.portal_url}/*` : "https://*/*"] },
    permissions: ["allow-incoming-call", "allow-set-badge", "allow-notify", "allow-open-external"],
  };
}

/**
 * The updater manifest (latest-<key>.json) for one release. files: { "darwin-universal": { url, signature },
 * "windows-x86_64": { url, signature } } - a universal Mac build serves both Apple-chip and Intel Macs.
 */
export function updaterManifest({ version, notes = "", pubDate = new Date().toISOString(), files }) {
  const platforms = {};
  for (const [target, f] of Object.entries(files ?? {})) {
    if (!f || !f.url || !f.signature) continue;
    const entry = { url: f.url, signature: String(f.signature).trim() };
    if (target === "darwin-universal") {
      platforms["darwin-aarch64"] = entry;
      platforms["darwin-x86_64"] = entry;
    } else {
      platforms[target] = entry;
    }
  }
  if (!Object.keys(platforms).length) throw new Error("updater manifest: no signed installers found");
  return { version, notes, pub_date: pubDate, platforms };
}

/**
 * apple-app-site-association for the portal origin: lets the desktop apps (TEAMID.bundle) use its passkeys and code
 * AutoFill (webcredentials). applinks is limited to /desktop-app/* - a path the portal does not use - so ordinary
 * portal links in mail or the browser are never taken over by the app.
 */
export function appleAppSiteAssociation(appIds) {
  const ids = [...new Set(splitList(appIds).filter((id) => /^[A-Z0-9]{10}\.[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*){2,}$/.test(id)))];
  return {
    webcredentials: { apps: ids },
    applinks: { details: ids.length ? [{ appIDs: ids, components: [{ "/": "/desktop-app/*", comment: "Opens the desktop app" }] }] : [] },
  };
}
