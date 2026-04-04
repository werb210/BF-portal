import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { fetchCallHistory } from "@/api/dialer";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import { useAuth } from "@/hooks/useAuth";
import { resolveUserRole } from "@/utils/roles";
const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0)
        return "—";
    const mins = Math.floor(seconds / 60);
    const rem = seconds % 60;
    return `${mins}:${String(rem).padStart(2, "0")}`;
};
const CallHistoryTab = () => {
    const applicationId = useApplicationDrawerStore((state) => state.selectedApplicationId);
    const [dateFilter, setDateFilter] = useState(7);
    const [data, setData] = useState([]);
    const [now] = useState(() => Date.now());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);
    const { user } = useAuth();
    const role = resolveUserRole(user?.role ?? null);
    const canPlayVoicemail = role === "Admin" || role === "Staff";
    useEffect(() => {
        let mounted = true;
        if (!applicationId) {
            setData([]);
            return;
        }
        setIsLoading(true);
        setError(false);
        fetchCallHistory(applicationId)
            .then((response) => {
            if (!mounted)
                return;
            setData(Array.isArray(response) ? response : []);
        })
            .catch(() => {
            if (!mounted)
                return;
            setError(true);
        })
            .finally(() => {
            if (!mounted)
                return;
            setIsLoading(false);
        });
        return () => {
            mounted = false;
        };
    }, [applicationId]);
    const calls = useMemo(() => {
        const cutoff = now - dateFilter * 24 * 60 * 60 * 1000;
        return [...data]
            .filter((item) => {
            const rawDate = item.created_at ?? item.started_at;
            if (!rawDate)
                return false;
            const time = new Date(rawDate).getTime();
            return Number.isFinite(time) && time >= cutoff;
        })
            .sort((a, b) => {
            const aTime = new Date(a.created_at ?? a.started_at ?? "").getTime();
            const bTime = new Date(b.created_at ?? b.started_at ?? "").getTime();
            return bTime - aTime;
        });
    }, [data, dateFilter, now]);
    if (!applicationId)
        return _jsx("div", { className: "drawer-placeholder", children: "Select an application to view calls." });
    if (isLoading)
        return _jsx("div", { className: "drawer-placeholder", children: "Loading call history\u2026" });
    if (error)
        return _jsx("div", { className: "drawer-placeholder", children: "Unable to load call history." });
    return (_jsxs("div", { className: "drawer-tab", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-semibold text-slate-700", children: "Call timeline" }), _jsxs("label", { className: "text-sm text-slate-600", children: ["Date range", " ", _jsxs("select", { value: dateFilter, onChange: (event) => setDateFilter(Number(event.target.value)), children: [_jsx("option", { value: 7, children: "Last 7 days" }), _jsx("option", { value: 30, children: "Last 30 days" }), _jsx("option", { value: 90, children: "Last 90 days" })] })] })] }), calls.length === 0 ? (_jsx("div", { className: "drawer-placeholder", children: "No call logs found for this range." })) : (_jsx("div", { className: "space-y-2", "data-testid": "call-history-list", children: calls.map((call) => {
                    const callDate = call.created_at ?? call.started_at ?? "";
                    const direction = call.direction === "outbound" ? "outbound" : "inbound";
                    const outcome = call.outcome ?? "—";
                    const hasVoicemail = Boolean(call.voicemail_url);
                    const recordingUrl = call.recording_url;
                    return (_jsxs("div", { className: "rounded border border-slate-200 p-3 text-sm", children: [_jsxs("div", { className: "mb-1 flex items-center justify-between", children: [_jsx("strong", { children: new Date(callDate).toLocaleString() }), _jsx("span", { className: "rounded bg-slate-100 px-2 py-0.5 text-xs", children: direction })] }), _jsxs("div", { children: ["Staff: ", call.staff_name ?? "—"] }), _jsxs("div", { children: ["Duration: ", formatDuration(call.duration_seconds)] }), _jsxs("div", { children: ["Outcome: ", outcome] }), _jsxs("div", { children: ["Voicemail: ", hasVoicemail ? "Yes" : "No"] }), recordingUrl ? (_jsx("div", { className: "mt-1", children: _jsx("a", { href: recordingUrl, target: "_blank", rel: "noreferrer", className: "text-blue-700 underline", children: "Play recording" }) })) : null, hasVoicemail && canPlayVoicemail ? _jsx("audio", { controls: true, src: call.voicemail_url ?? undefined }) : null] }, call.id));
                }) }))] }));
};
export default CallHistoryTab;
