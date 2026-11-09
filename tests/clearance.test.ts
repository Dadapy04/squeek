import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('id')
import { deploy, freshSave, step, warpFloor, type Input } from '../src/extract/sim.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null, soul: false }

/** Headless delver. Stands on each foe and swings. It does not get extra stats. */
function fight(depth: number, venture: number): { bossDead: boolean; playerDead: boolean; bossHp: number } {
  const save = freshSave()
  save.ventures = venture
  deploy(save, [{ kind: 'sword', n: 1 }])
  const run = save.run!
  warpFloor(run, depth)
  const steps = Math.round(90 / 0.05)
  for (let i = 0; i < steps; i += 1) {
    const foe = run.foes.find((item) => item.hp > 0 && !run.slain.includes(item.id))
    if (!foe) break
    run.zone = foe.zone
    run.roomId = foe.room
    run.x = foe.x - 16
    run.y = foe.y
    run.facing = 0
    run.stam = 100
    step(run, { ...still, attack: true }, 0.05)
    if (run.hp <= 0) return { bossDead: false, playerDead: true, bossHp: run.foes.find((item) => item.kind === 'boss')?.hp ?? 0 }
  }
  const boss = run.foes.find((item) => item.kind === 'boss')!
  return { bossDead: boss.hp <= 0 || run.slain.includes(boss.id), playerDead: run.hp <= 0, bossHp: Math.max(0, boss.hp) }
}

describe('starter clear rate', () => {
  it('still cannot kill the floor-2 boss and does not clear more often', () => {
    const seeds = 12
    let floor1Clear = 0
    let floor2Boss = 0
    let floor2Hp = 0
    for (let i = 0; i < seeds; i += 1) {
      const one = fight(1, i + 1)
      if (!one.playerDead && one.bossDead) floor1Clear += 1
      const two = fight(2, i + 1)
      if (two.bossDead) floor2Boss += 1
      floor2Hp += two.bossHp
    }
    const floor2HpAvg = Math.round(floor2Hp / seeds)
    console.log(JSON.stringify({
      seeds,
      floor1Clear,
      floor1Rate: Number((floor1Clear / seeds).toFixed(3)),
      floor2Boss,
      floor2Rate: Number((floor2Boss / seeds).toFixed(3)),
      floor2HpAvg,
      baseline: { floor1Clear: 12, floor2Boss: 0, floor2HpAvg: 428 },
    }))
    expect(floor2Boss).toBe(0)
    expect(floor2HpAvg).toBeGreaterThanOrEqual(400)
    expect(floor1Clear).toBeLessThanOrEqual(12)
  })
})
