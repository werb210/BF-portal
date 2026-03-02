import { getRequestId } from "@/utils/requestId";

export { getRequestId };

export function generateRequestId() {
  return getRequestId();
}
