import { useEffect, useRef, type ReactNode } from 'react'

/** Step title that receives focus when the step changes, so screen readers announce it. */
export function StepHeading({ children, focusOnMount, aside }: { children: ReactNode; focusOnMount: boolean; aside?: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (!focusOnMount || !ref.current) return
    ref.current.focus({ preventScroll: true })
    ref.current.scrollIntoView({ block: 'nearest' })
  }, [focusOnMount])
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <h2 ref={ref} tabIndex={-1} className="scroll-mt-44 font-display text-2xl font-semibold tracking-tight outline-none sm:text-[1.75rem]">
        {children}
      </h2>
      {aside}
    </div>
  )
}
