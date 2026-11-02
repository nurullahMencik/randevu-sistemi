import { Users } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState, Skeleton } from '../../components/ui/Feedback'
import { cn } from '../../lib/cn'
import { useI18n } from '../../lib/i18n/context'
import type { DayOfWeek, Staff } from '../../lib/types'

const WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function StaffStep({ staff, loading, selected, onSelect }: {
  staff: Staff[] | undefined
  loading: boolean
  selected: string | null
  onSelect: (staffId: string) => void
}) {
  const { t } = useI18n()
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
    )
  }
  if (!staff?.length) return <EmptyState icon={<Users className="size-5" aria-hidden />} title={t('booking.staff.empty')} />

  const cardClass = (isSelected: boolean) =>
    cn(
      'flex h-full w-full gap-4 rounded-2xl border bg-surface p-4 text-left shadow-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-border-strong sm:p-5',
      isSelected ? 'border-ink ring-1 ring-ink' : 'border-border',
    )

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      <li className="sm:col-span-2">
        <button type="button" onClick={() => onSelect('any')} aria-pressed={selected === 'any'} className={cardClass(selected === 'any')} data-testid="staff-any">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Users className="size-5" aria-hidden />
          </span>
          <span>
            <span className="block font-semibold text-ink">{t('booking.staff.anyTitle')}</span>
            <span className="mt-1 block text-sm leading-relaxed text-ink-2">{t('booking.staff.anyBody')}</span>
          </span>
        </button>
      </li>
      {staff.map((member) => (
        <li key={member.id}>
          <button type="button" onClick={() => onSelect(member.id)} aria-pressed={selected === member.id} className={cardClass(selected === member.id)} data-testid="staff-option">
            <Avatar name={member.fullName} color={member.color} />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">{member.fullName}</span>
              <span className="block text-sm text-ink-2">{member.title}</span>
              {member.bio ? <span className="mt-2 line-clamp-2 block text-sm leading-relaxed text-muted">{member.bio}</span> : null}
              <span className="mt-3 flex flex-wrap gap-1" aria-label={t('booking.staff.worksOn')}>
                {WEEK.map((day) => {
                  const works = member.workingDays.includes(day)
                  return (
                    <span
                      key={day}
                      title={t(`days.${day}`)}
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                        works ? 'bg-surface-2 text-ink-2' : 'text-muted line-through decoration-1 opacity-70',
                      )}
                    >
                      <span aria-hidden>{t(`daysShort.${day}`)}</span>
                      <span className="sr-only">{works ? t(`days.${day}`) : ''}</span>
                    </span>
                  )
                })}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
