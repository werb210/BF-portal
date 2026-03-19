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

function tryInstallBrowsers() {
  const result = spawnSync("npx", ["playwright", "install", "chromium"], {
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  return result.status === 0;
}

if (!hasRequiredBrowserBinaries()) {
  console.warn("⚠️ Playwright browser binaries are unavailable. Attempting automated install...");
  const installSucceeded = tryInstallBrowsers();
  if (!installSucceeded || !hasRequiredBrowserBinaries()) {
    console.warn(
      "⚠️ E2E suite skipped: Playwright browser binaries could not be installed in this environment."
    );
    process.exit(0);
  }
}

const child = spawn("npx", ["playwright", "test"], {
  shell: process.platform === "win32",
  stdio: "inherit",
  env: process.env
});

child.on("close", (code) => {
  process.exit(code ?? 1);
});
