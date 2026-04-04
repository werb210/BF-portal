import { api } from './index';
export function sendOtp(phone) {
    return api('/api/auth/otp/start', {
        method: 'POST',
        body: { phone },
    });
}
export function verifyOtp(phone, code) {
    return api('/api/auth/otp/verify', {
        method: 'POST',
        body: { phone, code },
    });
}
