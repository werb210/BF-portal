# Silo scope policy

This portal serves three silos: BF, BI, SLF. To prevent accidental cross-silo regressions, every PR is tagged with a scope label.

## Labels

- `scope:BF` — BF only. Cannot modify `src/silos/bi/**` or `src/silos/slf/**`.
- `scope:BI` — BI only. Cannot modify `src/silos/bf/**` or `src/silos/slf/**`.
- `scope:SLF` — SLF only. Cannot modify `src/silos/bf/**` or `src/silos/bi/**`.
- `scope:fullstack` — maintainer/cross-silo. No deny list.

## How it's enforced

- CI: `.github/workflows/silo-boundaries.yml` runs `scripts/enforce-silo-scope.mjs`.
- Local: `npm run scope:check -- --scope=BI`.
- Code review: `.github/CODEOWNERS` requires the affected silo team to approve.
- Codex: agents read `.codex/scopes.json` and refuse to write outside scope.

## What if my BI change really needs to touch shared code?

Switch the label to `scope:fullstack` and request a review from the affected silo's CODEOWNER. The CI guard becomes a no-op; the human review becomes mandatory.

## Long-term direction

When a BI-scoped change needs to modify a shared file, that's a signal that the file should grow a per-silo slot. Prefer extracting silo-specific behavior into `src/silos/<silo>/` (see `bf.pipeline.adapter.ts` for the pattern) rather than expanding branches inside shared code.
