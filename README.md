# Portal

## Working with Codex / AI agents on this repo

This repo is multi-silo. Before launching any agent, set the scope:
- Add `scope:BI` (or `scope:BF`, `scope:SLF`, `scope:fullstack`) as a label on the GitHub issue or PR.
- Codex agents read `.codex/agent-instructions.md` and `.codex/scopes.json` on startup and self-enforce the policy.
- CI re-checks via `scripts/enforce-silo-scope.mjs`.

See `docs/silo-scope.md` for the full policy.

## Branch protection and merge policy

- Merges to `main` are expected to happen through pull requests.
- Branch protection is configured in GitHub repository settings.
- Direct pushes to `main` should be blocked by GitHub settings.

## CI policy

- CI is strict and blocking for pull requests.
- Installs are strict (`npm ci`) and failures are not ignored.
- Verification runs typecheck, build, tests, and output checks.
- Portal CI includes guard checks for known regressions.
