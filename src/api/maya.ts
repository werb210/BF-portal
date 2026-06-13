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

export type MayaAction = {
  type: string;
  target?: string;
  id?: string;
  path?: string;
  label?: string;
  to?: string;
  contact_id?: string;
};
export type MayaResponse = {
  reply?: string;
  actions?: MayaAction[];
  audience?: string;
  tools_used?: string[];
};

export async function sendMayaMessage(
  text: string,
  screenContext?: Record<string, unknown> | null,
): Promise<MayaResponse> {
  const body: Record<string, unknown> = {
    message: text,
    surface: "staff_portal",
    pathname: typeof window !== "undefined" ? window.location.pathname : null,
  };
  if (screenContext) body.screen_context = screenContext;
  const res = await api.post("/api/maya/message", body, { headers: MAYA_HEADERS });
  return (res ?? {}) as MayaResponse;
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
