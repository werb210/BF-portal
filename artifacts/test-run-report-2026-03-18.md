# Test Run Report — 2026-03-18

Executed from `/workspace/BF-portal`.

## Commands run

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test:unit` ✅ (48 files, 122 tests)
- `npm run test:e2e` ⚠️ (Playwright browsers unavailable in environment; suite skipped by runner script)
- `npm run build` ✅
- `npm run check:portal-api` ✅
- `npm run smoke` ✅

## Notes

- Unit tests include OTP/auth/role and API-client coverage in `src/__tests__`.
- Route registry validation passed in `check:portal-api`.
- E2E execution requires Playwright browser binaries; current environment does not provide them.
