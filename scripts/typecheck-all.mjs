// v122-tsc-parity
// Typechecks EVERY tsconfig in the repo root, not just tsconfig.json.
// The CI verify and ios-native jobs use stricter configs than the default,
// so a sandbox that only runs `tsc --noEmit` will pass code that CI rejects.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();

const configs = fs
  .readdirSync(root)
  .filter((f) => f.startsWith('tsconfig') && f.endsWith('.json'))
  .filter((f) => {
    try {
      const raw = fs.readFileSync(path.join(root, f), 'utf8');
      // Solution-style configs only reference others and check nothing.
      const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      const parsed = JSON.parse(stripped);
      if (parsed.files && parsed.files.length === 0 && parsed.references) return false;
      return true;
    } catch (err) {
      return true;
    }
  })
  .sort();

if (configs.length === 0) {
  console.error('V122 FAIL: no tsconfig files found');
  process.exit(1);
}

const tsc = path.join(root, 'node_modules', '.bin', 'tsc');
let failed = 0;

for (const config of configs) {
  console.log('V122 typecheck: ' + config);
  const result = spawnSync(tsc, ['-p', config, '--noEmit'], {
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) {
    console.error('V122 FAILED: ' + config);
    failed += 1;
  } else {
    console.log('V122 clean: ' + config);
  }
}

console.log('V122 configs checked: ' + configs.join(', '));
if (failed > 0) {
  console.error('V122 FAIL: ' + failed + ' of ' + configs.length + ' config(s) have type errors');
  process.exit(1);
}
console.log('V122 all configs clean');
