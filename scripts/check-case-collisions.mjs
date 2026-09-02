import { execFileSync } from "node:child_process";

const trackedFiles = execFileSync("git", ["ls-files"], {
  encoding: "utf8",
}).split(/\r?\n/u).filter(Boolean);

const directories = new Set();

for (const file of trackedFiles) {
  const parts = file.split("/");

  for (let index = 1; index < parts.length; index += 1) {
    directories.add(parts.slice(0, index).join("/"));
  }
}

const pathsByLowercase = new Map();

for (const directory of [...directories].sort()) {
  const key = directory.toLowerCase();
  const paths = pathsByLowercase.get(key) ?? [];
  paths.push(directory);
  pathsByLowercase.set(key, paths);
}

const collisions = [...pathsByLowercase.values()].filter(
  (paths) => new Set(paths).size > 1,
);

if (collisions.length > 0) {
  console.error("Case-colliding tracked directories:");

  for (const paths of collisions) {
    console.error(`  ${[...new Set(paths)].join(" <-> ")}`);
  }

  process.exitCode = 1;
} else {
  console.log("No directory case collisions.");
}
