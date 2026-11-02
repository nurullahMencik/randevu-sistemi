import { CalendarCheck, CheckCheck, CircleSlash, UserX } from 'lucide-react'
import { useI18n } from '../../lib/i18n/context'
import { cn } from '../../lib/cn'
import type { AppointmentStatus } from '../../lib/types'

const styles: Record<AppointmentStatus, string> = {
  Confirmed: 'bg-info-soft text-ink',
  Completed: 'bg-success-soft text-success',
  Cancelled: 'bg-surface-3 text-ink-2',
  NoShow: 'bg-warning-soft text-warning',
}

const icons = {
  Confirmed: CalendarCheck,
  Completed: CheckCheck,
  Cancelled: CircleSlash,
  NoShow: UserX,
} as const

/** Status pill: icon + label, never colour alone. */
export function StatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const { t } = useI18n()
  const Icon = icons[status]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', styles[status], className)}>
      <Icon className="size-3.5" aria-hidden />
      {t(`status.${status}`)}
    </span>
  )
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-2', className)}>{children}</span>
}
