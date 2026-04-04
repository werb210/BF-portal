import { jsx as _jsx } from "react/jsx-runtime";
import RequireRole from "@/components/auth/RequireRole";
import Card from "@/components/ui/Card";
import ChatWindow from "../components/ChatWindow";
const ChatPage = () => (_jsx(RequireRole, { roles: ["Admin", "Staff"], children: _jsx("div", { className: "page", children: _jsx(Card, { title: "Live Chat", children: _jsx(ChatWindow, {}) }) }) }));
export default ChatPage;
