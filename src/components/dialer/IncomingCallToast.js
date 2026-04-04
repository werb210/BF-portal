import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import Button from "@/components/ui/Button";
const IncomingCallToast = ({ from, onAccept, onViewRecord, onDismiss }) => (_jsxs("div", { className: "incoming-call", role: "alert", "data-testid": "incoming-call-toast", children: [_jsxs("div", { children: ["Incoming call from ", from] }), _jsxs("div", { className: "flex gap-2 mt-2", children: [_jsx(Button, { onClick: onAccept, children: "Accept" }), _jsx(Button, { variant: "secondary", onClick: onViewRecord, children: "Open CRM Record" }), _jsx(Button, { variant: "secondary", onClick: onDismiss, children: "Dismiss" })] })] }));
export default IncomingCallToast;
