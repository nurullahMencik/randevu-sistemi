import { CalendarClock, LayoutDashboard, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Feedback'
import { DEMO_ACCOUNTS, DEMO_PASSWORD, useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n/context'
import type { User, UserRole } from '../../lib/types'

export function DemoAccounts({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const { t, te } = useI18n()
  const { login } = useAuth()
  const [pending, setPending] = useState<UserRole | null>(null)
  const [error, setError] = useState<string | null>(null)

  const accounts: { role: UserRole; title: string; body: string; Icon: typeof UserRound; name: string }[] = [
    { role: 'Customer', title: t('auth.demoCustomer'), body: t('auth.demoCustomerBody'), Icon: UserRound, name: 'Deniz Yılmaz' },
    { role: 'Staff', title: t('auth.demoStaff'), body: t('auth.demoStaffBody'), Icon: CalendarClock, name: 'Emre Yıldız' },
    { role: 'Admin', title: t('auth.demoAdmin'), body: t('auth.demoAdminBody'), Icon: LayoutDashboard, name: 'Selin Aksoy' },
  ]

  const signIn = async (role: UserRole) => {
    setPending(role)
    setError(null)
    try {
      onSignedIn(await login(DEMO_ACCOUNTS[role], DEMO_PASSWORD))
    } catch (e) {
      setError(te(e))
    } finally {
      setPending(null)
    }
  }

  return (
    <section aria-labelledby="demo-title" className="rounded-3xl border border-border bg-surface-2/60 p-5 sm:p-7">
      <h2 id="demo-title" className="font-display text-2xl font-semibold">
        {t('auth.demoTitle')}
      </h2>
      <p className="mt-1.5 text-sm text-ink-2">{t('auth.demoLead')}</p>
      {error ? (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      ) : null}
      <ul className="mt-5 flex flex-col gap-3">
        {accounts.map(({ role, title, body, Icon, name }) => (
          <li key={role} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">
                {title} <span className="font-normal text-muted">· {name}</span>
              </p>
              <p className="text-sm text-ink-2">{body}</p>
              <p className="mt-0.5 truncate font-mono text-xs text-muted">{DEMO_ACCOUNTS[role]}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              loading={pending === role}
              disabled={pending !== null}
              onClick={() => void signIn(role)}
              data-testid={`demo-${role.toLowerCase()}`}
            >
              {t('auth.demoButton', { role: title })}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
