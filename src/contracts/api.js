export const API_ROUTES = {
    health: "/api/v1/health",
    auth: {
        otpStart: "/api/auth/send-otp",
        otpVerify: "/api/auth/verify-otp",
    },
    application: {
        create: "/api/v1/applications",
        upload: "/api/v1/documents",
    },
};
