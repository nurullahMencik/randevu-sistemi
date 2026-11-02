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
import { registerSchema, type RegisterForm } from '../../lib/schemas'
import { useAfterLogin } from './useAfterLogin'

export function RegisterPage() {
  const { t, te } = useI18n()
  const { register: signUp } = useAuth()
  const location = useLocation()
  const afterLogin = useAfterLogin()
  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      afterLogin(await signUp(values))
    } catch (e) {
      if (e instanceof ApiError && e.code === 'email_taken') {
        form.setError('email', { message: te(e) })
        return
      }
      if (e instanceof ApiError) {
        for (const [field, messages] of Object.entries(e.fieldErrors)) {
          if (field in values) form.setError(field as keyof RegisterForm, { message: messages[0] })
        }
      }
      form.setError('root', { message: te(e) })
    }
  })

  const err = (key?: string) => (key ? (key.startsWith('validation.') ? t(key as MessageKey) : key) : undefined)

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">{t('auth.registerTitle')}</h1>
      <p className="mt-2 text-ink-2">{t('auth.registerLead')}</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
        {errors.root?.message ? <Alert tone="error">{errors.root.message}</Alert> : null}
        <Field label={t('auth.fullName')} error={err(errors.fullName?.message)}>
          {(props) => <Input {...props} autoComplete="name" {...form.register('fullName')} />}
        </Field>
        <Field label={t('auth.email')} error={err(errors.email?.message)}>
          {(props) => <Input {...props} type="email" autoComplete="email" inputMode="email" {...form.register('email')} />}
        </Field>
        <Field label={`${t('auth.phone')} (${t('common.optional')})`} error={err(errors.phone?.message)}>
          {(props) => <Input {...props} type="tel" autoComplete="tel" inputMode="tel" placeholder="+90 5xx xxx xx xx" {...form.register('phone')} />}
        </Field>
        <Field label={t('auth.password')} hint={t('auth.passwordHint')} error={err(errors.password?.message)}>
          {(props) => <Input {...props} type="password" autoComplete="new-password" {...form.register('password')} />}
        </Field>
        <Button type="submit" size="lg" loading={isSubmitting} className="mt-2">
          {isSubmitting ? t('auth.registering') : t('auth.register')}
        </Button>
        <p className="text-sm text-ink-2">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" state={location.state} className="font-medium text-ink underline underline-offset-4">
            {t('nav.login')}
          </Link>
        </p>
      </form>
    </div>
  )
}
