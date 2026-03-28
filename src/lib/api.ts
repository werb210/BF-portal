import axios, { AxiosRequestConfig } from 'axios'

const API_BASE = import.meta.env.VITE_API_URL

const api = axios.create({
  baseURL: API_BASE,
})

export async function apiRequest<T = any>(
  url: string,
  config: AxiosRequestConfig & { data?: any } = {}
): Promise<T> {
  const token = localStorage.getItem('token')

  const res = await api({
    url,
    method: config.method || 'GET',
    data: config.data,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
