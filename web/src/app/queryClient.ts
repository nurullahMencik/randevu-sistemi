import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '../lib/api'

const TRANSIENT = new Set([0, 502, 503, 504])

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retry only what can succeed later (network errors, a waking server); never 4xx.
      retry: (failureCount, error) => error instanceof ApiError && TRANSIENT.has(error.status) && failureCount < 4,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: { retry: false },
  },
})
