import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { createApi } from "@/apiFactory";
import { useAuth } from "../auth/AuthContext";
import Skeleton from "../components/Skeleton";
const PAGE_SIZE = 10;
export default function AuditLogs() {
    const { token } = useAuth();
    const biApi = useMemo(() => createApi("bi", token ?? ""), [token]);
    const slfApi = useMemo(() => createApi("slf", token ?? ""), [token]);
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    useEffect(() => {
        async function loadLogs() {
            const [biEvents, slfLogs] = await Promise.all([
                biApi.get("/bi/admin/events"),
                slfApi.get("/slf/logs")
            ]);
            setEvents([
                ...biEvents.map((event) => ({ ...event, source: "BI" })),
                ...slfLogs.map((event) => ({ ...event, source: "SLF" }))
            ]);
            setIsLoading(false);
        }
        void loadLogs();
    }, [biApi, slfApi]);
    const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
    const start = (page - 1) * PAGE_SIZE;
    const paginatedRows = events.slice(start, start + PAGE_SIZE);
    return (_jsxs("div", { children: [_jsx("h2", { children: "Audit Logs" }), isLoading ? _jsx(Skeleton, { count: 8, height: 24 }) : null, _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Source" }), _jsx("th", { children: "ID" }), _jsx("th", { children: "Type" }), _jsx("th", { children: "Created" })] }) }), _jsx("tbody", { children: paginatedRows.map((event, index) => {
                            const eventId = event.id ?? `${page}-${index}`;
                            const type = typeof event.type === "string" ? event.type : "event";
                            const createdAt = typeof event.created_at === "string" ? event.created_at : "-";
                            return (_jsxs("tr", { children: [_jsx("td", { children: event.source }), _jsx("td", { children: eventId }), _jsx("td", { children: type }), _jsx("td", { children: createdAt })] }, eventId));
                        }) })] }), _jsxs("div", { style: { marginTop: 16, display: "flex", gap: 8 }, children: [_jsx("button", { onClick: () => setPage((current) => Math.max(1, current - 1)), disabled: page === 1, children: "Previous" }), _jsxs("span", { children: ["Page ", page, " of ", totalPages] }), _jsx("button", { onClick: () => setPage((current) => Math.min(totalPages, current + 1)), disabled: page >= totalPages, children: "Next" })] })] }));
}
