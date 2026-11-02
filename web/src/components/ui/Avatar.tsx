import { initials } from '../../lib/format'
import { useSeriesColor } from '../../lib/theme'
import { cn } from '../../lib/cn'

/** Initials on a soft tint of the person's calendar colour, with a solid colour ring. */
export function Avatar({ name, color, size = 'md' }: { name: string; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const series = useSeriesColor()
  const c = series(color)
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-ink',
        size === 'sm' && 'size-8 text-xs',
        size === 'md' && 'size-11 text-sm',
        size === 'lg' && 'size-14 text-base',
      )}
      style={{ background: `color-mix(in oklab, ${c} 22%, var(--surface))`, boxShadow: `inset 0 0 0 2px ${c}` }}
    >
      {initials(name)}
    </span>
  )
}

export function ColorDot({ color, className }: { color: string; className?: string }) {
  const series = useSeriesColor()
  return <span aria-hidden className={cn('inline-block size-2.5 shrink-0 rounded-full', className)} style={{ background: series(color) }} />
}
