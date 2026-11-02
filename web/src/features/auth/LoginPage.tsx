import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { Alert } from '../../components/ui/Feedback'
import { ApiError } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n/context'
import type { MessageKey } from '../../lib/i18n/types'
import { loginSchema, type LoginForm } from '../../lib/schemas'
import { DemoAccounts } from './DemoAccounts'
import { useAfterLogin } from './useAfterLogin'

export function LoginPage() {
  const { t, te } = useI18n()
  const { login } = useAuth()
  const location = useLocation()
  const afterLogin = useAfterLogin()
  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      afterLogin(await login(values.email, values.password))
    } catch (e) {
      form.setError('root', { message: te(e) })
      if (e instanceof ApiError && e.code === 'invalid_credentials') form.setFocus('password')
    }
  })

  const err = (key?: string) => (key ? t(key as MessageKey) : undefined)

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
      <div className="lg:pt-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight">{t('auth.loginTitle')}</h1>
        <p className="mt-2 text-ink-2">{t('auth.loginLead')}</p>
        <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
          {errors.root?.message ? <Alert tone="error">{errors.root.message}</Alert> : null}
          <Field label={t('auth.email')} error={err(errors.email?.message)}>
            {(props) => <Input {...props} type="email" autoComplete="email" inputMode="email" {...form.register('email')} />}
          </Field>
          <Field label={t('auth.password')} error={err(errors.password?.message)}>
            {(props) => <Input {...props} type="password" autoComplete="current-password" {...form.register('password')} />}
          </Field>
          <Button type="submit" size="lg" loading={isSubmitting} className="mt-2">
            {isSubmitting ? t('auth.submitting') : t('auth.submit')}
          </Button>
          <p className="text-sm text-ink-2">
            {t('auth.noAccount')}{' '}
            <Link to="/register" state={location.state} className="font-medium text-ink underline underline-offset-4">
              {t('auth.createAccount')}
            </Link>
          </p>
        </form>
      </div>
      <DemoAccounts onSignedIn={afterLogin} />
    </div>
  )
}
