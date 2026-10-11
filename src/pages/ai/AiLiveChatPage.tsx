// BF_PORTAL_AI_PAGE_v784 - this route used to redirect to itself when no
// :sessionId was present (it never is on /portal/ai), so it rendered nothing.
import AiLiveChat from "@/modules/ai/AiLiveChat";

export default function AiLiveChatPage() {
  return <AiLiveChat />;
}
