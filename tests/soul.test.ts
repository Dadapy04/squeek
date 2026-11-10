import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('id')
import { EXTRACT_SAVE_KEY, loadExtract, writeExtract } from '../src/extract/save.ts'
import {
  EXTRACT_TIME,
  SOUL_BOSS_FRACTION,
  SOUL_DAMAGE,
  soulLow,
  SOUL_STAM,
  SOUL_STUN,
  bankRun,
  castSoul,
  claimSoul,
  count,
  deploy,
  freshSave,
  killRun,
  soulNear,
  step,
  type Input,
  type Run,
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

function started(): Run {
  const save = freshSave()
  expect(deploy(save, [{ kind: 'sword', n: 1 }], false)).toBeNull()
  return save.run!
}

function appear(run: Run): void {
  run.age = (run.soul?.at ?? 45) - 0.02
  step(run, still, 0.05)
}

function untilBurst(run: Run): void {
  for (let i = 0; i < 30 && !run.soul?.burst; i += 1) step(run, still, 0.05)
}

describe('Pelebur Jiwa', () => {
  it('places one shrine beside the spawn and does not reroll on reload', () => {
    const run = started()
    expect(run.soul?.phase).toBe('live')
    expect(run.soul?.zone).toBe('pangkalan')
    const dist = Math.hypot(run.soul!.x - run.x, run.soul!.y - run.y)
    expect(dist).toBeGreaterThanOrEqual(40)
    expect(dist).toBeLessThanOrEqual(60)
    expect(run.banner?.text).toContain('dekatmu')
    const again = started()
    expect(again.soul).toMatchObject({ x: run.soul!.x, y: run.soul!.y, salt: run.soul!.salt })
    const spot = { x: run.soul!.x, y: run.soul!.y, zone: run.soul!.zone }
    step(run, still, 0.05)
    expect(run.soul).toMatchObject({ phase: 'live', ...spot })

    const save = freshSave()
    save.run = run
    const storage = memory()
    writeExtract(storage, save)
    const loaded = loadExtract(storage).run!
    expect(loaded.soul).toMatchObject({ phase: 'live', ...spot })
    step(loaded, still, 0.05)
    expect(loaded.soul).toMatchObject({ phase: 'live', ...spot })
  })

  it('gives an old run a shrine beside the spawn without resetting it', () => {
    const storage = memory()
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }], false)
    const raw = JSON.parse(JSON.stringify(save)) as { run: Run & { soul?: unknown }; stash: unknown }
    delete raw.run.soul
    raw.run.age = 10
    raw.run.x = 0
    raw.run.y = 70
    raw.run.zone = 'pangkalan'
    storage.setItem(EXTRACT_SAVE_KEY, JSON.stringify(raw))
    const loaded = loadExtract(storage)
    expect(loaded.run?.age).toBe(10)
    expect(loaded.run?.sword).toBe(true)
    expect(loaded.run?.soul?.phase).toBe('live')
    expect(loaded.run?.soul?.zone).toBe('pangkalan')
    const dist = Math.hypot((loaded.run?.soul?.x ?? 0) - 0, (loaded.run?.soul?.y ?? 0) - 70)
    expect(dist).toBeGreaterThanOrEqual(40)
    expect(dist).toBeLessThanOrEqual(60)
    expect(count(loaded.stash, 'sword')).toBe(0)
  })

  it('is claimed with Ambil and only then can be cast once', () => {
    const run = started()
    appear(run)
    expect(soulNear(run)).toBe(false)
    run.x = run.soul!.x
    run.y = run.soul!.y
    expect(soulNear(run)).toBe(true)
    expect(claimSoul(run)).toBe(true)
    expect(run.soul?.phase).toBe('held')
    expect(run.banner?.text).toContain('Tidak masuk simpanan')
    expect(claimSoul(run)).toBe(false)
    expect(count(run.bag, 'scrap')).toBe(0)

    run.stam = 40
    expect(castSoul(run)).toEqual({ ok: true })
    expect(run.stam).toBe(SOUL_STAM)
    expect(run.soul?.phase).toBe('spent')
    expect(run.soul?.guard).toBeGreaterThan(0)
    expect(castSoul(run).ok).toBe(false)
    for (let i = 0; i < 30 && (run.soul?.cast ?? 0) > 0; i += 1) step(run, still, 0.05)
    expect(run.soul?.cast).toBe(0)
    expect(run.soul?.burst).toBe(true)
    step(run, still, 0.05)
    expect(run.stam).toBeGreaterThan(SOUL_STAM)
  })

  it('refuses the cast at 10 stamina and does not spend it', () => {
    const run = started()
    appear(run)
    run.x = run.soul!.x
    run.y = run.soul!.y
    claimSoul(run)
    run.stam = SOUL_STAM
    expect(castSoul(run)).toEqual({ ok: false, reason: soulLow() })
    expect(run.stam).toBe(SOUL_STAM)
    expect(run.soul?.phase).toBe('held')
    run.stam = 4
    expect(castSoul(run).ok).toBe(false)
    expect(run.stam).toBe(4)
  })

  it('deals 70 to a normal foe and a quarter of the boss max, then stuns survivors', () => {
    const run = started()
    run.zone = 'tambang'
    run.x = 48
    run.y = 10
    const crab = run.foes.find((foe) => foe.id === 'crab-a')!
    crab.hp = 100
    run.soul!.phase = 'held'
    run.stam = 50
    expect(castSoul(run).ok).toBe(true)
    untilBurst(run)
    expect(crab.hp).toBe(100 - SOUL_DAMAGE)
    expect(crab.stun ?? 0).toBeGreaterThan(1)
    expect(crab.stun ?? 0).toBeLessThanOrEqual(SOUL_STUN)

    const far = run.foes.find((foe) => foe.id === 'crab-c')!
    const farHp = far.hp
    expect(far.zone).not.toBe(run.zone)
    expect(far.hp).toBe(farHp)
    for (let i = 0; i < 20 && (run.soul?.cast ?? 0) > 0; i += 1) step(run, still, 0.05)

    run.zone = 'sarang'
    run.x = 0
    run.y = -40
    const boss = run.foes.find((foe) => foe.id === 'boss-induk')!
    const before = boss.hp
    const chunk = Math.round((boss.maxHp ?? boss.hp) * SOUL_BOSS_FRACTION)
    run.soul!.phase = 'held'
    run.soul!.burst = false
    run.stam = 80
    expect(castSoul(run).ok).toBe(true)
    untilBurst(run)
    expect(before - boss.hp).toBe(chunk)
    expect(boss.hp).toBeGreaterThan(0)
    expect(boss.stun ?? 0).toBeGreaterThan(1)
    expect(boss.stun ?? 0).toBeLessThanOrEqual(SOUL_STUN)
  })

  it('is lost on extract and on death, and never enters the stash', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }], false)
    const run = save.run!
    appear(run)
    run.x = run.soul!.x
    run.y = run.soul!.y
    claimSoul(run)
    run.channel = EXTRACT_TIME
    run.zone = 'pangkalan'
    run.x = 0
    run.y = -80
    expect(bankRun(save)).toBe(true)
    expect(save.run).toBeNull()
    expect(save.stash.some((stack) => stack.kind === 'sword')).toBe(true)
    expect(deploy(save, [{ kind: 'sword', n: 1 }], false)).toBeNull()
    expect(save.run?.soul?.phase).toBe('live')
    expect(save.stash.some((stack) => String(stack.kind).includes('soul'))).toBe(false)

    save.run!.x = save.run!.soul!.x
    save.run!.y = save.run!.soul!.y
    claimSoul(save.run!)
    expect(save.run?.soul?.phase).toBe('held')
    killRun(save)
    expect(save.run).toBeNull()
    expect(deploy(save, [{ kind: 'sword', n: 1 }], false)).toBeNull()
    expect(save.run?.soul?.phase).toBe('live')
  })
})
