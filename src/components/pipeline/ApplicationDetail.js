import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import api from "@/api";
export default function ApplicationDetail({ id, onClose }) {
    const [application, setApplication] = useState(null);
    useEffect(() => {
        const loadApplication = async () => {
            try {
                const response = await api.get(`/api/applications/${id}`);
                setApplication(response);
            }
            catch (e) {
                console.error(e);
                setApplication(null);
            }
        };
        loadApplication();
    }, [id]);
    if (!application) {
        return _jsx("div", { style: { padding: "20px" }, children: "Loading..." });
    }
    return (_jsxs("div", { style: {
            position: "fixed",
            right: 0,
            top: 0,
            width: "400px",
            height: "100%",
            background: "#020c1c",
            padding: "20px",
            overflowY: "auto"
        }, children: [_jsx("button", { onClick: onClose, children: "Close" }), _jsx("h2", { children: application.company }), _jsxs("p", { children: [_jsx("strong", { children: "Amount:" }), " ", application.amount] }), _jsxs("p", { children: [_jsx("strong", { children: "ID:" }), " ", application.id] })] }));
}
