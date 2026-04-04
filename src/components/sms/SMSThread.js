import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const SMSThread = ({ messages }) => (_jsx("div", { className: "sms-thread", "data-testid": "sms-thread", children: messages.map((message) => (_jsxs("div", { className: "sms-thread__message", children: [_jsx("div", { className: "text-sm text-gray-600", children: message.direction }), _jsx("div", { children: message.message })] }, message.id))) }));
export default SMSThread;
