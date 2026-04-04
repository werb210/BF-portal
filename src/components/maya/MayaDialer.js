import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { initTelephony, callNumber, hangup } from "@/services/telephony";
export default function MayaDialer() {
    const [ready, setReady] = useState(false);
    const [phone, setPhone] = useState("");
    useEffect(() => {
        initTelephony().then(() => setReady(true)).catch(console.error);
    }, []);
    return (_jsxs("div", { style: { border: "1px solid #ccc", padding: 12, borderRadius: 8 }, children: [_jsxs("div", { children: ["Dialer: ", ready ? "ready" : "loading..."] }), _jsx("input", { value: phone, onChange: (e) => setPhone(e.target.value), placeholder: "Phone" }), _jsx("button", { onClick: () => callNumber(phone), disabled: !ready, children: "Call" }), _jsx("button", { onClick: () => hangup(), children: "Hangup" })] }));
}
