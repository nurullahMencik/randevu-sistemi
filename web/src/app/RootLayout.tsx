import { Outlet, ScrollRestoration, useLocation, useNavigation } from 'react-router'
import { Footer } from '../components/layout/Footer'
import { Header } from '../components/layout/Header'
import { Spinner } from '../components/ui/Feedback'
import { useI18n } from '../lib/i18n/context'

function NavigationProgress() {
  const navigation = useNavigation()
  if (navigation.state === 'idle') return null
  return <div className="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-brand" aria-hidden />
}

export function RootLayout() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  // Work screens (admin, staff) use a wider canvas than the customer-facing pages.
  const wide = pathname.startsWith('/admin') || pathname.startsWith('/staff')
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-accent px-4 py-2 text-accent-fg focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        {t('common.skipToContent')}
      </a>
      <NavigationProgress />
      <Header wide={wide} />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer wide={wide} />
      <ScrollRestoration />
    </div>
  )
}

export function RouteFallback() {
  const { t } = useI18n()
  return <Spinner label={t('common.loading')} className="py-32" />
}
