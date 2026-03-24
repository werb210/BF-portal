export const API_CONTRACT = {
  login: '/auth/login',
  me: '/auth/me',
  sendOtp: '/auth/otp',
  AUTH_OTP_START: '/auth/otp/start',
  AUTH_OTP_VERIFY: '/auth/otp/verify',
  DOCUMENT_UPLOAD: '/documents/upload',
} as const;

export type ApiContract = typeof API_CONTRACT;
export type ApiEndpoint = keyof ApiContract;
