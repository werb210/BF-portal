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
  console.warn(
    "⚠️ Playwright browser binaries are unavailable in this environment; skipping e2e suite."
  );
  process.exit(0);
}

const child = spawn("npx", ["playwright", "test"], {
  shell: process.platform === "win32",
  stdio: ["inherit", "pipe", "pipe"],
  env: process.env
});

let combinedOutput = "";

child.stdout.on("data", (chunk) => {
  const text = String(chunk);
  combinedOutput += text;
  process.stdout.write(text);
});

child.stderr.on("data", (chunk) => {
  const text = String(chunk);
  combinedOutput += text;
  process.stderr.write(text);
});

child.on("close", (code) => {
  if (code === 0) {
    process.exit(0);
  }

  const browserMissing =
    combinedOutput.includes("Executable doesn't exist") ||
    combinedOutput.includes("Please run the following command to download new browsers");

  if (browserMissing) {
    console.warn(
      "⚠️ Playwright browser binaries are unavailable in this environment; treating e2e suite as skipped."
    );
    process.exit(0);
  }

  process.exit(code ?? 1);
});
