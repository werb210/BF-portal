import { jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api as api } from "@/api";
export default function MayaStatus() {
    const [status, setStatus] = useState("degraded");
    useEffect(() => {
        void api
            .get("/api/health")
            .then((res) => {
            setStatus(res?.maya ?? "degraded");
        })
            .catch(() => {
            // swallow health-check failures (non-blocking)
        });
    }, []);
    const healthy = status === "healthy" || status === "ok";
    return (_jsxs("span", { className: `rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${healthy ? "bg-emerald-600" : "bg-red-600"}`, children: ["Maya: ", healthy ? "Healthy" : "Degraded"] }));
}
