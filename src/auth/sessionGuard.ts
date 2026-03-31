import { getTokenOrFail } from "@/lib/auth";

export function enforceSession() {
  try {
    getTokenOrFail();
  } catch {
    window.location.href = "/login";
    throw new Error("[SESSION BLOCKED]");
  }
}
