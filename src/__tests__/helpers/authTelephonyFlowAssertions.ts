import { expect } from "vitest";

export type AuthTelephonyFlowApi = {
  startOtp: (phone: string) => Promise<{ success: boolean; otpRequestId: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ token: string }>;
  getTelephonyToken: () => Promise<string>;
};

export type AuthTelephonyFlowFixture = {
  phone: string;
  otp: string;
  expectedOtpRequestId: string;
  expectedSessionToken: string;
  expectedVoiceToken: string;
};

export async function assertAuthTelephonyFlow(
  api: AuthTelephonyFlowApi,
  fixture: AuthTelephonyFlowFixture
) {
  const otpStart = await api.startOtp(fixture.phone);
  expect(otpStart.success).toBe(true);
  expect(otpStart.otpRequestId).toBe(fixture.expectedOtpRequestId);

  const verified = await api.verifyOtp(fixture.phone, fixture.otp);
  expect(verified.token).toBe(fixture.expectedSessionToken);

  const voiceToken = await api.getTelephonyToken();
  expect(voiceToken).toBe(fixture.expectedVoiceToken);
}
