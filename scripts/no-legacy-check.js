import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const banned = [
  /\bapiClient\b/,
  /\bhttpClient\b/,
  /\bsuccess\b(?=\s*\.)/,
  /\bresponse\.success\b/,
  /\bresult\.success\b/,
  /\bres\.success\b/,
  /\/api\/v1\//,
  /mockAuth/i,
  /fakeAuth/i,
];

function scan(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const full = path.join(dir, file);

    if (fs.statSync(full).isDirectory()) {
      if (full.includes(`${path.sep}test`)) continue;
      scan(full);
    } else {
      const content = fs.readFileSync(full, "utf8");

      banned.forEach((pattern) => {
        if (pattern.test(content)) {
          console.error(`BANNED PATTERN: ${pattern} in ${full}`);
          process.exit(1);
        }
      });
    }
  }
}

scan(path.join(__dirname, "../src"));
