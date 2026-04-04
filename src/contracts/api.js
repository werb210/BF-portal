export const API_ROUTES = {
    health: "/api/health",
    auth: {
        otpStart: "/api/auth/send-otp",
        otpVerify: "/api/auth/verify-otp",
    },
    application: {
        create: "/api/applications",
        upload: "/api/documents",
    },
};
