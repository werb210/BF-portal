import api from '@/lib/api';
import { normalizePhone } from '@/utils/phone';

export const startOtp = async (phone: string) => {
  return api.post('/auth/otp/start', {
    phone: normalizePhone(phone),
  });
};

export const verifyOtp = async (phone: string, code: string) => {
  return api.post('/auth/otp/verify', {
    phone: normalizePhone(phone),
    code,
  });
};

export const getMe = async () => {
  return api.get('/auth/me');
};
