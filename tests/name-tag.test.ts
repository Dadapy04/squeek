import { describe, expect, it } from 'vitest'
import { DICT } from '../src/extract/i18n.ts'
import { nameTagLabel, needsNickname, placeNameTag, shortAddress } from '../src/extract/name-tag.ts'

describe('wallet name tag', () => {
  it('uses the nickname, and the short address when there is none', () => {
    const address = '0x1234567890abcdef1234567890abcdef1234abcd'
    expect(shortAddress(address)).toBe('0x1234…abcd')
    expect(nameTagLabel('Squeek', address)).toBe('Squeek')
    expect(nameTagLabel('  ', address)).toBe('0x1234…abcd')
    expect(nameTagLabel(null, address)).toBe('0x1234…abcd')
    expect(nameTagLabel('A very long nickname indeed', address)).toBe('A very long nick')
    expect(needsNickname(null)).toBe(true)
    expect(needsNickname('   ')).toBe(true)
    expect(needsNickname('Squeek')).toBe(false)
  })

  it('floats the tag above the hamster and steps it off a foe', () => {
    const clear = placeNameTag({ headTop: 200, centerX: 100 }, { w: 40, h: 12 }, [])
    expect(clear.y + clear.h).toBeLessThanOrEqual(200 - 6)
    expect(clear.x).toBe(80)
    const blocked = placeNameTag({ headTop: 200, centerX: 100 }, { w: 40, h: 12 }, [{ x: 100, y: 188, r: 20 }])
    expect(blocked.y + blocked.h).toBeLessThanOrEqual(188 - 20)
    expect(blocked.y + blocked.h).toBeLessThanOrEqual(200 - 6)
  })

  it('keeps the connect and disconnect toasts in both languages', () => {
    expect(DICT['online.toastOn']).toEqual({ id: 'Wallet terhubung', en: 'Wallet connected' })
    expect(DICT['online.toastOff']).toEqual({ id: 'Wallet terputus', en: 'Wallet disconnected' })
  })
})
