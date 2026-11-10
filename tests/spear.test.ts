import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('id')
import { loadExtract, writeExtract } from '../src/extract/save.ts'
import {
  SPEAR_ARC,
  SPEAR_REACH,
  SWORD_REACH,
  SPEAR_ACTIVE,
  SPEAR_TOTAL,
  SPEAR_WIND,
  critLands,
  rollSpear,
  spearBossBonus,
  spearBodyShift,
  spearExtension,
  spearPower,
  spearReach,
  spearStatLine,
} from '../src/extract/spear.ts'
import {
  bankRun,
  armFoundSpear,
  claimLoot,
  deploy,
  equipSpear,
  stowSpear,
  freshSave,
  killRun,
  step,
  unequipSpear,
  type Input,
} from '../src/extract/sim.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null }

function memory(): Storage {
  const data = new Map<string, string>()
  return {
    get length() { return data.size },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => { data.delete(key) },
    setItem: (key, value) => { data.set(key, value) },
  }
}

function poke(run: NonNullable<ReturnType<typeof freshSave>['run']>, facing: number) {
  run.facing = facing
  run.attackCd = 0
  run.stam = 100
  run.swing = 0
  step(run, { ...still, attack: true }, 0.05)
  for (let i = 0; i < 10; i += 1) step(run, still, 0.05)
}

