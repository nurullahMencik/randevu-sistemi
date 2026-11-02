import { cn } from '../../lib/cn'

interface SegmentedProps<T extends string | number> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  className?: string
}

/** A group of toggle buttons styled as a segmented control (exactly one is pressed). */
export function Segmented<T extends string | number>({ label, value, options, onChange, className }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn('inline-flex rounded-xl bg-surface-2 p-1', className)}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-8 rounded-lg px-3 text-sm font-medium transition-colors',
              selected ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
