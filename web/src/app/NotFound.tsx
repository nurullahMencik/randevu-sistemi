import { Compass } from 'lucide-react'
import { ButtonLink } from '../components/ui/Button'
import { useI18n } from '../lib/i18n/context'

export function NotFound() {
  const { t } = useI18n()
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <Compass className="size-10 text-muted" aria-hidden />
      <h1 className="mt-4 font-display text-3xl font-semibold">{t('errors.pageNotFound')}</h1>
      <p className="mt-2 text-ink-2">{t('errors.pageNotFoundBody')}</p>
      <ButtonLink to="/" className="mt-6">
        {t('errors.goHome')}
      </ButtonLink>
    </div>
  )
}
