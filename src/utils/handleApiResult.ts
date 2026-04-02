import type { ApiResult } from "@/lib/apiClient";
import { showToast } from "@/utils/toastEvents";

type HandleApiResultOptions = {
  fallbackMessage?: string;
  onError?: (message: string) => void;
};

export const handleApiResult = <T>(
  result: ApiResult<T>,
  options: HandleApiResultOptions = {},
): T | null => {
  if ("error" in result) {
    const message = result.error || options.fallbackMessage || "Request failed";
    if (options.onError) {
      options.onError(message);
    } else {
      showToast(message, "error");
    }
    return null;
  }

  return result.data;
};
