import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('id')
import { bossTitle } from '../src/extract/view.ts'
import { DEPTHS, DEPTH_CAP, bossChip, bossHitRatio, bossPhaseOf, bossPattern, frontGuarded, lineup, makeBlade, recommendDamage } from '../src/extract/depths.ts'
import { swordDamage } from '../src/extract/economy.ts'
import {
  EXTRACT_TIME,
  STAIRS,
  stairHint,
  bankRun,
  claimLoot,
  deploy,
  descendFloor,
  equipBlade,
  freshSave,
  insureHeld,
  killRun,
  spawnRoster,
  stairsOpen,
  step,
  strikeDamage,
  warpFloor,
  type Input,
} from '../src/extract/sim.ts'
import { mintUnit } from '../src/extract/coins.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null }

describe('seven depths', () => {
  it('makes only the kelabang 23% tougher', () => {
    const boss = DEPTHS[0]!.boss
    expect(boss.breed).toBe('kelabang')
    expect(boss.hp).toBe(Math.round(176 * 1.23))
    expect(boss.damage).toBe(Math.round(22 * 1.23))
    expect(boss.patterns.map((pattern) => pattern.damage)).toEqual([
      Math.round(22 * 1.23),
      Math.round(16 * 1.23),
      Math.round(22 * 1.23),
    ])
    const spawned = spawnRoster(1, 1).find((foe) => foe.id === 'boss-induk')!
    expect(spawned.hp).toBe(216)
    expect(spawned.maxHp).toBe(216)
    expect(spawned.damage).toBe(27)
    expect(bossPattern('kelabang', 0, 0).damage).toBe(27)
    expect(bossPattern('kelabang', 1, 0).damage).toBe(20)
    expect(bossPattern('liang', 0, 0).damage).toBe(48)
    expect(DEPTHS[1]!.boss.hp).toBe(432)
    expect(DEPTHS[1]!.boss.damage).toBe(48)
    expect(DEPTHS[6]!.boss.hp).toBe(2040)
    expect(DEPTHS[0]!.foes[0]!.hp).toBe(30)
    expect(DEPTHS[0]!.foes[0]!.damage).toBe(12)
    expect(spawnRoster(1, 1).find((foe) => foe.id === 'moth-a')!.damage).toBe(12)
  })

  it('slows the room once for the boss killing blow', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    const boss = run.foes.find((foe) => foe.kind === 'boss')!
    run.zone = boss.zone
    run.x = boss.x - 20
    run.y = boss.y
    run.facing = 0
    boss.hp = 20
    const attack: Input = { ...still, attack: true }
    for (let i = 0; i < 12 && !run.slain.includes(boss.id); i += 1) step(run, i === 0 ? attack : still, 0.05)
    expect(run.slain.includes(boss.id)).toBe(true)
    expect(run.bossFinaleUsed).toBe(true)
    expect(run.bossFinale ?? 0).toBeGreaterThan(0.25)
    expect(run.bossFinale ?? 0).toBeLessThanOrEqual(0.34)
    const marked = run.bossFinale ?? 0
    const x = run.x
    step(run, { ...still, moveX: 1 }, 0.05)
    expect(run.bossFinale ?? 0).toBeCloseTo(marked - 0.05, 5)
    expect(Math.abs(run.x - x)).toBeLessThan(2)
    for (let i = 0; i < 10 && (run.bossFinale ?? 0) > 0; i += 1) step(run, still, 0.05)
    expect(run.bossFinale).toBe(0)
    expect(run.bossVanish ?? 0).toBeGreaterThan(0)
    boss.hp = 30
    run.slain = run.slain.filter((id) => id !== boss.id)
    for (let i = 0; i < 12 && boss.hp > 0; i += 1) step(run, i === 0 ? attack : still, 0.05)
    expect(run.bossFinale).toBe(0)
    expect(run.bossFinaleUsed).toBe(true)
  })

  it('ends the boss death with the boss gone and the chest and stairs still there', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    const boss = run.foes.find((foe) => foe.kind === 'boss')!
    run.zone = boss.zone
    run.x = boss.x - 20
    run.y = boss.y
    run.facing = 0
    boss.hp = 20
    const attack: Input = { ...still, attack: true }
    for (let i = 0; i < 12 && !run.slain.includes(boss.id); i += 1) step(run, i === 0 ? attack : still, 0.05)
    expect(run.slain.includes(boss.id)).toBe(true)
    expect(boss.hp).toBe(0)
    expect(stairsOpen(run)).toBe(true)
    expect(run.rewards.some((crate) => crate.id.startsWith('boss-chest'))).toBe(true)
    expect(run.bossVanish ?? 0).toBeGreaterThan(0.8)
    for (let i = 0; i < 40; i += 1) step(run, still, 0.05)
    expect(run.bossVanish).toBe(0)
    expect(run.slain.includes(boss.id)).toBe(true)
    expect(stairsOpen(run)).toBe(true)
    expect(run.rewards.some((crate) => crate.id.startsWith('boss-chest'))).toBe(true)
    const x = run.x
    step(run, { ...still, moveX: 1 }, 0.05)
    expect(run.x).not.toBe(x)
  })

  it('gives every depth its own regulars and one boss, and keeps the kelabang at depth 1', () => {
    expect(DEPTHS).toHaveLength(DEPTH_CAP)
    expect(lineup().map((foe) => foe.kind)).toEqual(['moth', 'burrow', 'spore', 'beetle', 'jelly', 'swarm', 'mole', 'web', 'ember', 'leech', 'bomber', 'wisp', 'crusher'])
    const first = spawnRoster(1, 1)
    expect(first.find((foe) => foe.id === 'boss-induk')!.hp).toBe(216)
    expect(first.find((foe) => foe.id === 'crab-a')!.hp).toBe(44)
    expect(first.some((foe) => foe.kind === 'moth')).toBe(true)
    const seenBoss = new Set<string>()
    const seenPairs = new Set<string>()
    for (let depth = 1; depth <= DEPTH_CAP; depth += 1) {
      const roster = spawnRoster(depth, 3)
      const bosses = roster.filter((foe) => foe.kind === 'boss')
      expect(bosses).toHaveLength(1)
      expect(seenBoss.has(bosses[0]!.id)).toBe(false)
      seenBoss.add(bosses[0]!.id)
      expect(bosses[0]!.zone).toBe('sarang')
      expect(bosses[0]!.maxHp).toBe(bosses[0]!.hp)
      const kinds = [...new Set(roster.filter((foe) => foe.kind !== 'boss' && foe.kind !== 'crab' && foe.kind !== 'brute' && foe.kind !== 'spitter' && foe.kind !== 'lurker').map((foe) => foe.kind))].sort()
      expect(kinds.length).toBeGreaterThanOrEqual(depth === 1 ? 1 : 2)
      if (depth > 1) {
        expect(kinds).toHaveLength(2)
        const key = kinds.join('+')
        expect(seenPairs.has(key)).toBe(false)
        seenPairs.add(key)
      }
      expect(bossTitle(depth)).toBe(`${DEPTHS[depth - 1]!.boss.name} · kedalaman ${depth}`)
    }
  })

  it('flips a boss into its third pattern at half health', () => {
    const boss = spawnRoster(4, 1).find((foe) => foe.kind === 'boss')!
    expect(bossPhaseOf(boss.hp, boss.maxHp ?? boss.hp)).toBe(0)
    expect(bossPattern('liang', 0, 0).kind).toBe('burrow')
    expect(bossPattern('liang', 2, 1).kind).toBe('charge')
    boss.hp = (boss.maxHp ?? boss.hp) * 0.5
    expect(bossPhaseOf(boss.hp, boss.maxHp ?? 1)).toBe(1)
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    warpFloor(run, 4)
    const live = run.foes.find((foe) => foe.kind === 'boss')!
    live.hp = (live.maxHp ?? live.hp) * 0.4
    run.zone = 'sarang'
    run.x = live.x
    run.y = live.y + 36
    live.cd = 0
    for (let i = 0; i < 6; i += 1) step(run, still, 0.05)
    expect(live.phase).toBe(1)
    expect(live.wind).toBeGreaterThan(0)
    expect(run.banner?.text).toBe('Pedangmu terlalu lemah (daya 24 / butuh 74)')
  })

  it('makes a depth fought two swords back take many more hits', () => {
    for (const depth of [3, 4, 5, 6, 7]) {
      const ratio = bossHitRatio(depth)
      expect(ratio.behind).toBeGreaterThan(ratio.fair * 1.65)
      expect(ratio.fair).toBeGreaterThan(8)
      expect(ratio.fair).toBeLessThan(16)
    }
    expect(recommendDamage(1)).toBe(24)
    expect(recommendDamage(7)).toBe(170)
    expect(swordDamage(6)).toBe(34)
    expect(swordDamage(6)).toBeLessThan(recommendDamage(3))
  })

  it('drops a fixed boss sword that ignores Bengkel mastery and is lost on death unless insured', () => {
    const save = freshSave()
    save.swordLevel = 6
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    const boss = run.foes.find((foe) => foe.id === 'boss-induk')!
    boss.hp = 10
    run.zone = 'sarang'
    run.x = boss.x + 20
    run.y = boss.y
    run.facing = Math.PI
    step(run, { ...still, attack: true }, 0.05)
    for (let i = 0; i < 8; i += 1) step(run, still, 0.05)
    const chest = run.rewards.find((crate) => crate.blade)!
    expect(chest.loot).toContain('tombak')
    expect(chest.blade?.name).toBe('Taring Liang')
    expect(chest.blade?.damage).toBe(36)
    expect(chest.blade?.rarity).toBe('pusaka')
    expect(chest.blade?.coins).toBe(42)
    run.x = chest.x
    run.y = chest.y
    step(run, { ...still, interact: true }, 0.05)
    expect(strikeDamage(run)).toBe(34)
    const bladeDrop = run.drops.find((drop) => drop.blade)!
    run.age = (bladeDrop.born ?? 0) + 1
    run.x = bladeDrop.x
    run.y = bladeDrop.y
    expect(claimLoot(run, bladeDrop.id, 'local')).toBe('ok')
    expect(run.foundBlades[0]?.damage).toBe(36)
    expect(strikeDamage(run)).toBe(34)
    expect(insureHeld(run, 'sword', undefined, undefined, run.foundBlades[0]!.id)).toBeNull()
    killRun(save)
    expect(save.depth).toBe(1)
    expect(save.blades.map((blade) => blade.name)).toEqual(['Taring Liang'])
    expect(save.blade).toBeNull()
    equipBlade(save, save.blades[0]!.id)
    save.swordLevel = 6
    deploy(save, [])
    expect(save.run!.blade?.damage).toBe(36)
    expect(strikeDamage(save.run!)).toBe(36)
    const made = makeBlade(7, 3)
    expect(made.damage).toBe(210)
    expect(made.rarity).toBe('legenda')
    expect(frontGuarded('beetle', 0)).toBe(true)
    expect(frontGuarded('kumbang', 1)).toBe(false)
  })

  it('keeps an under-geared sword from finishing a boss in five minutes of perfect hits', () => {
    const weak = grind(2, 24, 300)
    expect(weak.dead).toBe(false)
    expect(weak.hp).toBeGreaterThan(432 * 0.25)
    const ready = swingsToKill(2, 36)
    expect(ready.dead).toBe(true)
    expect(ready.hits).toBeGreaterThanOrEqual(11)
    expect(ready.hits).toBeLessThanOrEqual(13)
    for (const depth of [3, 4, 5, 6, 7]) {
      const low = recommendDamage(depth - 2)
      const hopeless = grind(depth, low, 300)
      expect(hopeless.dead).toBe(false)
      expect(hopeless.hp).toBeGreaterThan((hopeless.max) * 0.2)
      const fair = swingsToKill(depth, recommendDamage(depth))
      expect(fair.dead).toBe(true)
      expect(fair.hits).toBeGreaterThanOrEqual(11)
      expect(fair.hits).toBeLessThanOrEqual(13)
    }
    expect(bossChip(24, 36, 432)).toBeLessThan(1)
    expect(bossChip(36, 36, 432)).toBe(36)
  })

  it('keeps the stairs shut until the boss dies, then carries the bag down a floor', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    run.hp = 40
    run.bag.push({ kind: 'scrap', n: 1, units: [mintUnit('scrap', 4, 'loot')] })
    run.zone = 'sarang'
    run.x = STAIRS.x
    run.y = STAIRS.y
    const boss = run.foes.find((foe) => foe.kind === 'boss')!
    boss.stun = 8
    expect(stairsOpen(run)).toBe(false)
    expect(descendFloor(run)).toBe(false)
    for (let i = 0; i < 12; i += 1) step(run, still, 0.05)
    expect(run.depth).toBe(1)
    expect(stairHint()).toMatch(/bos|boss/)
    run.slain.push(boss.id)
    boss.hp = 0
    expect(stairsOpen(run)).toBe(true)
    expect(descendFloor(run)).toBe(true)
    expect(run.depth).toBe(2)
    expect(run.hp).toBe(40 + Math.round(125 * 0.25))
    expect(run.bag.some((stack) => stack.kind === 'scrap')).toBe(true)
    expect(run.foes.find((foe) => foe.kind === 'boss')!.id).toBe('boss-liang')
    expect(run.zone).toBe('pangkalan')
    expect(run.floorCue).toBeGreaterThan(1)
  })

  it('banks loot when extracting on a later floor and records how deep that was', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    warpFloor(run, 3)
    run.bag.push({ kind: 'relic', n: 1, units: [mintUnit('relic', 9, 'loot')] })
    run.zone = 'pangkalan'
    run.channel = EXTRACT_TIME
    expect(bankRun(save)).toBe(true)
    expect(save.run).toBeNull()
    expect(save.depth).toBe(3)
    expect(save.stash.some((stack) => stack.kind === 'relic')).toBe(true)
  })
})

