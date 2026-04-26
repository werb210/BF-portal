import { api } from "@/api";

export async function sendMayaMessage(text: string): Promise<unknown> {
  return api.post("/api/maya/message", {
    message: text,
    surface: "staff_portal",
    pathname: typeof window !== "undefined" ? window.location.pathname : null,
  });
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
