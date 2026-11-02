import { createContext, use } from 'react'
import type { Lang } from '../format'
import type { MessageKey, Params } from './types'

export interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: MessageKey, params?: Params) => string
  /** Human readable message for an ApiError (or any error). */
  te: (error: unknown) => string
}

export const I18nContext = createContext<I18nValue | null>(null)

export function useI18n(): I18nValue {
  const value = use(I18nContext)
  if (!value) throw new Error('useI18n must be used inside I18nProvider')
  return value
}
