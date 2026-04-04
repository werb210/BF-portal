import { jsx as _jsx } from "react/jsx-runtime";
export default function Toast({ message, variant = "success" }) {
    return (_jsx("div", { role: "status", style: {
            position: "fixed",
            bottom: 20,
            right: 20,
            background: variant === "error" ? "#991b1b" : "#166534",
            color: "#fff",
            padding: "10px 15px",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)"
        }, children: message }));
}
