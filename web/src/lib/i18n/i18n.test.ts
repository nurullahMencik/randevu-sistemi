import { describe, expect, it } from 'vitest'
import { en } from './en'
import { translate, translateError } from './translate'
import { tr } from './tr'

function keys(node: object, prefix = ''): string[] {
  return Object.entries(node).flatMap(([k, v]) => (typeof v === 'string' ? [`${prefix}${k}`] : keys(v as object, `${prefix}${k}.`)))
}

describe('i18n', () => {
  it('English and Turkish dictionaries have exactly the same keys', () => {
    expect(keys(en).toSorted()).toEqual(keys(tr).toSorted())
  })

  it('interpolates parameters', () => {
    expect(translate('tr', 'booking.day.free', { n: 12 })).toBe('12 boş')
    expect(translate('en', 'booking.stepOf', { current: 2, total: 5 })).toBe('Step 2 of 5')
  })

  it('maps API problem codes and falls back to the server message', () => {
    expect(translateError('en', 'slot_taken')).toBe('That time was just taken. Please pick another one.')
    expect(translateError('tr', 'unknown_code', 'Sunucu mesajı')).toBe('Sunucu mesajı')
    expect(translateError('tr', undefined)).toBe('Bir şeyler ters gitti. Lütfen tekrar deneyin.')
  })
})
