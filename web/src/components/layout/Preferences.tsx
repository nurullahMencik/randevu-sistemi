import { Languages, Monitor, Moon, Sun } from 'lucide-react'
import { useI18n } from '../../lib/i18n/context'
import { useTheme, type ThemePreference } from '../../lib/theme'
import { cn } from '../../lib/cn'

export function ThemeSwitch({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme()
  const { t } = useI18n()
  const options: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
    { value: 'system', label: t('theme.system'), Icon: Monitor },
    { value: 'light', label: t('theme.light'), Icon: Sun },
    { value: 'dark', label: t('theme.dark'), Icon: Moon },
  ]
  return (
    <div role="radiogroup" aria-label={t('theme.label')} className={cn('inline-flex rounded-xl bg-surface-2 p-0.5', className)}>
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          aria-label={label}
          title={label}
          onClick={() => setPreference(value)}
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-[10px] transition-colors',
            preference === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      ))}
    </div>
  )
}

export function LanguageSwitch({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n()
  const next = lang === 'tr' ? 'en' : 'tr'
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      aria-label={t('language.switchTo')}
      title={t('language.switchTo')}
      className={cn('inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink', className)}
    >
      <Languages className="size-4" aria-hidden />
      <span lang={next}>{next.toUpperCase()}</span>
    </button>
  )
}
