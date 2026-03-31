import type { ApiResult } from "@/api/client";
import { showToast } from "@/utils/toastEvents";

type HandleApiResultOptions = {
  fallbackMessage?: string;
  onError?: (message: string) => void;
};

export const handleApiResult = <T>(
  result: ApiResult<T>,
  options: HandleApiResultOptions = {},
): T | null => {
  if (result.success) {
    return result.data;
  }

  const message = result.message || options.fallbackMessage || "Request failed";
  if (options.onError) {
    options.onError(message);
  } else {
    showToast(message, "error");
  }
  return null;
};

