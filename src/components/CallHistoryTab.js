import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { fetchCallHistory } from "../services/callService";
import { logError } from "@/lib/logger";
export default function CallHistoryTab({ clientId }) {
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    if (!clientId)
        return _jsx("div", { children: "Client not selected." });
    useEffect(() => {
        let mounted = true;
        async function load() {
            try {
                setLoading(true);
                setError(null);
                const data = await fetchCallHistory(clientId);
                if (mounted)
                    setCalls(data);
            }
            catch (err) {
                logError(err, { path: "/api/call-history", clientId });
                if (mounted)
                    setError("Unable to load call history");
            }
            finally {
                if (mounted)
                    setLoading(false);
            }
        }
        load();
        return () => {
            mounted = false;
        };
    }, [clientId]);
    if (loading)
        return _jsx("div", { children: "Loading call history\u2026" });
    if (error)
        return _jsx("div", { children: error });
    if (!calls.length)
        return _jsx("div", { children: "No call history found." });
    return (_jsx("div", { className: "space-y-4", children: calls.map((call) => (_jsxs("div", { className: "border rounded p-4", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-semibold", children: call.status }), _jsx("span", { children: call.started_at ? new Date(call.started_at).toLocaleString() : "Unknown" })] }), call.duration_seconds != null && (_jsxs("div", { className: "text-sm text-gray-500 mt-2", children: ["Duration: ", call.duration_seconds, "s"] })), call.voicemail_url && (_jsx("div", { className: "mt-2", children: _jsx("audio", { controls: true, preload: "none", children: _jsx("source", { src: call.voicemail_url }) }) }))] }, call.id))) }));
}
