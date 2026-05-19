# OTP Audit — BF Staff Portal (2026-05-19)

## Scope
Read-only audit of OTP login paths in `bf-staff-portal` to verify staff OTP behavior and confirm there is no accidental leak into BF-Client-style behavior.

## Step 1 — OTP code discovery
Command run:

```bash
git ls-files | xargs grep -nE 'otp|/auth/otp|phone' --include='*.tsx' --include='*.ts' 2>/dev/null
```

High-signal findings from output:
- Staff login page: `src/pages/Login.tsx`
- Staff verify logic: `src/auth/verify.ts`
- Shared phone normalizer: `src/utils/normalizePhone.ts`
- API routing/base selection: `src/config/api.ts`, `src/api/index.ts`
- Non-staff OTP flows also exist (separate paths):
  - Referrer: `/api/v1/otp/request`, `/api/v1/otp/verify` in `src/pages/referrer/ReferrerLoginPage.tsx`
  - Lender OTP exists in lender auth modules (not using `/api/auth/otp/*`)

## Step 2 — Staff OTP endpoint confirmation

### Login component behavior (`src/pages/Login.tsx`)
- Staff login submits OTP start to:
  - `fetch(`${API_BASE}/api/auth/otp/start`, ...)`
- `API_BASE` is imported from `src/config/api.ts`.

### Server base for staff OTP
`API_BASE` resolves to BF server base URL:
- Default: `https://server.boreal.financial`
- From `src/config/api.ts`:
  - `BF_SERVER_URL = ... || "https://server.boreal.financial"`
  - `export const API_BASE = BF_SERVER_URL`

### Verify step behavior
- `src/auth/verify.ts` posts to:
  - `${import.meta.env.VITE_API_BASE}/api/auth/otp/verify`
- The contract and shared API code also treat `/api/auth/otp/start` and `/api/auth/otp/verify` as public auth routes (`src/api/index.ts`).

Conclusion for Step 2:
- Staff OTP start is explicitly wired to `/api/auth/otp/start` on BF server base (default `server.boreal.financial`).
- Staff OTP verify is explicitly wired to `/api/auth/otp/verify` on configured API base.
- This matches your BI log evidence that staff OTP succeeds for Andrew and Todd.

## Step 3 — Staff vs client/referrer phone normalization differences

### Staff normalization
- `src/utils/normalizePhone.ts` enforces North American normalization only:
  - 10 digits => `+1##########`
  - 11 digits beginning with `1` => `+1##########`
  - otherwise throws invalid phone number.
- Staff login only enables submit when normalized phone matches `^\+1\d{10}$` (`src/pages/Login.tsx`).

### Non-staff/referrer difference
- Referrer login sends raw `phone` input to `/api/v1/otp/request` and `/api/v1/otp/verify` without applying `normalizePhone` in that component (`src/pages/referrer/ReferrerLoginPage.tsx`).
- Referrer OTP endpoints are distinct (`/api/v1/otp/*`), not `/api/auth/otp/*`.

## Audit determination
- No evidence in this repo of staff OTP leaking into a BF-Client endpoint pattern for the staff portal path.
- Staff path is consistently `/api/auth/otp/start` and `/api/auth/otp/verify`.
- There **are** other OTP flows in repo (referrer, lender), but they are separate route namespaces and components.
