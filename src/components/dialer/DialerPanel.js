import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { makeCall } from "../../services/voiceService";
export default function DialerPanel() {
    const [number, setNumber] = useState("");
    const handleCall = async () => {
        await makeCall(number);
    };
    return (_jsxs("div", { style: {
            position: "fixed",
            right: 0,
            top: 0,
            height: "100%",
            width: "350px",
            background: "#111",
            color: "#fff",
            padding: "20px"
        }, children: [_jsx("h2", { children: "Dialer" }), _jsx("input", { value: number, onChange: e => setNumber(e.target.value), placeholder: "Enter number", style: {
                    width: "100%",
                    padding: "10px",
                    marginBottom: "10px"
                } }), _jsx("button", { onClick: handleCall, children: "Call" })] }));
}
