import { Clock, Scissors } from 'lucide-react'
import { EmptyState, Skeleton } from '../../components/ui/Feedback'
import { cn } from '../../lib/cn'
import { formatDuration, formatPrice } from '../../lib/format'
import { useI18n } from '../../lib/i18n/context'
import type { Service } from '../../lib/types'

export function ServiceStep({ services, loading, selectedId, onSelect }: {
  services: Service[] | undefined
  loading: boolean
  selectedId: string | null
  onSelect: (service: Service) => void
}) {
  const { t, lang } = useI18n()
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    )
  }
  if (!services?.length) return <EmptyState icon={<Scissors className="size-5" aria-hidden />} title={t('booking.service.empty')} />

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {services.map((service) => {
        const selected = service.id === selectedId
        return (
          <li key={service.id}>
            <button
              type="button"
              onClick={() => onSelect(service)}
              aria-pressed={selected}
              data-testid="service-option"
              className={cn(
                'group flex h-full w-full flex-col rounded-2xl border bg-surface p-4 text-left shadow-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-border-strong sm:p-5',
                selected ? 'border-ink ring-1 ring-ink' : 'border-border',
              )}
            >
              <span className="text-[1.05rem] font-semibold text-ink">{service.name}</span>
              {service.description ? <span className="mt-1 text-sm leading-relaxed text-ink-2">{service.description}</span> : null}
              <span className="mt-auto flex items-center justify-between gap-3 pt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-2">
                  <Clock className="size-3.5" aria-hidden />
                  {formatDuration(service.durationMinutes, lang)}
                </span>
                <span className="text-base font-semibold tabular text-ink">{formatPrice(service.price, lang)}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
