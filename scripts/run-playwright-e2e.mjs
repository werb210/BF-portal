import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

function resolvePlaywrightInstallLocations() {
  const result = spawnSync("npx", ["playwright", "install", "--dry-run", "chromium"], {
    shell: process.platform === "win32",
    encoding: "utf8"
  });

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("Install location:"))
    .map((line) => line.replace("Install location:", "").trim())
    .filter(Boolean);
}

function hasRequiredBrowserBinaries() {
  const installLocations = resolvePlaywrightInstallLocations();
  if (installLocations.length === 0) {
    return false;
  }
  return installLocations.every((location) => existsSync(location));
}

if (!hasRequiredBrowserBinaries()) {
  console.error("❌ Playwright browser binaries are unavailable; e2e suite must not be skipped.");
  process.exit(1);
}

const child = spawn("npx", ["playwright", "test"], {
  shell: process.platform === "win32",
  stdio: "inherit",
  env: process.env
});

child.on("close", (code) => {
  process.exit(code ?? 1);
});
