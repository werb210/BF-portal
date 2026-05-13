import { api } from "@/api";

// BF_PORTAL_BLOCK_v201_MAYA_AUDIENCE_HEADER_v1
// Staff portal advertises audience=staff on every Maya call so
// the agent applies the staff tool whitelist (pipeline.query,
// contact.find, application.summary, comm.draft_email,
// comm.send_sms, call.initiate, maya.audit). See
// AGENT_BLOCK_v2_AUDIENCE_AND_STAFF_PIPELINE_TOOL_v1.
const MAYA_HEADERS: Record<string, string> = {
  "X-Maya-Audience": "staff",
};

export async function sendMayaMessage(text: string): Promise<unknown> {
  return api.post(
    "/api/maya/message",
    {
      message: text,
      surface: "staff_portal",
      pathname: typeof window !== "undefined" ? window.location.pathname : null,
    },
    { headers: MAYA_HEADERS },
  );
}

export async function escalateToHuman(reason = "user_requested_human") {
  // BF_PORTAL_BLOCK_v201_MAYA_AUDIENCE_HEADER_v1
  return api.post("/api/maya/escalate", { reason }, { headers: MAYA_HEADERS });
}

export async function reportPortalIssue(payload: {
  message: string;
  screenshotBase64?: string;
}) {
  return api.post("/api/client/issues", {
    message: payload.message,
    screenshotBase64: payload.screenshotBase64 ?? null,
  });
}
