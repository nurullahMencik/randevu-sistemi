import { CalendarCheck, LogIn, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Field, Textarea } from '../../components/ui/Field'
import { Alert } from '../../components/ui/Feedback'
import { DEMO_ACCOUNTS, DEMO_PASSWORD, useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n/context'

export function ConfirmStep({ submitting, error, onSubmit }: {
  submitting: boolean
  error: string | null
  onSubmit: (notes: string) => void
}) {
  const { t, te } = useI18n()
  const { user, status, login } = useAuth()
  const location = useLocation()
  const [notes, setNotes] = useState('')
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState<string | null>(null)
  const from = location.pathname + location.search

  const loginAsDemo = async () => {
    setDemoLoading(true)
    setDemoError(null)
    try {
      await login(DEMO_ACCOUNTS.Customer, DEMO_PASSWORD)
    } catch (e) {
      setDemoError(te(e))
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <div className="card p-4 sm:p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(notes)
        }}
        className="flex flex-col gap-5"
      >
        <Field label={`${t('booking.confirm.notes')} (${t('common.optional')})`}>
          {(props) => (
            <Textarea {...props} value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder={t('booking.confirm.notesPlaceholder')} />
          )}
        </Field>
        <p className="flex items-start gap-2 text-sm text-ink-2">
          <CalendarCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          {t('booking.confirm.policy')}
        </p>

        {error ? <Alert tone="error">{error}</Alert> : null}

        {status === 'restoring' ? null : !user ? (
          <div className="rounded-2xl border border-border bg-surface-2/60 p-4">
            <p className="font-semibold text-ink">{t('booking.confirm.loginRequired')}</p>
            <p className="mt-1 text-sm text-ink-2">{t('booking.confirm.loginRequiredBody')}</p>
            {demoError ? <Alert tone="error" className="mt-3">{demoError}</Alert> : null}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button onClick={loginAsDemo} loading={demoLoading} data-testid="demo-customer-login">
                {t('booking.confirm.loginAsDemo')}
              </Button>
              <ButtonLink to="/login" state={{ from }} variant="outline" icon={<LogIn className="size-4" aria-hidden />}>
                {t('nav.login')}
              </ButtonLink>
              <ButtonLink to="/register" state={{ from }} variant="ghost" icon={<UserPlus className="size-4" aria-hidden />}>
                {t('booking.confirm.register')}
              </ButtonLink>
            </div>
          </div>
        ) : user.role !== 'Customer' ? (
          <Alert tone="warning">{t('booking.confirm.wrongRole')}</Alert>
        ) : (
          <Button type="submit" size="lg" loading={submitting} className="w-full sm:w-auto sm:self-start" data-testid="confirm-booking">
            {submitting ? t('booking.confirm.submitting') : t('booking.confirm.submit')}
          </Button>
        )}
      </form>
    </div>
  )
}
