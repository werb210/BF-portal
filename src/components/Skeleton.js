import { jsx as _jsx } from "react/jsx-runtime";
export default function Skeleton({ width = "100%", height = 16, count = 1, style }) {
    return (_jsx("div", { style: { display: "grid", gap: 8, ...style }, children: Array.from({ length: count }).map((_, index) => (_jsx("div", { style: {
                width,
                height,
                borderRadius: 6,
                background: "linear-gradient(90deg, #1e293b 25%, #334155 37%, #1e293b 63%)",
                backgroundSize: "400% 100%",
                animation: "portal-skeleton 1.4s ease infinite"
            } }, index))) }));
}
