import { ApiError } from "@/api/http";

export const retryUnlessClientError = (failureCount: number, error: unknown) => {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }

  return failureCount < 2;
};
