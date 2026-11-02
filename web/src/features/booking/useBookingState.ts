import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

export type StepId = 'service' | 'staff' | 'day' | 'time' | 'confirm'
export const STEPS: StepId[] = ['service', 'staff', 'day', 'time', 'confirm']

const PARAM: Record<StepId, string> = { service: 'service', staff: 'staff', day: 'date', time: 'slot', confirm: '' }

export interface BookingSelection {
  serviceId: string | null
  /** 'any' means "no preference". */
  staff: string | null
  date: string | null
  slot: string | null
}

/** The whole wizard state lives in the URL, so refresh, back/forward and deep links just work. */
export function useBookingState() {
  const [params, setParams] = useSearchParams()

  const selection: BookingSelection = useMemo(
    () => ({
      serviceId: params.get('service'),
      staff: params.get('staff'),
      date: params.get('date'),
      slot: params.get('slot'),
    }),
    [params],
  )

  const step: StepId = !selection.serviceId
    ? 'service'
    : !selection.staff
      ? 'staff'
      : !selection.date
        ? 'day'
        : !selection.slot
          ? 'time'
          : 'confirm'

  const update = useCallback(
    (changes: Partial<Record<'service' | 'staff' | 'date' | 'slot', string | null>>, replace = false) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value)
            else next.delete(key)
          }
          return next
        },
        { replace, preventScrollReset: true },
      )
    },
    [setParams],
  )

  /** Go back to a step: clears its own value and everything after it. */
  const goTo = useCallback(
    (target: StepId) => {
      const index = STEPS.indexOf(target)
      const clear: Record<string, null> = {}
      for (const s of STEPS.slice(index)) if (PARAM[s]) clear[PARAM[s]] = null
      update(clear)
    },
    [update],
  )

  const reset = useCallback(() => setParams(new URLSearchParams()), [setParams])

  return { selection, step, stepIndex: STEPS.indexOf(step), update, goTo, reset }
}
