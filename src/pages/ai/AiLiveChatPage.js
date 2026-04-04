import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, useParams } from "react-router-dom";
import AiLiveChat from "@/modules/ai/AiLiveChat";
export default function AiLiveChatPage() {
    const { sessionId } = useParams();
    if (!sessionId) {
        return _jsx(Navigate, { to: "/portal/ai", replace: true });
    }
    return _jsx(AiLiveChat, { sessionId: sessionId });
}
