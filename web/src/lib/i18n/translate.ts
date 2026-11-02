import type { Lang } from '../format'
import { en } from './en'
import { tr } from './tr'
import type { MessageKey, Messages, Params } from './types'

export const dictionaries: Record<Lang, Messages> = { tr, en }

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part]
    else return undefined
  }
  return typeof node === 'string' ? node : undefined
}

export function translate(lang: Lang, key: MessageKey | string, params?: Params): string {
  const text = lookup(dictionaries[lang], key) ?? lookup(dictionaries.tr, key) ?? key
  return params ? text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match)) : text
}

/** Translates an API problem code, falling back to the server's own (Turkish) message. */
export function translateError(lang: Lang, code: string | undefined, fallback?: string): string {
  if (code) {
    const text = lookup(dictionaries[lang], `errors.${code}`)
    if (text) return text
  }
  return fallback ?? translate(lang, 'errors.generic')
}
