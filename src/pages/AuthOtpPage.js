import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { fetchContinuation } from "@/services/continuationService";
export default function AuthOtpPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    useEffect(() => {
        async function load() {
            try {
                if (!token) {
                    window.location.href = "/login";
                    return;
                }
                await fetchContinuation(token);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            }
            finally {
                setLoading(false);
            }
        }
        void load();
    }, [token]);
    if (loading)
        return _jsx("div", { children: "Loading..." });
    if (error) {
        return (_jsxs("div", { children: [_jsx("h1", { children: "Authentication Error" }), _jsx("p", { children: error })] }));
    }
    return (_jsx("div", { children: _jsx("h1", { children: "Enter OTP" }) }));
}
