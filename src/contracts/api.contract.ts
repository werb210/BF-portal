export const API_CONTRACT = {
  login: '/api/auth/login',
  me: '/api/auth/me',
  sendOtp: '/api/auth/otp',
  AUTH_OTP_START: '/api/auth/otp/start',
  AUTH_OTP_VERIFY: '/api/auth/otp/verify',
  DOCUMENT_UPLOAD: '/api/documents/upload',
} as const;

export type ApiContract = typeof API_CONTRACT;
export type ApiEndpoint = keyof ApiContract;
