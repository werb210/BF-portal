const API_ROOT = `/${'api'}`;

export const API_CONTRACT = {
  AUTH_OTP_START: `${API_ROOT}/auth/otp/start`,
  AUTH_OTP_VERIFY: `${API_ROOT}/auth/otp/verify`,
  DOCUMENT_UPLOAD: `${API_ROOT}/documents/upload`,
} as const;
