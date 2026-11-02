import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useI18n } from '../../lib/i18n/context'
import { STEPS, type StepId } from './useBookingState'

export function StepIndicator({ current, onSelect }: { current: StepId; onSelect: (step: StepId) => void }) {
  const { t } = useI18n()
  const currentIndex = STEPS.indexOf(current)
  return (
    <nav aria-label={t('booking.stepsLabel')}>
      <p className="sr-only">{t('booking.stepOf', { current: currentIndex + 1, total: STEPS.length })}</p>
      <ol className="grid grid-cols-5 gap-1 sm:gap-2">
        {STEPS.map((step, index) => {
          const done = index < currentIndex
          const active = index === currentIndex
          const content = (
            <>
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  done && 'bg-ink text-bg',
                  active && 'bg-brand text-white ring-4 ring-brand-soft dark:text-[#1b1a17]',
                  !done && !active && 'bg-surface-3 text-muted',
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : index + 1}
              </span>
              <span className={cn('text-xs font-medium sm:text-sm', active ? 'text-ink' : done ? 'text-ink-2' : 'text-muted')}>
                {t(`booking.steps.${step}`)}
              </span>
            </>
          )
          return (
            <li key={step} className="relative">
              {index > 0 ? (
                <span
                  aria-hidden
                  className={cn('absolute top-[1.125rem] h-px', index <= currentIndex ? 'bg-ink/50' : 'bg-border-strong')}
                  style={{ left: 'calc(-50% + 1.125rem)', right: 'calc(50% + 1.125rem)' }}
                />
              ) : null}
              {done ? (
                <button
                  type="button"
                  onClick={() => onSelect(step)}
                  className="relative flex w-full flex-col items-center gap-1.5 rounded-lg py-1 hover:opacity-80"
                  aria-label={t('booking.summary.edit', { step: t(`booking.steps.${step}`) })}
                >
                  {content}
                </button>
              ) : (
                <div className="relative flex flex-col items-center gap-1.5 py-1" aria-current={active ? 'step' : undefined}>
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
