import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Lang } from '../format'
import { I18nContext, type I18nValue } from './context'
import { translate, translateError } from './translate'

const STORAGE_KEY = 'randevu.lang'

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'tr' || stored === 'en') return stored
  } catch {
    // ignore
  }
  return 'tr'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = translate(lang, 'meta.title')
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }, [])

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (key, params) => translate(lang, key, params),
      te: (error) => {
        const e = error as { code?: string; message?: string } | null
        return translateError(lang, e?.code, e?.message)
      },
    }),
    [lang, setLang],
  )

  return <I18nContext value={value}>{children}</I18nContext>
}
