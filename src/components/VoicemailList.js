import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { fetchVoicemails } from "@/api/voicemail";
export function VoicemailList({ clientId }) {
    const [items, setItems] = useState([]);
    useEffect(() => {
        void fetchVoicemails(clientId).then(setItems);
    }, [clientId]);
    return (_jsx("div", { className: "space-y-2", children: items.map((item) => (_jsxs("div", { className: "rounded border p-2", children: [_jsx("span", { className: "mb-2 block text-sm text-slate-600", children: new Date(item.createdAt).toLocaleString() }), _jsx("audio", { controls: true, src: item.recordingUrl })] }, item.id))) }));
}
