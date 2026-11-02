import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { homeFor } from '../../lib/auth'
import type { User } from '../../lib/types'

/** Returns to the page that sent the user to login (e.g. the booking confirm step), else their home. */
export function useAfterLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  return useCallback(
    (user: User) => {
      const isAuthPage = from === '/login' || from === '/register'
      const isBookingPage = from === '/' || from?.startsWith('/?')
      // Staff and admins cannot book, so never send them back into the booking flow.
      const canReturn = Boolean(from) && !isAuthPage && (user.role === 'Customer' || !isBookingPage)
      navigate(canReturn && from ? from : homeFor(user.role), { replace: true })
    },
    [from, navigate],
  )
}
