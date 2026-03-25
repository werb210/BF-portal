# BF-client E2E parity handoff

This repository now contains a reusable assertion helper for the OTP -> verify -> telephony contract flow:

- `src/__tests__/helpers/authTelephonyFlowAssertions.ts`
- used by `src/__tests__/authTelephony.flow.test.ts`

## Final step for BF-client

Mirror the same flow in BF-client using the same environment/API base URL as portal CI:

1. Import the same contracts package (`bf-contracts`).
2. Execute this sequence against the same backend environment:
   - `POST /api/auth/otp/start`
   - `POST /api/auth/otp/verify`
   - `GET /api/telephony/token`
3. Validate response shapes with contract parsing (no mock contract objects).
4. Fail the test if telephony token response shape is invalid.

## Suggested portability

Copy the helper into BF-client tests (or publish it as a shared package later) so both repos enforce identical assertions for:

- OTP start success + `otpRequestId`
- verify returns a usable session token
- telephony token fetch succeeds with verified auth state
