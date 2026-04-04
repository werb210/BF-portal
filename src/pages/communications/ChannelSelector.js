import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Select from "@/components/ui/Select";
const ChannelSelector = ({ value, onChange, allowSms }) => (_jsxs(Select, { label: "Submit via", value: value, onChange: (e) => onChange(e.target.value), children: [_jsx("option", { value: "chat", children: "Chat" }), allowSms && _jsx("option", { value: "sms", children: "SMS" })] }));
export default ChannelSelector;
