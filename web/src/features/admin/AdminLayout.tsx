import { BookOpenText, CalendarDays, LayoutDashboard, ListChecks, Scissors, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { cn } from '../../lib/cn'
import { API_URL } from '../../lib/env'
import { useI18n } from '../../lib/i18n/context'

export function AdminLayout() {
  const { t } = useI18n()
  const items = [
    { to: '/admin', end: true, label: t('admin.nav.dashboard'), Icon: LayoutDashboard },
    { to: '/admin/calendar', end: false, label: t('admin.nav.calendar'), Icon: CalendarDays },
    { to: '/admin/appointments', end: false, label: t('admin.nav.appointments'), Icon: ListChecks },
    { to: '/admin/services', end: false, label: t('admin.nav.services'), Icon: Scissors },
    { to: '/admin/staff', end: false, label: t('admin.nav.staff'), Icon: Users },
  ]
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'inline-flex h-10 shrink-0 items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-colors',
      isActive ? 'bg-ink text-bg' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
    )

  return (
    <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[208px_minmax(0,1fr)] lg:gap-8 lg:py-8">
      <aside>
        <nav aria-label={t('admin.title')} className="lg:sticky lg:top-24">
          <p className="mb-3 hidden px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted lg:block">{t('admin.title')}</p>
          <ul className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {items.map(({ to, end, label, Icon }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={linkClass}>
                  <Icon className="size-4" aria-hidden />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
          <a
            href={`${API_URL}/scalar`}
            target="_blank"
            rel="noreferrer"
            className="mt-6 hidden items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-ink lg:inline-flex"
          >
            <BookOpenText className="size-4" aria-hidden />
            {t('common.apiDocs')}
          </a>
        </nav>
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-[2.1rem]">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-sm text-ink-2">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
