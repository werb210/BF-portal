import { api as api } from "@/api";
import { ApiError } from "@/api/http";

// BF_PORTAL_BLOCK_v201_MAYA_AUDIENCE_HEADER_v1
// Secondary Maya client used by ChatInterface. Same audience
// contract as src/api/maya.ts.
const MAYA_HEADERS: Record<string, string> = {
  "X-Maya-Audience": "staff",
};

export async function sendMayaMessage(message: string) {
  try {
    return await api.post(
      "/api/ai/maya/message",
      { message },
      { headers: MAYA_HEADERS },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      return null;
    }
    throw error;
  }
}
