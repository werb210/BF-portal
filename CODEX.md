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

## Agent rules — applied after 2026-04-15 audit

### Layout — single source of truth
The active layout is `src/layouts/AppLayout.tsx`.
It MUST render `<Sidebar>` from `@/components/layout/Sidebar` and
`<Topbar>` from `@/components/layout/Topbar`.
Do NOT hardcode nav items in AppLayout. Do NOT replace it with a flat layout.

### API client — one client only
All API calls MUST go through `api` exported from `@/api/index.ts`.
`src/lib/apiClient.ts` is DELETED. Do not recreate it.
Do not use raw `fetch()` or `axios` anywhere in src/.

### Auth context — one source only
The auth context lives at `src/auth/AuthContext.tsx`.
`src/context/AuthContext.tsx` is DELETED. Do not recreate it.
Always import `useAuth` from `@/auth/AuthContext` or `@/hooks/useAuth` (re-export).

### Guards — canonical paths
| Guard | Import from |
|---|---|
| ProtectedRoute | `@/routes/ProtectedRoute` |
| RequireRole | `@/components/auth/RequireRole` |
| RoleGuard | `@/auth/RoleGuard` |
| AccessRestricted | `@/components/auth/AccessRestricted` |
| AuthGuard | `@/router/AuthGuard` |

Never create a new file named ProtectedRoute, RequireRole, RoleGuard, or AuthGuard.
If a guard needs extending, edit the canonical file.

### Services — canonical paths
| Service | Import from |
|---|---|
| Document actions | `@/services/documents/documentActions` |
| Send to lenders | `@/services/lenders/sendToLenders` |

Never duplicate service files. If behaviour needs to change, edit the canonical file.

### Prohibited actions for agents
- Do not rewrite `src/layouts/AppLayout.tsx` to a flat layout with hardcoded nav items.
- Do not create alternative API clients in `src/lib/`.
- Do not create alternative AuthContext files in `src/context/`.
- Do not create new files named after existing canonical components in different folders.
- Do not use `localStorage.getItem('auth_token')` directly — use `getAuthToken()` from `@/lib/authToken`.


### CSS / Styling

- `src/styles/globals.css` MUST be imported in `src/main.tsx`.
- Never remove the `import "./styles/globals.css"` line from `src/main.tsx`.
- Layout classes (`.app-shell`, `.sidebar`, `.topbar`, `.sidebar__link`) are defined in `src/styles/globals.css`. Do not add inline Tailwind replacements for these.

### Topbar API calls

- Never call `/api/_int/*` endpoints from the browser except `/api/_int/health`.
- Use `/api/_int/health` (not `/api/_int/production-readiness`) for health status.
- Gate Admin-only data calls (leads count, CRM stats) behind a role check before calling.
- Never poll an endpoint that does not exist in the server route manifest.

### API paths — lenders

- All lender endpoints are under `/portal/lenders` and `/portal/lender-products`.
- Never use bare `/lenders` or `/lender-products`; these return 404.
- Lender submissions must use `/portal/lender-submissions`.

### Chat / AI sessions

- AI chat session endpoints are under `/api/ai/ai/`.
- There is no `/api/chat/sessions` route on the server. Do not create calls to `/chat/sessions`.

### Silos

- Admin users must always see all three silos: BF, BI, SLF.
- Do not gate silo visibility on `user.businessUnits` alone for Admin role.
- `SiloProvider` must remain in the app tree wrapping all routes.
