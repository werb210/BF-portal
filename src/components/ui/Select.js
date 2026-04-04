import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const Select = ({ label, hideLabel = false, options, children, ...props }) => (_jsxs("label", { className: "ui-field", children: [label && _jsx("span", { className: `ui-field__label ${hideLabel ? "ui-field__label--hidden" : ""}`, children: label }), _jsxs("select", { className: "ui-select", ...props, children: [options?.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))), children] })] }));
export default Select;
