import { CalendarClock, CalendarPlus, LayoutDashboard, LogOut, Menu, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../lib/auth'
import { cn } from '../../lib/cn'
import { useI18n } from '../../lib/i18n/context'
import { ButtonLink } from '../ui/Button'
import { Logo } from './Logo'
import { LanguageSwitch, ThemeSwitch } from './Preferences'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors',
    isActive ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  )

export function Header({ wide }: { wide: boolean }) {
  const { t } = useI18n()
  const { user, status, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // The menu is open for the page it was opened on; navigating closes it without an effect.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null)
  const menuOpen = menuOpenOn === location.pathname

  const links = [
    { to: '/', label: t('nav.book'), Icon: CalendarPlus, end: true, show: !user || user.role === 'Customer' },
    { to: '/appointments', label: t('nav.myAppointments'), Icon: CalendarClock, end: false, show: user?.role === 'Customer' },
    { to: '/staff', label: t('nav.mySchedule'), Icon: CalendarClock, end: false, show: user?.role === 'Staff' },
    { to: '/admin', label: t('nav.admin'), Icon: LayoutDashboard, end: false, show: user?.role === 'Admin' },
  ].filter((l) => l.show)

  const onLogout = async () => {
    await logout()
    navigate('/')
  }

  const account =
    user ? (
      <div className="flex items-center gap-2">
        <span className="hidden max-w-40 truncate text-sm text-ink-2 lg:inline" title={user.email}>
          <UserRound className="mr-1 inline size-4 align-[-3px]" aria-hidden />
          {user.fullName}
        </span>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          <LogOut className="size-4" aria-hidden />
          {t('nav.logout')}
        </button>
      </div>
    ) : status === 'restoring' ? null : (
      <ButtonLink to="/login" state={{ from: location.pathname + location.search }} size="sm" variant="primary">
        {t('nav.login')}
      </ButtonLink>
    )

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/85 backdrop-blur-md supports-[backdrop-filter]:bg-bg/70">
      <div className={cn('mx-auto flex h-16 items-center gap-3 px-4 sm:px-6', wide ? 'max-w-[1500px]' : 'max-w-6xl')}>
        <Logo />
        <nav aria-label={t('nav.main')} className="ml-4 hidden items-center gap-1 md:flex">
          {links.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon className="size-4" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <LanguageSwitch />
          <ThemeSwitch />
          <span className="mx-1 h-6 w-px bg-border" aria-hidden />
          {account}
        </div>
        <button
          type="button"
          className="ml-auto inline-flex size-10 items-center justify-center rounded-xl text-ink hover:bg-surface-2 md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={t('nav.menu')}
          onClick={() => setMenuOpenOn(menuOpen ? null : location.pathname)}
        >
          {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>
      {menuOpen ? (
        <div id="mobile-menu" className="animate-rise border-t border-border bg-bg px-4 pb-4 pt-3 md:hidden">
          <nav aria-label={t('nav.main')} className="flex flex-col gap-1">
            {links.map(({ to, label, Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={linkClass}>
                <Icon className="size-4" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <LanguageSwitch />
              <ThemeSwitch />
            </div>
            {account}
          </div>
        </div>
      ) : null}
    </header>
  )
}
