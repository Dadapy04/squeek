import { describe, expect, it } from 'vitest'
import { setLocale, t } from '../src/extract/i18n.ts'
import { deathNote, guestExtractNote, keptRecordNote } from '../src/extract/online.ts'

describe('result rank copy', () => {
  it('keeps death and guest extract off the not-ranked line', () => {
    setLocale('id')
    expect(deathNote()).toBe('Gugur, loot hilang')
    expect(deathNote().toLowerCase()).not.toContain('leaderboard')
    const guest = guestExtractNote()
    expect(guest.startsWith('Mode Tamu')).toBe(true)
    expect(guest).toContain('Sambungkan dompet sebelum berangkat agar masuk leaderboard')
    expect(guest).not.toContain('Tidak masuk')
    expect(keptRecordNote(281)).toBe('Masuk leaderboard (rekor terbaikmu tetap 281)')
    expect(t('online.notRanked', { reason: t('online.why.fast', { depth: 2, sec: 4 }) })).toContain('Terlalu cepat')

    setLocale('en')
    expect(deathNote()).toBe('Fell, loot lost')
    expect(deathNote().toLowerCase()).not.toContain('leaderboard')
    expect(guestExtractNote()).toBe('Guest mode\nConnect a wallet before you head out to reach the leaderboard')
    expect(keptRecordNote(281)).toBe('Ranked (your best stays 281)')
    expect(t('online.notRanked', { reason: t('online.why.coins') })).toContain('outside the allowed band')
  })
})
