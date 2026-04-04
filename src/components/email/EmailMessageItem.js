import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const EmailMessageItem = ({ message, onSelect }) => (_jsxs("div", { className: "email-message-item cursor-pointer", onClick: () => onSelect(message.id), "data-testid": `email-item-${message.id}`, children: [_jsx("div", { className: "font-semibold", children: message.subject }), _jsxs("div", { className: "text-sm text-gray-600", children: ["From: ", message.from] }), _jsxs("div", { className: "text-sm text-gray-600", children: ["To: ", message.to] })] }));
export default EmailMessageItem;
