import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const Input = ({ label, error, ...props }) => (_jsxs("label", { className: "ui-field", children: [label && _jsx("span", { className: "ui-field__label", children: label }), _jsx("input", { className: "ui-input", ...props }), error && _jsx("span", { className: "ui-field__error", children: error })] }));
export default Input;
