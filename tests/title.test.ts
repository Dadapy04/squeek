import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('id')
import { EXTRACT_SAVE_KEY } from '../src/extract/save.ts'
import { TITLE_INTRO, titleLayout, titlePrompt, titleUsesDesktopPrompt } from '../src/extract/title.ts'

const boot = readFileSync(new URL('../src/extract/boot.ts', import.meta.url), 'utf8')

describe('title screen', () => {
  it('introduces the mine in under a second and a half', () => {
    expect(TITLE_INTRO).toBeGreaterThan(0.8)
    expect(TITLE_INTRO).toBeLessThanOrEqual(1.5)
    expect(titlePrompt(false)).toBe('KETUK UNTUK MULAI')
    expect(titlePrompt(true)).toBe('Klik / tekan Enter untuk mulai')
    expect(titleUsesDesktopPrompt({ fine: false, coarse: true, hover: false, width: 1280 })).toBe(false)
    expect(titleUsesDesktopPrompt({ fine: true, coarse: false, hover: true, width: 844 })).toBe(true)
    expect(titleUsesDesktopPrompt({ fine: false, coarse: false, hover: false, width: 1280 })).toBe(true)
    expect(titleUsesDesktopPrompt({ fine: false, coarse: false, hover: false, width: 844 })).toBe(false)
    const phone = titlePrompt(false)
    const desk = titlePrompt(true)
    const views = [[390, 844], [375, 667], [844, 390], [1280, 800], [1920, 1080]]
    for (const [w, h] of views) {
      for (const prompt of [phone, desk]) {
        const layout = titleLayout(w!, h!, prompt)
        expect(layout.namePx).toBeLessThanOrEqual(w! - layout.margin * 2)
        expect(layout.subPx).toBeLessThanOrEqual(w! - layout.margin * 2)
        expect(layout.promptPx).toBeLessThanOrEqual(w! - layout.margin * 2)
        expect(layout.scenePxW).toBeLessThanOrEqual(w! - layout.margin * 2)
        expect(layout.scenePxH).toBeLessThanOrEqual(h! - layout.hudTop - layout.hudBottom)
        expect(layout.nameScale).toBe(Math.round(layout.nameScale))
        expect(layout.sceneScale).toBe(Math.round(layout.sceneScale))
      }
    }
    expect(titleLayout(390, 844, phone).sceneScale).toBeLessThanOrEqual(2)
    expect(titleLayout(375, 667, phone).sceneScale).toBe(2)
    expect(titleLayout(390, 844, phone).sceneScale).toBe(2)
    expect(titleLayout(844, 390, phone).sceneScale).toBeGreaterThanOrEqual(2)
  })

  it('keeps the prototype wheel feed and backup pages off the base screen', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
    const copy = readFileSync(new URL('../src/extract/i18n.ts', import.meta.url), 'utf8')
    const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')
    for (const phrase of ['wheelBase', 'arena.html', 'rpg.html', 'legacy.html', 'Wave arena', 'Old extraction', 'Not a token', 'Bukan token', 'Arena gelombang', 'Extraction lama', 'nav.arena', 'wheel.wait', 'wheel.base', 'wheel.spin']) {
      expect(html, phrase).not.toContain(phrase)
      expect(copy, phrase).not.toContain(phrase)
    }
    expect(boot).not.toContain('wheelText')
    expect(boot).not.toContain('#wheelBase')
    expect(boot).toContain('addSupport(save, decision.energy)')
    expect(boot).toContain('STATUS_URL')
    expect(vite).toContain("arena: resolve('arena.html')")
    expect(vite).toContain("rpg: resolve('rpg.html')")
    expect(vite).toContain("legacy: resolve('legacy.html')")
  })

  it('starts on tap or Enter and does not rename the save', () => {
    expect(EXTRACT_SAVE_KEY).toBe('npcs-burrow-pixel-extract.save.v1')
    expect(boot).toContain("titleEl.addEventListener('pointerdown'")
    expect(boot).toContain("event.key === 'Enter'")
    expect(boot).toContain('dismissTitle()')
    const dismiss = boot.indexOf('function dismissTitle')
    const saveWrite = boot.indexOf('writeExtract(storage, save)', dismiss)
    expect(dismiss).toBeGreaterThan(0)
    expect(saveWrite === -1 || saveWrite > dismiss + 400).toBe(true)
  })
})
