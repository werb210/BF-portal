export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

const API_BASE = import.meta.env.VITE_API_URL

async function request<T>(
  method: string,
  path: string,
  options?: {
    body?: unknown
    headers?: Record<string, string>
    params?: Record<string, string | number | boolean | null | undefined>
  }
): Promise<ApiResult<T>> {
  const url = new URL(`${API_BASE}${path}`)
  Object.entries(options?.params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value))
    }
  })

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    return { success: false, error: await res.text() }
  }

  const data = (await res.json()) as T
  return { success: true, data }
}

export type ListResponse<T> = {
  items: T[]
} & Record<string, unknown>

export type RequestOptions = {
  body?: unknown
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | null | undefined>
  schema?: unknown
  data?: unknown
  responseType?: string
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, { ...options, body: body ?? options?.body ?? options?.data }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, { ...options, body: body ?? options?.body ?? options?.data }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, { ...options, body: body ?? options?.body ?? options?.data }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
  getList: async <T>(path: string, options?: RequestOptions) => {
    const res = await request<ListResponse<T>>('GET', path, options)
    if (!res.success) throw new Error(res.error)
    return res.data
  },
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
