import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DICT, dictionaryKeys, setLocale, t, type Locale, type MsgKey } from '../src/extract/i18n.ts'
import { bladeDisplay, bossDisplay, depthPlan, foeName, reachNote, type Breed } from '../src/extract/depths.ts'
import { deploy, freshSave, step, warpFloor, type Input } from '../src/extract/sim.ts'
import { bossTitle, drawExtract, drawGallery } from '../src/extract/view.ts'
import { workshopView } from '../src/extract/workshop.ts'
import { spearStatLine, rollSpear } from '../src/extract/spear.ts'
import { titlePrompt } from '../src/extract/title.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null, soul: false }

const ID_WORDS = [
  'kelabang', 'induk', 'liang', 'leluhur', 'mondok', 'kumbang', 'mulut', 'tambang', 'pangkalan', 'reruntuhan', 'sarang',
  'kedalaman', 'koin', 'dtk', 'pedang', 'perisai', 'bengkel', 'pedagang', 'simpanan', 'asuransi', 'tangkis', 'nyawa',
  'bawaan', 'galian', 'kalahkan', 'kebal', 'biasa', 'langka', 'pusaka', 'legenda', 'perban', 'tonik', 'bijih', 'relik',
  'pecahan', 'tombak', 'turun', 'kena', 'krit', 'terpasang', 'butuh', 'peti', 'ngengat', 'penggali', 'pelontar',
  'zirah', 'lendir', 'kawanan', 'pengawal', 'perajut', 'pacet', 'penabur', 'penghancur', 'taring', 'cakar', 'mahkota',
  'cangkang', 'jantung', 'pelebur', 'berangkat', 'menyerah', 'mengamuk', 'daya', 'besi', 'jatuh',
]

const EN_WORDS = [
  'depth', 'sword', 'shield', 'workshop', 'stash', 'extract', 'common', 'rare', 'heirloom', 'legendary', 'glance',
  'enraged', 'coins', 'bandage', 'medkit', 'defeat', 'carried', 'settings', 'merchant', 'dodge', 'brood', 'burrow',
  'queen', 'spider', 'maw', 'fang', 'crown', 'ancestral', 'matriarch', 'elder', 'beetle', 'centipede', 'digging',
  'ember', 'equipped', 'chest', 'loadout', 'haul', 'pattern', 'shift',
]

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+/g) ?? []
}

function corpus(locale: Locale): Set<string> {
  setLocale(locale)
  const bag = new Set<string>()
  const add = (text: string) => { for (const word of words(text)) bag.add(word) }
  const sample = { n: 3, power: 24, need: 36, name: 'Name', depth: 2, hp: 44, dmg: 12, lv: 2, pct: 8, cap: 4, scrap: 1, ore: 1, cost: 4, coins: 8, from: 12, to: 16, boss: 'Boss', rarity: 'Rare', max: 125, reach: 40, slots: 12 }
  for (const key of dictionaryKeys()) {
    add(DICT[key][locale])
    add(t(key, sample))
  }
  return bag
}

function mockPen(log: string[]) {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'fillText' || prop === 'strokeText') return (text: unknown) => { if (text != null) log.push(String(text)) }
      if (prop === 'measureText') return () => ({ width: 8 })
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => ({ addColorStop() {} })
      if (prop === 'canvas') return { width: 844, height: 390 }
      return () => pen
    },
    set() { return true },
  }
  const pen = new Proxy({}, handler)
  return pen as unknown as CanvasRenderingContext2D
}

function play(locale: Locale): string[] {
  setLocale(locale)
  const seen: string[] = []
  const push = (text: string | undefined | null) => { if (text) seen.push(text) }
  const rarity = t('rarity.langka')
  for (const key of dictionaryKeys()) push(t(key as MsgKey, { n: 3, power: 24, need: 36, name: bossDisplay('boss-induk', 'Kelabang Induk'), depth: 1, hp: 44, dmg: 12, lv: 2, pct: 8, cap: 4, scrap: 1, ore: 1, cost: 4, coins: 8, from: 12, to: 16, boss: bossDisplay('boss-induk', 'Kelabang Induk'), rarity, max: 125, reach: 40 }))
  push(titlePrompt(false))
  push(titlePrompt(true))
  push(spearStatLine(rollSpear(3)))
  const home = freshSave()
  home.stash.push({ kind: 'scrap', n: 3 }, { kind: 'ore', n: 2 })
  const shop = workshopView(home)
  push(shop.state)
  for (const offer of shop.offers) { push(offer.label); push(offer.reason) }
  for (const card of shop.upgrades) { push(card.title); push(card.now); push(card.next); push(card.reason) }
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  for (const match of html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)) push(t(match[1] as MsgKey))

  const save = freshSave()
  deploy(save, [{ kind: 'sword', n: 1 }, { kind: 'bandage', n: 1 }])
  const run = save.run!
  for (let depth = 1; depth <= 7; depth += 1) {
    warpFloor(run, depth)
    const plan = depthPlan(depth)
    push(bossTitle(depth))
    push(reachNote(depth))
    push(bossDisplay(plan.boss.id, plan.boss.name))
    push(bladeDisplay(plan.sword.id, plan.sword.name))
    push(foeName(plan.boss.breed, plan.boss.name))
    for (const foe of plan.foes) push(foeName(foe.breed as Breed, foe.name))
    run.zone = 'sarang'
    run.x = 0
    run.y = 80
    run.bossTold = false
    run.banner = undefined
    run.floats = []
    const boss = run.foes.find((foe) => foe.kind === 'boss')!
    boss.hp = boss.maxHp ?? boss.hp
    boss.fought = 0
    step(run, still, 0.05)
    push(run.banner?.text)
    boss.hp = Math.floor((boss.maxHp ?? boss.hp) * 0.4)
    boss.phase = 0
    step(run, still, 0.05)
    push(run.banner?.text)
    boss.fought = 89.96
    step(run, still, 0.05)
    push(run.banner?.text)
    run.zone = 'pangkalan'
    const log: string[] = []
    drawExtract(mockPen(log), run, 844, 390)
    seen.push(...log)
  }
  const gallery: string[] = []
  drawGallery(mockPen(gallery), 844, 390)
  seen.push(...gallery)
  return seen
}

function leaks(locale: Locale, lines: string[], banned: string[], known: Set<string>): string[] {
  const bad: string[] = []
  const ban = new Set(banned)
  for (const line of lines) {
    for (const word of words(line)) {
      if (word.length <= 1) continue
      if (ban.has(word) || !known.has(word)) bad.push(`${locale}:${word} in “${line.slice(0, 80)}”`)
    }
  }
  return bad
}

describe('language playthrough', () => {
  it('shows only English copy across all seven floors', () => {
    const known = corpus('en')
    const lines = play('en')
    const bad = leaks('en', lines, ID_WORDS, known)
    expect(bad).toEqual([])
    expect(lines.join('\n')).toContain('Brood Centipede')
    expect(lines.join('\n')).toContain('Burrow Fang')
    expect(lines.join('\n')).toContain('Enraged')
    expect(lines.join('\n')).not.toContain('Kelabang')
    expect(lines.join('\n')).not.toContain('kena')
  })

  it('shows only Indonesian copy across all seven floors', () => {
    const known = corpus('id')
    const lines = play('id')
    const bad = leaks('id', lines, EN_WORDS, known)
    expect(bad).toEqual([])
    expect(lines.join('\n')).toContain('Kelabang Induk')
    expect(lines.join('\n')).toContain('Taring Liang')
    expect(lines.join('\n')).not.toContain('Brood Centipede')
  })
})
