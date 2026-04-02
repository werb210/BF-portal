export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: {
    message: string;
    code?: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function isApiError(res: unknown): res is ApiError {
  return typeof res === "object" && res !== null && (res as { success?: unknown }).success === false;
}
