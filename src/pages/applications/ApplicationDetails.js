import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const renderScalar = (value) => _jsx("span", { children: String(value) });
const renderValue = (value) => {
    if (value == null) {
        return _jsx("span", { className: "drawer-placeholder", children: "Not provided." });
    }
    if (Array.isArray(value)) {
        if (value.length === 0)
            return _jsx("span", { className: "drawer-placeholder", children: "Not provided." });
        return (_jsx("div", { className: "drawer-list", children: value.map((entry, index) => (_jsx("div", { className: "drawer-list__item", children: renderValue(entry) }, index))) }));
    }
    if (typeof value === "object") {
        const entries = Object.entries(value);
        if (entries.length === 0)
            return _jsx("span", { className: "drawer-placeholder", children: "Not provided." });
        return (_jsx("dl", { className: "drawer-kv-list", children: entries.map(([key, entryValue]) => (_jsxs("div", { className: "drawer-kv-list__item", children: [_jsx("dt", { children: key }), _jsx("dd", { children: renderValue(entryValue) })] }, key))) }));
    }
    return renderScalar(value);
};
export const DetailSection = ({ title, data, footer }) => (_jsxs("div", { className: "drawer-section", children: [_jsx("div", { className: "drawer-section__title", children: title }), _jsx("div", { className: "drawer-section__body", children: renderValue(data) }), footer ? _jsx("div", { className: "drawer-section__footer", children: footer }) : null] }));
export const DetailBlock = ({ label, value }) => (_jsxs("div", { className: "drawer-kv-list__item", children: [_jsx("dt", { children: label }), _jsx("dd", { children: renderValue(value) })] }));
export default renderValue;
