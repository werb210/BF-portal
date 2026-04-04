import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { createApi } from "@/apiFactory";
import { useAuth } from "../auth/AuthContext";
import Skeleton from "../components/Skeleton";
export default function AdminActivity() {
    const { token } = useAuth();
    const biApi = useMemo(() => createApi("bi", token ?? ""), [token]);
    const slfApi = useMemo(() => createApi("slf", token ?? ""), [token]);
    const [events, setEvents] = useState(null);
    useEffect(() => {
        async function loadActivity() {
            const [biEvents, slfLogs] = await Promise.all([
                biApi.get("/bi/admin/events"),
                slfApi.get("/slf/logs")
            ]);
            const merged = [
                ...biEvents.map((event) => ({ ...event, source: "BI" })),
                ...slfLogs.map((event) => ({ ...event, source: "SLF" }))
            ].sort((a, b) => {
                const aTime = new Date(a.timestamp ?? a.created_at ?? 0).getTime();
                const bTime = new Date(b.timestamp ?? b.created_at ?? 0).getTime();
                return bTime - aTime;
            });
            setEvents(merged);
        }
        void loadActivity();
    }, [biApi, slfApi]);
    return (_jsxs("div", { children: [_jsx("h2", { children: "Global Activity Feed" }), !events ? (_jsx(Skeleton, { count: 8, height: 22 })) : (_jsx("ul", { children: events.map((event, index) => {
                    const key = event.id ?? `${event.source}-${index}`;
                    return (_jsxs("li", { children: ["[", event.source, "] ", event.created_at ?? event.timestamp ?? "-", " \u2014 ", event.type ?? "event", " ", event.message ?? ""] }, key));
                }) }))] }));
}
