import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Spinner } from '../components/ui/Feedback'
import { homeFor, useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n/context'
import type { UserRole } from '../lib/types'

/** Renders children only for the given roles; otherwise sends the visitor to login or their home. */
export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { user, status } = useAuth()
  const location = useLocation()
  const { t } = useI18n()

  if (status === 'restoring') return <Spinner label={t('common.loading')} className="py-24" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />
  return children
}
