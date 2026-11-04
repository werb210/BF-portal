#!/usr/bin/env node
// BF_ANDROID_STAFF_v1 - writes android/app/google-services.json (the Firebase file push and incoming calls need)
// for the application id in android/app/build.gradle:
//   - the GOOGLE_SERVICES_JSON secret (raw JSON or base64) when it contains this application id, otherwise
//   - a build-only placeholder (the app builds and runs; it gets no pushes and cannot ring while closed).
// Prints which one it wrote; inside GitHub Actions also writes real=true|false to $GITHUB_OUTPUT.
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const androidDir = path.join(here, "..", "android");

export function applicationIdFrom(gradle) {
  const m = /applicationId\s*:\s*'([^']+)'/.exec(gradle);
  if (!m) throw new Error("android/app/build.gradle has no applicationId");
  return m[1].trim();
}

export function placeholderFor(pkg) {
  return JSON.stringify({
    project_info: { project_number: "000000000000", project_id: "portal-android-placeholder", storage_bucket: "portal-android-placeholder.appspot.com" },
    client: [{
      client_info: { mobilesdk_app_id: "1:000000000000:android:0000000000000000000000", android_client_info: { package_name: pkg } },
      oauth_client: [],
      api_key: [{ current_key: "AIzaSyKSANDROIDPLACEHOLDERKEY0000000000" }],
      services: { appinvite_service: { other_platform_oauth_client: [] } },
    }],
    configuration_version: "1",
  }, null, 2) + "\n";
}

/** The secret's text when it is a google-services.json that lists `pkg`, else null. */
export function realFileFor(pkg, secret) {
  const raw = String(secret ?? "").trim();
  if (!raw) return null;
  let text = raw;
  if (raw[0] !== "{") {
    try { text = Buffer.from(raw, "base64").toString("utf8").trim(); } catch { return null; }
  }
  try {
    const parsed = JSON.parse(text);
    const names = (parsed.client ?? []).map((c) => c?.client_info?.android_client_info?.package_name);
    return names.includes(pkg) ? `${text}\n` : null;
  } catch {
    return null;
  }
}

function main() {
  const pkg = applicationIdFrom(readFileSync(path.join(androidDir, "app", "build.gradle"), "utf8"));
  const real = realFileFor(pkg, process.env.GOOGLE_SERVICES_JSON);
  writeFileSync(path.join(androidDir, "app", "google-services.json"), real ?? placeholderFor(pkg));
  if (real) console.log(`google-services.json: the Firebase file for ${pkg}`);
  else console.log(`::notice title=Firebase::No GOOGLE_SERVICES_JSON for ${pkg} - built with a placeholder: no push alerts, and calls ring only while the app is open.`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `real=${real ? "true" : "false"}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
