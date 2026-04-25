import { api } from "@/api";

export async function sendMayaMessage(message: string) {
  return api.post<{ reply?: string; message?: string; response?: string }>(
    "/api/ai/maya/message",
    { message, source: "portal" },
  );
}

export async function escalateToHuman(reason = "user_requested_human") {
  return api.post("/api/maya/escalate", { reason });
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
