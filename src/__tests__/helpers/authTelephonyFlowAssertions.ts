import { expect } from "vitest";

export type AuthTelephonyFlowApi = {
  startOtp: (phone: string) => Promise<{ ok: boolean }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ token: string }>;
  getTelephonyToken: () => Promise<string>;
};

export type AuthTelephonyFlowFixture = {
  phone: string;
  otp: string;
  expectedSessionToken: string;
  expectedVoiceToken: string;
};

export async function assertAuthTelephonyFlow(
  api: AuthTelephonyFlowApi,
  fixture: AuthTelephonyFlowFixture
) {
  const otpStart = await api.startOtp(fixture.phone);
  expect(otpStart.ok).toBe(true);

  const verified = await api.verifyOtp(fixture.phone, fixture.otp);
  expect(verified.token).toBe(fixture.expectedSessionToken);

  const voiceToken = await api.getTelephonyToken();
  expect(voiceToken).toBe(fixture.expectedVoiceToken);
}
