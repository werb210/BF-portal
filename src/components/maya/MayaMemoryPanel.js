import { jsxs as _jsxs } from "react/jsx-runtime";
export default function MayaMemoryPanel({ data }) {
    return (_jsxs("div", { className: "mt-3 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700", children: [_jsxs("div", { children: ["Funding amount: ", data.fundingAmount ?? "—"] }), _jsxs("div", { children: ["Revenue: ", data.revenue ?? "—"] }), _jsxs("div", { children: ["Time in business: ", data.timeInBusiness ?? "—"] }), _jsxs("div", { children: ["Product type: ", data.productType ?? "—"] }), _jsxs("div", { children: ["Industry: ", data.industry ?? "—"] })] }));
}
