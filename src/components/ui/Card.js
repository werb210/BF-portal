import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const Card = ({ title, actions, children }) => (_jsxs("div", { className: "ui-card", children: [(title || actions) && (_jsxs("div", { className: "ui-card__header", children: [_jsx("div", { className: "ui-card__title", children: title }), _jsx("div", { children: actions })] })), _jsx("div", { className: "ui-card__body", children: children })] }));
export default Card;
