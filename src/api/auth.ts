import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    cleaned = '1' + cleaned;
  }

  return '+' + cleaned;
}

export const startOtp = async (phone: string) => {
  return API.post('/api/auth/otp/start', {
    phone: normalizePhone(phone),
  });
};

export const verifyOtp = async (phone: string, code: string) => {
  return API.post('/api/auth/otp/verify', {
    phone: normalizePhone(phone),
    code,
  });
};

export const getMe = async () => {
  return API.get('/api/auth/me');
};
