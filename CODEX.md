# CODEX — BF-Portal

> Agent instructions for the Boreal Financial Staff Portal.

This document captures the operating conventions for contributors and automation agents working in this repository.

## What this repo is

Staff-facing React/Vite/TypeScript SPA (PWA) used by Boreal staff to manage applications across four silos:

- `bf` — Boreal Financial
- `slf` — Site Level Financial
- `bi` — Boreal Insurance
- `admin` — Admin tools

Authentication is shared with BF-Server, and silo data must remain isolated.

## Absolute rules

1. Server is authoritative for business logic.
2. BI data must stay in BI-only UI surfaces.
3. All API calls must go through `api` from `@/api`.
4. All server state must use React Query (`useQuery` / `useMutation`).
5. Avoid direct DOM manipulation.
6. Role checks in UI are convenience only; server remains security boundary.
7. Never log tokens, phone numbers, or PII in production.

## BI guardrails

- Use `useSilo()` and guard BI pages with `silo === "bi"`.
- Keep BI query keys prefixed with `"bi"` (for example `['bi', 'pipeline', stageId]`).
- Do not allow drag/drop into PGI-owned stages:
  - `submitted_to_pgi`
  - `under_review`
  - `quoted`
  - `bound`

## API expectations

- Use `api.get`, `api.getList`, `api.post`, `api.patch`.
- Do not use raw `fetch`.
- Expect `{ status, data }` envelope validated by `@boreal/shared-contract`.

## BI drawer tab order

1. Overview
2. Application
3. Documents
4. Requirements
5. PGI Comms
6. Notes
7. Activity

## Testing conventions

- Unit tests: Vitest + Testing Library
- Mocking: MSW under `src/test/msw/`
- CI test command: `npm run test:ci`
- Typecheck command: `npm run typecheck`

## Do not

- Do not fetch with `useEffect` where React Query should be used.
- Do not share state across silos.
- Do not use `any` for BI pipeline models.
- Do not add Zustand stores for BI pipeline state.
- Do not bypass `RequireRole` for BI routes.
