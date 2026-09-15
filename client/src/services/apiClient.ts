/**
 * Centralized HTTP client.
 *
 * No auth tokens — the anonymous session and admin login both ride on
 * httpOnly cookies, so every request just needs credentials: 'include'.
 * Throws ApiError on non-2xx responses so callers can use a single
 * try/catch instead of manually checking res.ok.
 *
 * Usage:
 *   import { apiClient } from './apiClient.ts';
 *   const data = await apiClient.get('/api/session/history');
 */

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...options, credentials: 'include' })

  if (res.status === 204) return null as T

  const data = await res.json().catch(() => ({})) as T & { error?: string }
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `HTTP ${res.status}`, res.status)
  return data
}

export const apiClient = {
  get: <T = unknown>(url: string) =>
    request<T>(url),

  post: <T = unknown>(url: string, body?: unknown) =>
    request<T>(url, {
      method: 'POST',
      ...(body !== undefined
        ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : {}),
    }),

  patch: <T = unknown>(url: string, body: unknown) =>
    request<T>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  delete: <T = unknown>(url: string) =>
    request<T>(url, { method: 'DELETE' }),
}