function arm(depth: number, power: number) {
  const save = freshSave()
  if (power > swordDamage(1)) {
    save.blades.push({ id: `uji-${power}`, name: 'Uji', damage: power, rarity: 'pusaka', coins: 40, origin: 'stash', depth })
    equipBlade(save, `uji-${power}`)
    deploy(save, [])
  } else deploy(save, [{ kind: 'sword', n: 1 }])
  const run = save.run!
  warpFloor(run, depth)
  const boss = run.foes.find((foe) => foe.kind === 'boss')!
  run.zone = 'sarang'
  run.sword = true
  return { run, boss }
}

function place(run: NonNullable<ReturnType<typeof freshSave>['run']>, boss: { x: number; y: number; stun?: number }): void {
  run.stam = 100
  run.hp = 125
  run.x = 0
  run.y = 0
  run.facing = 0
  boss.x = 16
  boss.y = 0
  boss.stun = 2
}

function grind(depth: number, power: number, seconds: number): { hp: number; dead: boolean; max: number } {
  const { run, boss } = arm(depth, power)
  const max = boss.maxHp ?? boss.hp
  const steps = Math.round(seconds / 0.05)
  for (let i = 0; i < steps; i += 1) {
    place(run, boss)
    step(run, { ...still, attack: true }, 0.05)
    if (boss.hp <= 0 || run.slain.includes(boss.id)) return { hp: 0, dead: true, max }
  }
  return { hp: boss.hp, dead: false, max }
}

function swingsToKill(depth: number, power: number): { hits: number; dead: boolean } {
  const { run, boss } = arm(depth, power)
  let hits = 0
  for (let i = 0; i < 800 && boss.hp > 0 && !run.slain.includes(boss.id); i += 1) {
    const before = boss.hp
    place(run, boss)
    step(run, { ...still, attack: true }, 0.05)
    if (boss.hp < before - 1) hits += 1
  }
  return { hits, dead: boss.hp <= 0 || run.slain.includes(boss.id) }
}
