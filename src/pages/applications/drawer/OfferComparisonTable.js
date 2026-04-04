import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const formatCurrency = (value) => {
    if (typeof value !== "number" || Number.isNaN(value))
        return "—";
    return value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
};
const formatRate = (value) => {
    if (typeof value !== "number" || Number.isNaN(value))
        return "—";
    return `${value.toFixed(2)}%`;
};
const formatDate = (value) => {
    if (!value)
        return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return value;
    return parsed.toLocaleDateString();
};
const OfferComparisonTable = ({ offers }) => {
    if (offers.length === 0) {
        return _jsx("div", { className: "drawer-placeholder", children: "No offers to compare yet." });
    }
    return (_jsx("div", { className: "offer-comparison", children: _jsxs("table", { className: "offer-comparison__table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Lender" }), _jsx("th", { children: "Amount" }), _jsx("th", { children: "Rate" }), _jsx("th", { children: "Term" }), _jsx("th", { children: "Fees" }), _jsx("th", { children: "Uploaded" })] }) }), _jsx("tbody", { children: offers.map((offer) => (_jsxs("tr", { children: [_jsx("td", { children: offer.lenderName }), _jsx("td", { children: formatCurrency(offer.amount) }), _jsx("td", { children: formatRate(offer.rate) }), _jsx("td", { children: offer.term ?? "—" }), _jsx("td", { children: offer.fees ?? "—" }), _jsx("td", { children: formatDate(offer.uploadedAt) })] }, offer.id))) })] }) }));
};
export default OfferComparisonTable;
