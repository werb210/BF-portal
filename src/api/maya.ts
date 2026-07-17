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

// BF_PORTAL_MAYA_SESSION_PERSIST_v1 - the BF-Server proxy only records a Maya turn into
// the Communications -> Maya tab when it receives a valid UUID sessionId. The staff widget
// never sent one, so no staff Maya conversation was ever logged. Send a stable per-tab UUID
// so each turn (user + reply) persists and accumulates into one reviewable conversation.
const MAYA_SESSION_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function mayaSessionId(): string {
  try {
    let id = sessionStorage.getItem("maya.sessionId");
    if (!id || !MAYA_SESSION_RE.test(id)) {
      id = crypto.randomUUID();
      sessionStorage.setItem("maya.sessionId", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export async function sendMayaMessage(
  text: string,
  screenContext?: Record<string, unknown> | null,
): Promise<MayaResponse> {
  const body: Record<string, unknown> = {
    message: text,
    surface: "staff_portal",
    sessionId: mayaSessionId(), // BF_PORTAL_MAYA_SESSION_PERSIST_v1
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
