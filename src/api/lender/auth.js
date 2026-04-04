import { lenderApiClient } from "@/api";
export const lenderLogin = (payload) => lenderApiClient.post(`/lender/auth/login`, payload);
export const sendLenderOtp = (email) => lenderApiClient.post(`/lender/auth/send-otp`, { email });
export const verifyLenderOtp = (payload) => lenderApiClient.post(`/lender/auth/verify-otp`, payload);
export const fetchLenderProfile = () => lenderApiClient.get(`/lender/auth/me`);
