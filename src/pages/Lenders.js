import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { fetchClientLenders } from "@/api/lenders";
export default function Lenders() {
    const [rows, setRows] = useState([]);
    const [err, setErr] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeMap, setActiveMap] = useState({});
    const [selectedId, setSelectedId] = useState(null);
    const loadLenders = async () => {
        setLoading(true);
        setErr(null);
        try {
            const data = await fetchClientLenders();
            setRows(data);
            setActiveMap((prev) => {
                const next = { ...prev };
                data.forEach((row) => {
                    if (next[row.id] === undefined) {
                        next[row.id] = true;
                    }
                });
                return next;
            });
        }
        catch {
            setErr("Failed to load lenders");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        void loadLenders();
    }, []);
    const hasRows = useMemo(() => rows.length > 0, [rows.length]);
    if (err)
        return _jsx("div", { role: "alert", children: err });
    return (_jsxs("div", { children: [_jsx("h1", { children: "Lenders" }), _jsx("button", { type: "button", onClick: loadLenders, disabled: loading, children: loading ? "Loading..." : "Refresh" }), !hasRows && !loading && _jsx("p", { children: "No lenders available." }), hasRows && (_jsx("ul", { children: rows.map((row) => (_jsxs("li", { children: [_jsx("button", { type: "button", onClick: () => setSelectedId(row.id), children: row.name }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: activeMap[row.id] ?? true, onChange: (event) => setActiveMap((prev) => ({ ...prev, [row.id]: event.target.checked })) }), "Active"] }), selectedId === row.id && _jsx("span", { children: "Selected" })] }, row.id))) }))] }));
}
