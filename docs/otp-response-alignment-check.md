# OTP Verify Response Alignment Check (Server `{ status: "ok", data: { token } }`)

Date: 2026-04-09

## Scope

- BF-portal (available in this workspace): verified in code and tests.
- BF-client (not present in this workspace): could not run requested build/test commands here.
- agent (not present in this workspace): could not run requested build/test commands here.

## Portal verification

1. `src/api/auth.ts` sends OTP verify through `api('/api/auth/otp/verify', ...)`.
2. `src/api/index.ts` `parsePayload` returns `json.data` when a `data` field exists.
3. With server response `{ status: "ok", data: { token } }`, portal receives `{ token }` from `api(...)`.
4. `src/pages/LoginPage.tsx` uses `const res = await verifyOtp(...)` then `authToken.set(res.token)`.

Result: portal token parsing remains compatible with the updated server payload shape.

## Cross-system note

The client-side fallback logic mentioned in the request (`data?.data?.token || data?.token`) is robust for both wrapped and unwrapped payloads, but BF-client code is not available in this workspace to re-run tests directly.

The agent is not calling OTP verify directly per request intent and is not present in this workspace for execution checks.
