import { Link } from 'react-router'
import { useI18n } from '../../lib/i18n/context'

export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="var(--accent-fg)" strokeWidth="2.4" />
      <path d="M16 10.5V16l3.5 2.5" fill="none" stroke="var(--brand)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo() {
  const { t } = useI18n()
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-xl pr-2" aria-label={`${t('common.brand')} — ${t('common.brandLine')}`}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.35rem] font-semibold tracking-tight">{t('common.brand')}</span>
        <span className="mt-0.5 hidden text-[11px] font-medium uppercase tracking-[0.12em] text-muted min-[380px]:block">{t('common.brandLine')}</span>
      </span>
    </Link>
  )
}
