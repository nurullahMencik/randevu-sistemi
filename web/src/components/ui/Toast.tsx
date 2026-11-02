import { CheckCircle2, X } from 'lucide-react'
import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../../lib/i18n/context'

interface ToastValue {
  notify: (message: string) => void
}

const ToastContext = createContext<ToastValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [items, setItems] = useState<{ id: number; message: string }[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), [])
  const notify = useCallback(
    (message: string) => {
      const id = nextId.current++
      setItems((current) => [...current.slice(-2), { id, message }])
      window.setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ notify }), [notify])
  return (
    <ToastContext value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {items.map((item) => (
          <div key={item.id} className="animate-rise pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-accent px-4 py-3 text-sm text-accent-fg shadow-lg">
            <CheckCircle2 className="size-4.5 shrink-0" aria-hidden />
            <span className="flex-1">{item.message}</span>
            <button type="button" onClick={() => dismiss(item.id)} className="rounded p-0.5 opacity-70 hover:opacity-100" aria-label={t('common.close')}>
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}

export function useToast(): ToastValue {
  const value = use(ToastContext)
  if (!value) throw new Error('useToast must be used inside ToastProvider')
  return value
}
