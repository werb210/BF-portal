# API Contract

## Canonical response shape

All API responses consumed by portal modules must use:

```ts
type ApiResponse<T> = {
  success: boolean
  data: T
  error?: string
}
```

This contract is defined in `src/types/api.ts` and runtime-asserted via `assertApiResponse()` before data is returned from `apiRequest()`.

## Allowed API surface

`src/lib/api.ts` is the locked integration point for authenticated API calls.

Only these exports are allowed:

- `apiRequest()`
- `requireAuth()`

Raw axios clients must not be exported from this module.

## Authentication requirements

- `apiRequest()` always reads a token through `requireAuth()`.
- Requests include `Authorization: Bearer <token>`.
- Missing/invalid auth should be handled by endpoint-level failures surfaced as `Error`.

## Expected failure behavior

- Non-contract payloads throw an error via `assertApiResponse()`.
- HTTP or transport failures throw an `Error` with server-provided `error` text when available.
- Global UI failure containment is provided by the top-level `ErrorBoundary` wrapper in `src/main.tsx`.

## Drift prevention guardrails

Automated checks enforce:

- No `fetch(` usage in `src/`.
- `axios.create` appears at most once in `src/`.
- No `from 'api/` import paths.
- No root-level `api/` directory (must use `src/api/`).
- No `VITE_API_URL` usage in `src/`.

Run locally with:

```bash
npm run guard:api-contract
```

