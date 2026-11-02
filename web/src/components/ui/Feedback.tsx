import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Spinner({ label, className }: { label: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-3 py-10 text-sm text-muted', className)}>
      <span className="size-5 animate-spin rounded-full border-2 border-border-strong border-t-ink" aria-hidden />
      <span>{label}</span>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-surface-2', className)} aria-hidden />
}

type Tone = 'info' | 'error' | 'success' | 'warning'

const tones: Record<Tone, string> = {
  info: 'bg-info-soft text-ink',
  error: 'bg-danger-soft text-danger',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
}

const icons: Record<Tone, ReactNode> = {
  info: <Info className="mt-0.5 size-4.5 shrink-0" aria-hidden />,
  error: <AlertCircle className="mt-0.5 size-4.5 shrink-0" aria-hidden />,
  success: <CheckCircle2 className="mt-0.5 size-4.5 shrink-0" aria-hidden />,
  warning: <AlertCircle className="mt-0.5 size-4.5 shrink-0" aria-hidden />,
}

export function Alert({ tone = 'info', children, action, className }: { tone?: Tone; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-xl px-4 py-3 text-sm', tones[tone], className)}>
      {icons[tone]}
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-ink-2">{icon}</div>
      <p className="font-medium text-ink">{title}</p>
      {children}
    </div>
  )
}
