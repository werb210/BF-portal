import axios, { AxiosRequestConfig, AxiosRequestHeaders, Method } from 'axios'

const API_BASE = import.meta.env.VITE_API_URL

if (!API_BASE) {
  throw new Error('VITE_API_URL is not defined')
}

type LegacyMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

type LegacyAuthConfig = {
  skipAuth?: boolean
}

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  const headers: AxiosRequestHeaders = {
    'Content-Type': 'application/json',
    ...(config.headers ?? {}),
  } as AxiosRequestHeaders

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return {
    ...config,
    headers,
    withCredentials: true,
  }
})

export async function apiRequest<T = any>(
  url: string,
  config?: AxiosRequestConfig & { data?: any }
): Promise<T>
export async function apiRequest<T = any>(
  method: LegacyMethod,
  url: string,
  data?: any,
  auth?: boolean
): Promise<T>
export async function apiRequest<T = any>(
  methodOrUrl: string,
  urlOrConfig: string | (AxiosRequestConfig & { data?: any }) = {},
  data?: any,
  auth = true
): Promise<T> {
  const isLegacyMethod = ['get', 'post', 'put', 'patch', 'delete'].includes(methodOrUrl)

  if (isLegacyMethod) {
    const method = methodOrUrl as Method
    const url = urlOrConfig as string
    const token = localStorage.getItem('token')
    const headers: AxiosRequestConfig['headers'] = {
      'Content-Type': 'application/json',
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    }

    const res = await axios({
      url: `${API_BASE}${url}`,
      method,
      data,
      withCredentials: true,
      headers,
    })

    return res.data
  }

  const url = methodOrUrl
  const config = (urlOrConfig ?? {}) as AxiosRequestConfig & { data?: any }
  const token = localStorage.getItem('token')
  const authConfig = config as AxiosRequestConfig & LegacyAuthConfig

  const res = await axios({
    url: `${API_BASE}${url}`,
    method: config.method || 'GET',
    data: config.data,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      ...(authConfig.skipAuth ? {} : token ? { Authorization: `Bearer ${token}` } : {}),
      ...config.headers,
    },
  })

  return res.data
}

export function requireAuth() {
  const token = localStorage.getItem('token')

  if (!token) {
    window.location.href = '/login'
  }
}

export default api
