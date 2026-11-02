import { useQueryClient } from '@tanstack/react-query'
import { CloudSun, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { API_URL } from '../lib/env'
import { useI18n } from '../lib/i18n/context'
import { LogoMark } from './layout/Logo'
import { Button } from './ui/Button'

type State = 'checking' | 'waking' | 'ready'

const SHOW_AFTER_MS = 1500
const RETRY_EVERY_MS = 3000
const ATTEMPT_TIMEOUT_MS = 8000
const EXPECTED_WAKE_S = 60
const GIVE_UP_HINT_S = 120

/**
 * The API sleeps on Render's free tier. Ping /health on start; if it does not answer quickly,
 * cover the app with a friendly "waking up" screen that retries automatically and shows progress.
 */
export function ServerWakeGate({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [state, setState] = useState<State>('checking')
  const [attempt, setAttempt] = useState(1)
  const [elapsed, setElapsed] = useState(0)
  const retryNow = useRef<() => void>(() => undefined)
  const retryButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let cancelled = false
    let overlayShown = false
    let retryTimer: number | undefined
    const startedAt = Date.now()

    const tick = window.setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 1000)
    const show = window.setTimeout(() => {
      overlayShown = true
      setState((s) => (s === 'checking' ? 'waking' : s))
    }, SHOW_AFTER_MS)

    const ping = async (): Promise<void> => {
      window.clearTimeout(retryTimer)
      try {
        const response = await fetch(`${API_URL}/health`, { cache: 'no-store', signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) })
        await response.text() // Drain the body so the connection is released.
        if (response.ok && !cancelled) {
          window.clearTimeout(show)
          window.clearInterval(tick)
          setState('ready')
          // Requests made while the server was asleep may have failed: try them again now.
          if (overlayShown) void queryClient.refetchQueries({ predicate: (q) => q.state.status === 'error' })
          return
        }
      } catch {
        // Not up yet.
      }
      if (cancelled) return
      setAttempt((n) => n + 1)
      retryTimer = window.setTimeout(() => void ping(), RETRY_EVERY_MS)
    }

    retryNow.current = () => void ping()
    void ping()
    return () => {
      cancelled = true
      window.clearTimeout(retryTimer)
      window.clearTimeout(show)
      window.clearInterval(tick)
    }
  }, [queryClient])

  useEffect(() => {
    if (state === 'waking') retryButton.current?.focus()
  }, [state])

  const waking = state === 'waking'
  // Ease towards 95 % over the expected wake time; never claim 100 % before the server answers.
  const progress = Math.min(95, Math.round(95 * (1 - Math.exp(-elapsed / (EXPECTED_WAKE_S / 2.5)))))

  return (
    <>
      <div inert={waking}>{children}</div>
      {waking ? (
        <div role="dialog" aria-modal="true" aria-labelledby="wake-title" aria-describedby="wake-body" className="fixed inset-0 z-50 flex items-center justify-center bg-bg/95 p-4 backdrop-blur-sm">
          <div className="card animate-rise w-full max-w-md p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <LogoMark className="size-10" />
              <CloudSun className="size-6 text-brand" aria-hidden />
            </div>
            <h1 id="wake-title" className="mt-5 font-display text-2xl font-semibold">
              {t('wake.title')}
            </h1>
            <p id="wake-body" className="mt-2 text-sm leading-relaxed text-ink-2">
              {t('wake.body')}
            </p>
            <div className="mt-6">
              <div
                role="progressbar"
                aria-label={t('wake.title')}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                className="h-2 overflow-hidden rounded-full bg-surface-3"
              >
                <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted tabular" aria-live="polite">
                <span>{t('wake.attempt', { n: attempt })}</span>
                <span>{t('wake.elapsed', { s: elapsed })}</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-ink-2">{elapsed > GIVE_UP_HINT_S ? t('wake.unreachable') : t('wake.stillTrying')}</p>
            <Button ref={retryButton} variant="outline" className="mt-5 w-full" icon={<RefreshCw className="size-4" aria-hidden />} onClick={() => retryNow.current()}>
              {t('wake.retryNow')}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  )
}
