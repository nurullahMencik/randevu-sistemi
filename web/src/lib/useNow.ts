import { useSyncExternalStore } from 'react'

const MINUTE = 60_000
const listeners = new Set<() => void>()
let timer: number | undefined

function subscribe(listener: () => void) {
  listeners.add(listener)
  timer ??= window.setInterval(() => listeners.forEach((l) => l()), 15_000)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      window.clearInterval(timer)
      timer = undefined
    }
  }
}

/** Current time rounded down to the minute; re-renders subscribers when the minute changes. */
const snapshot = () => Math.floor(Date.now() / MINUTE) * MINUTE

export function useNow(): number {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
