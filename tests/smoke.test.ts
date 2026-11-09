import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('id')
import { bossTitle, centipedeRear, dashBack, dashPuff } from '../src/extract/view.ts'
import { BOSS_INSET, CENTIPEDE_GAP, CENTIPEDE_LINKS, SWING_REACH, ZONE_H, ZONE_W, deploy, freshSave, resetCentipede, step, syncCentipede, type Input } from '../src/extract/sim.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null }

describe('dash smoke and the scorpion boss', () => {
  it('keeps the smoke on a straight line behind the dash', () => {
    const facings = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (-3 * Math.PI) / 4, -Math.PI / 2, -Math.PI / 4]
    for (const facing of facings) {
      const back = dashBack(10, 20, facing)
      const behind = (back.x - 10) * Math.cos(facing) + (back.y - 20) * Math.sin(facing)
      expect(behind).toBeLessThan(-8)
      for (const step of [0, 1]) {
        const puff = dashPuff(10, 20, facing, step)
        const dx = puff.x - 10
        const dy = puff.y - 20
        const lateral = dx * -Math.sin(facing) + dy * Math.cos(facing)
        const along = dx * Math.cos(facing) + dy * Math.sin(facing)
        const drift = puff.vx * -Math.sin(facing) + puff.vy * Math.cos(facing)
        expect(Math.abs(lateral)).toBeLessThan(0.001)
        expect(along).toBeLessThan(0)
        expect(Math.abs(drift)).toBeLessThan(0.001)
      }
    }
  })

  it('trails the centipede behind its head and rears the head for the slam', () => {
    resetCentipede('boss-induk')
    const head = { id: 'boss-induk', x: 0, y: 0, aim: 0 }
    const seeded = syncCentipede(head)
    expect(seeded).toHaveLength(CENTIPEDE_LINKS)
    head.x = 48
    const followed = syncCentipede(head)
    expect(followed[0]!.x).toBeCloseTo(48)
    expect(Math.hypot(followed[1]!.x - 48, followed[1]!.y)).toBeGreaterThan(8)
    expect(Math.hypot(followed[CENTIPEDE_LINKS - 1]!.x - 48, followed[CENTIPEDE_LINKS - 1]!.y)).toBeGreaterThan(Math.hypot(followed[2]!.x - 48, followed[2]!.y))
    expect(centipedeRear(0.45, 0)).toBeGreaterThan(centipedeRear(0.05, 0))
    expect(centipedeRear(0.4, 1)).toBe(0)
    expect(bossTitle(1)).toBe('Kelabang Induk · kedalaman 1')
  })

  it('keeps every centipede joint within one spacing through tiny steps and a hitch', () => {
    resetCentipede('kelabang')
    const foe = { id: 'kelabang', x: -40, y: 20, aim: 0 }
    const gaps = (points: { x: number; y: number }[]) => {
      const found: number[] = []
      for (let i = 1; i < points.length; i += 1) found.push(Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y))
      return found
    }
    const expectChain = (points: { x: number; y: number }[]) => {
      expect(points[0]!.x).toBeCloseTo(foe.x, 4)
      expect(points[0]!.y).toBeCloseTo(foe.y, 4)
      for (const gap of gaps(points)) expect(gap).toBeLessThanOrEqual(CENTIPEDE_GAP + 0.75)
    }
    expectChain(syncCentipede(foe))
    for (let i = 0; i < 80; i += 1) {
      foe.x += 0.25
      foe.aim = 0
      expectChain(syncCentipede(foe))
    }
    const hitch = [0.016, 0.2, 0.016, 0.5, 0.05, 0.016]
    let clock = 0
    for (const dt of hitch) {
      clock += dt
      const nx = Math.sin(clock * 4) * 50
      const ny = Math.cos(clock * 3) * 40
      foe.aim = Math.atan2(ny - foe.y, nx - foe.x)
      foe.x = nx
      foe.y = ny
      expectChain(syncCentipede(foe))
    }
  })

  it('lets a sword reach the centipede body and keeps the head inside the nest', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    const boss = run.foes.find((foe) => foe.kind === 'boss')!
    run.zone = 'sarang'
    boss.x = 0
    boss.y = 0
    boss.hp = 100
    boss.cd = 9
    run.x = 62
    run.y = 0
    run.facing = Math.PI
    run.attackCd = 0
    run.stam = 100
    step(run, { ...still, attack: true }, 0.05)
    for (let i = 0; i < 8; i += 1) step(run, still, 0.05)
    expect(boss.hp).toBeLessThan(100)
    boss.x = 400
    boss.y = 400
    boss.wind = 0
    boss.cd = 9
    step(run, still, 0.05)
    expect(Math.abs(boss.x)).toBeLessThanOrEqual(ZONE_W / 2 - BOSS_INSET)
    expect(Math.abs(boss.y)).toBeLessThanOrEqual(ZONE_H / 2 - BOSS_INSET)
    expect(SWING_REACH).toBeGreaterThan(40)
  })
})
