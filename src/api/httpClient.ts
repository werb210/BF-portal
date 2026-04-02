export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

const API_BASE = import.meta.env.VITE_API_URL

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type ListResponse<T> = {
  items: T[]
} & Record<string, unknown>

export type RequestOptions = {
  method?: RequestMethod
  body?: unknown
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | null | undefined>
  data?: unknown
  signal?: AbortSignal
  skipAuth?: boolean
}

export async function request<T>(
  path: string,
  options?: RequestOptions
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`)
  Object.entries(options?.params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value))
    }
  })

  const res = await fetch(url.toString(), {
    method: options?.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    signal: options?.signal,
  })

  const json = await res.json()

  // Normalize ApiResult
  if (json && typeof json === 'object' && 'success' in json) {
    if (!json.success) {
      throw new Error((json as { error?: string }).error || 'API error')
    }
    return (json as { data: T }).data
  }

  // fallback (non ApiResult endpoints)
  return json as T
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>(path, { ...options, method: 'POST', body: body ?? options?.body ?? options?.data }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>(path, { ...options, method: 'PUT', body: body ?? options?.body ?? options?.data }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>(path, { ...options, method: 'PATCH', body: body ?? options?.body ?? options?.data }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
  getList: <T>(path: string, options?: RequestOptions) => request<ListResponse<T>>(path, { ...options, method: 'GET' }),
}

export const apiClient = http
export default http

export type LenderAuthTokens = {
  accessToken: string
  refreshToken: string
}

type LenderAuthConfig = {
  tokenProvider: () => LenderAuthTokens | null
  onTokensUpdated?: (tokens: LenderAuthTokens | null) => void
  onUnauthorized?: () => void
}

export const configureLenderApiClient = (_config: LenderAuthConfig) => undefined

export const lenderApiClient = http