describe('spear reward', () => {
  it('rolls a stable spear and spreads rarity and perks', () => {
    expect(rollSpear(4)).toEqual(rollSpear(4))
    const rolled = Array.from({ length: 48 }, (_, index) => rollSpear(index + 1))
    expect(new Set(rolled.map((spear) => spear.rarity)).size).toBeGreaterThan(1)
    expect(new Set(rolled.map((spear) => spear.perks.join(','))).size).toBeGreaterThan(1)
    for (const spear of rolled) {
      expect(spear.perks.length).toBe(spear.rarity === 'langka' ? 1 : spear.rarity === 'pusaka' ? 2 : 3)
      expect(spearReach(spear)).toBe(SPEAR_REACH + (spear.perks.includes('reach') ? 14 : 0))
      expect(spearReach(spear)).toBeGreaterThan(SWORD_REACH)
    }
    const crit = rolled.find((spear) => spear.perks.includes('crit'))!
    expect(critLands(crit, 0)).toBe(true)
    expect(critLands(crit, 50)).toBe(false)
    expect(critLands({ ...crit, perks: ['reach'] }, 0)).toBe(false)
  })

  it('equips a found spear for this delve without changing its thrust, then banks it', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    const spear = rollSpear(11)
    const power = spearPower(spear)
    run.drops.push({ id: 'arm-prize', kind: 'tombak', x: run.x, y: run.y, spear })
    expect(claimLoot(run, 'arm-prize', 'local')).toBe('ok')
    expect(run.spear).toBeNull()
    expect(armFoundSpear(run, spear.id)).toBe(true)
    expect(run.spear?.id).toBe(spear.id)
    expect(run.found).toEqual([])
    expect(spearPower(run.spear!)).toBe(power)
    expect(run.sword).toBe(true)
    expect(stowSpear(run)).toBe(true)
    expect(run.spear).toBeNull()
    expect(run.found.map((item) => item.id)).toEqual([spear.id])
    expect(armFoundSpear(run)).toBe(true)
    run.channel = 3
    expect(bankRun(save)).toBe(true)
    expect(save.spear?.id).toBe(spear.id)
    expect(save.spears).toEqual([])
    const doomed = freshSave()
    deploy(doomed, [{ kind: 'sword', n: 1 }])
    const lost = rollSpear(12)
    doomed.run!.found.push(lost)
    armFoundSpear(doomed.run!, lost.id)
    killRun(doomed)
    expect(doomed.spear).toBeNull()
    expect(doomed.spears).toEqual([])
  })

  it('keeps a found spear in the rack until it is equipped at base', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    const spear = rollSpear(9)
    run.drops.push({ id: 'prize', kind: 'tombak', x: run.x, y: run.y, spear })
    expect(claimLoot(run, 'prize', 'local')).toBe('ok')
    expect(run.found.map((item) => item.id)).toEqual([spear.id])
    expect(run.spear).toBeNull()
    expect(spearPower(spear)).toBeGreaterThan(24)
    expect(spearPower(spear)).toBeLessThanOrEqual(46)
    expect(spearPower(spear) + spearBossBonus(spear)).toBeGreaterThan(spearPower(spear))
    run.channel = 3
    expect(bankRun(save)).toBe(true)
    expect(save.spears.map((item) => item.id)).toEqual([spear.id])
    expect(save.spear).toBeNull()
    expect(equipSpear(save, spear.id)).toBe(true)
    expect(save.spear?.id).toBe(spear.id)
    expect(deploy(save, [{ kind: 'sword', n: 1 }])).toMatch(/Tombak/)
    expect(deploy(save, [])).toBeNull()
    expect(save.run!.spear?.id).toBe(spear.id)
    expect(save.run!.sword).toBe(false)
    expect(save.spear).toBeNull()
    save.run!.channel = 3
    bankRun(save)
    expect(save.spear?.id).toBe(spear.id)
    const store = memory()
    writeExtract(store, save)
    const loaded = loadExtract(store)
    expect(loaded.spear?.id).toBe(spear.id)
    expect(loaded.spear?.perks).toEqual(spear.perks)
    unequipSpear(loaded)
    expect(loaded.spear).toBeNull()
    expect(loaded.spears.some((item) => item.id === spear.id)).toBe(true)
  })

  it('loses an unequipped carry and an equipped spear on death, and pokes farther than the sword on a narrow line', () => {
    const save = freshSave()
    const spear = rollSpear(3)
    save.spears.push(spear)
    equipSpear(save, spear.id)
    deploy(save, [])
    const run = save.run!
    run.found.push(rollSpear(8))
    killRun(save)
    expect(save.spear).toBeNull()
    expect(save.spears).toEqual([])
    expect(save.stash.some((stack) => stack.kind === 'sword')).toBe(true)

    const sword = freshSave()
    deploy(sword, [{ kind: 'sword', n: 1 }])
    const foe = sword.run!.foes.find((item) => item.id === 'crab-a')!
    foe.hp = 40
    sword.run!.zone = foe.zone
    sword.run!.x = foe.x - 60
    sword.run!.y = foe.y
    poke(sword.run!, 0)
    expect(foe.hp).toBe(40)

    const armed = freshSave()
    const pokeSpear = { id: 'line', rarity: 'langka' as const, perks: ['pierce' as const] }
    armed.spear = pokeSpear
    deploy(armed, [])
    const near = armed.run!.foes.find((item) => item.id === 'crab-a')!
    const far = armed.run!.foes.find((item) => item.id === 'crab-b')!
    near.hp = 80
    far.hp = 80
    near.zone = 'tambang'
    far.zone = 'tambang'
    armed.run!.zone = 'tambang'
    armed.run!.x = 0
    armed.run!.y = 0
    near.x = 40
    near.y = 0
    far.x = 62
    far.y = 0
    const side = armed.run!.foes.find((item) => item.id === 'crab-d')!
    side.hp = 80
    side.zone = 'tambang'
    side.x = 0
    side.y = 36
    poke(armed.run!, 0)
    expect(near.hp).toBeLessThan(80)
    expect(far.hp).toBeLessThan(80)
    expect(side.hp).toBe(80)
    expect(Math.hypot(far.x - armed.run!.x, far.y)).toBeGreaterThan(SWORD_REACH)
    expect(SPEAR_ARC).toBeLessThan(Math.PI / 2)

    const single = freshSave()
    single.spear = { id: 'one', rarity: 'pusaka', perks: ['reach'] }
    deploy(single, [])
    const first = single.run!.foes.find((item) => item.id === 'crab-a')!
    const second = single.run!.foes.find((item) => item.id === 'crab-b')!
    first.hp = 90
    second.hp = 90
    first.zone = 'tambang'
    second.zone = 'tambang'
    single.run!.zone = 'tambang'
    single.run!.x = 0
    single.run!.y = 0
    first.x = 50
    first.y = 0
    second.x = 78
    second.y = 0
    poke(single.run!, 0)
    expect(first.hp).toBeLessThan(90)
    expect(second.hp).toBeLessThan(90)
    expect(spearReach(single.run!.spear!)).toBeGreaterThan(second.x)
    const past = single.run!.foes.find((item) => item.id === 'spit-a')!
    past.hp = 40
    past.zone = 'tambang'
    past.x = single.run!.x + spearReach(single.run!.spear!) + 30
    past.y = 0
    single.run!.attackCd = 0
    single.run!.swing = 0
    single.run!.stam = 100
    poke(single.run!, 0)
    expect(past.hp).toBe(40)
  })

  it('pulls the shaft back, then lunges to full length in the facing direction', () => {
    const rest = spearExtension(0, false)
    const wind = spearExtension(SPEAR_WIND * 0.8, true)
    const mid = spearExtension(SPEAR_WIND + SPEAR_ACTIVE * 0.55, true)
    const full = spearExtension(SPEAR_WIND + SPEAR_ACTIVE * 0.95, true)
    const recovered = spearExtension(SPEAR_TOTAL, true)
    expect(wind).toBeLessThan(rest)
    expect(spearBodyShift(SPEAR_WIND * 0.8, true)).toBeLessThan(0)
    expect(mid).toBeGreaterThan(0.55)
    expect(full).toBeGreaterThan(0.9)
    expect(spearBodyShift(SPEAR_WIND + SPEAR_ACTIVE * 0.7, true)).toBeGreaterThan(2)
    expect(recovered).toBeLessThan(full)
    expect(spearStatLine({ id: 't', rarity: 'langka', perks: ['reach'] })).toContain('Tusukan 32')
    expect(spearStatLine({ id: 't', rarity: 'langka', perks: ['reach'] })).toContain(`jangkauan ${78 + 14}`)
  })

  it('kills the depth-1 kelabang faster than the sword without deleting a brute in one poke', () => {
    const bruteSave = freshSave()
    bruteSave.spear = { id: 'brute-line', rarity: 'langka', perks: ['reach'] }
    deploy(bruteSave, [])
    const brute = bruteSave.run!.foes.find((foe) => foe.id === 'brute-a')!
    brute.zone = 'tambang'
    bruteSave.run!.zone = 'tambang'
    bruteSave.run!.x = brute.x - 40
    bruteSave.run!.y = brute.y
    const before = brute.hp
    poke(bruteSave.run!, 0)
    expect(brute.hp).toBeLessThan(before)
    expect(brute.hp).toBeGreaterThan(0)

    const measure = (weapon: 'sword' | 'spear') => {
      const save = freshSave()
      if (weapon === 'spear') save.spear = { id: 'kelabang', rarity: 'langka', perks: ['reach'] }
      deploy(save, weapon === 'sword' ? [{ kind: 'sword', n: 1 }] : [])
      const run = save.run!
      const boss = run.foes.find((foe) => foe.id === 'boss-induk')!
      run.zone = 'sarang'
      run.x = 0
      run.y = 70
      run.hp = 500
      const start = boss.hp
      let hits = 0
      let time = 0
      for (let i = 0; i < 800 && boss.hp > 0 && !run.slain.includes(boss.id); i += 1) {
        const dx = boss.x - run.x
        const dy = boss.y - run.y
        const dist = Math.hypot(dx, dy) || 1
        run.facing = Math.atan2(dy, dx)
        run.stam = 100
        run.hp = Math.max(run.hp, 80)
        const prev = boss.hp
        const close = dist < (weapon === 'spear' ? 70 : 42)
        step(run, { ...still, attack: close, moveX: close ? 0 : dx / dist, moveY: close ? 0 : dy / dist }, 0.05)
        if (boss.hp < prev) hits += 1
        time += 0.05
      }
      return { hits, time: Math.round(time * 100) / 100, start, left: boss.hp }
    }
    const sword = measure('sword')
    const spear = measure('spear')
    console.log(`kelabang ${sword.start} nyawa · pedang ${sword.hits} tusukan / ${sword.time}s · tombak ${spear.hits} tusukan / ${spear.time}s`)
    expect(sword.left).toBeLessThanOrEqual(0)
    expect(spear.left).toBeLessThanOrEqual(0)
    expect(spear.hits).toBeLessThan(sword.hits)
    expect(spear.time).toBeLessThan(sword.time)
    expect(spear.time).toBeLessThan(8)
    expect(spear.hits).toBeGreaterThan(2)
  })
})
