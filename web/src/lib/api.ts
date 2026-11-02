import { API_URL } from './env'
import type { AuthResponse, ProblemDetails } from './types'

/** An RFC 9457 problem returned by the API, or a network failure (status 0). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly problem: ProblemDetails

  constructor(status: number, problem: ProblemDetails) {
    super(problem.detail ?? problem.title ?? `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.code = problem.code ?? (status === 0 ? 'network_error' : 'error')
    this.problem = problem
  }

  get fieldErrors(): Record<string, string[]> {
    return this.problem.errors ?? {}
  }
}

const REFRESH_KEY = 'randevu.refresh'

interface TokenStore {
  accessToken: string | null
  onSession: ((session: AuthResponse | null) => void) | null
}

/**
 * Access token lives in memory only; the rotating refresh token in localStorage so a reload
 * keeps the session. (The API is on another site than GitHub Pages, so a SameSite cookie is
 * not an option without third-party cookies.)
 */
const store: TokenStore = { accessToken: null, onSession: null }

export const tokens = {
  get access() {
    return store.accessToken
  },
  get refresh(): string | null {
    try {
      return localStorage.getItem(REFRESH_KEY)
    } catch {
      return null
    }
  },
  set(session: AuthResponse | null) {
    store.accessToken = session?.accessToken ?? null
    try {
      if (session) localStorage.setItem(REFRESH_KEY, session.refreshToken)
      else localStorage.removeItem(REFRESH_KEY)
    } catch {
      // Storage may be unavailable (private mode); the session then lasts for this tab only.
    }
    store.onSession?.(session)
  },
  subscribe(listener: (session: AuthResponse | null) => void) {
    store.onSession = listener
    return () => {
      if (store.onSession === listener) store.onSession = null
    }
  },
}

let refreshing: Promise<AuthResponse | null> | null = null

async function doRefresh(): Promise<AuthResponse | null> {
  const run = async () => {
    // Read inside the lock: another tab may already have rotated the token.
    const current = tokens.refresh
    if (!current) return null
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: current }),
    })
    if (!response.ok) {
      tokens.set(null)
      return null
    }
    const session = (await response.json()) as AuthResponse
    tokens.set(session)
    return session
  }

  // Serialise rotation across tabs so two tabs never present the same single-use token.
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request('randevu-refresh', run)
  }
  return run()
}

/** Rotates the refresh token once, even if many requests ask at the same time. */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null
  })
  return refreshing
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  auth?: boolean
  timeoutMs?: number
}

export async function request<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const { body, auth = true, timeoutMs = 20_000, headers, signal, ...init } = options
  const finalHeaders = new Headers(headers)
  if (body !== undefined) finalHeaders.set('Content-Type', 'application/json')
  if (auth && tokens.access) finalHeaders.set('Authorization', `Bearer ${tokens.access}`)

  const timeout = AbortSignal.timeout(timeoutMs)
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError(0, { title: 'Network error', code: 'network_error' })
  }

  if (response.status === 401 && auth && !retried && tokens.refresh) {
    const session = await refreshSession()
    if (session) return request<T>(path, options, true)
  }

  if (!response.ok) {
    let problem: ProblemDetails = { status: response.status }
    try {
      problem = (await response.json()) as ProblemDetails
    } catch {
      // Non-JSON error body (e.g. a proxy page while the server boots).
    }
    throw new ApiError(response.status, problem)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
}

/** Builds a query string, skipping empty values. */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}
