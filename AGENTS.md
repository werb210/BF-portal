# Codex Agent Instructions — bf-staff-portal

You are working in a multi-silo portal that serves three independent business lines: BF (Boreal Financial), BI (Boreal Insurance), and SLF (Site Level Financial). Cross-silo writes are a serious bug source. Read this file before writing anything.

## Step 1 — Read the scope policy
Before your first file edit, read `.codex/scopes.json`. It defines:
- The set of valid scopes (`fullstack`, `BF`, `BI`, `SLF`)
- The deny-list of paths each scope cannot modify

## Step 2 — Determine YOUR scope
Your scope is provided in the task brief, in one of these forms:
- Explicit: "scope: BI"
- Implicit from the issue/PR label: "scope:BI" → scope = BI
- Default: if no scope is given, scope = `fullstack`

Echo your resolved scope back to the user in your first message:
"Working under scope: BI."

## Step 3 — Pre-flight every write
Before EACH `create_file` / `str_replace` call, mentally check:
- "Does the target path match any deny pattern for my scope?"
- If YES → STOP. Do not write. Output instead:

      "REFUSED: <path> matches deny rule '<pattern>' for scope <X>.
       If this change is intentional, ask the user to relabel the
       task as scope:fullstack and request review from CODEOWNERS."

- If NO → proceed.

## Step 4 — Prefer per-silo paths
When implementing a BI feature, prefer creating files under `src/silos/bi/` over editing shared files. The pattern in `src/silos/bf/bf.pipeline.adapter.ts` is the model:
- Shared code exposes a slot/adapter
- Per-silo code under `src/silos/<silo>/` provides the implementation
- Glue lives at the boundary, not inside the silo logic

If your task seems to require editing a shared file (e.g. `src/components/layout/Sidebar.tsx`), pause and consider:
- Could a registry / slot in the shared file accept a per-silo entry that lives under `src/silos/<silo>/`?
- If yes, do that instead.

## Step 5 — When you must cross silos
If the task genuinely requires changes outside your scope:
1. Stop writing.
2. Output a short proposal: "This task needs to modify <list>. These are out of scope BI. Recommend: relabel as scope:fullstack with CODEOWNER review from BF and SLF teams."
3. Wait for the user to confirm before proceeding.

## Reference docs
- `.codex/scopes.json` — machine-readable policy
- `docs/silo-scope.md` — engineer-facing explainer
- `scripts/enforce-silo-scope.mjs` — CI guard (your backstop)
