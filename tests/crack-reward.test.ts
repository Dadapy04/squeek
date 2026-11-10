import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('en')
import { generateFloor } from '../src/extract/dungeon.ts'
import { deploy, freshSave, step, type Input } from '../src/extract/sim.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null, soul: false }

describe('cracked walls', () => {
  it('pays every crack with a secret door or a drop on the ground', () => {
    for (let depth = 1; depth <= 7; depth += 1) {
      for (const seed of [2, 9]) {
        const chart = generateFloor(depth, seed)
        const save = freshSave()
        expect(deploy(save, [{ kind: 'sword', n: 1 }])).toBeNull()
        const run = save.run!
        run.depth = depth
        run.seed = seed
        run.chart = chart
        const cracks = chart.props.filter((prop) => prop.kind === 'crack')
        expect(cracks.length).toBeGreaterThan(0)
        for (const crack of cracks) {
          const drops = run.drops.length
          const flags = new Set(run.flags ?? [])
          for (const other of chart.props) if (other !== crack && other.room === crack.room) other.state = 'spent'
          run.zone = crack.zone
          run.roomId = crack.room
          run.x = crack.x
          run.y = crack.y
          run.facing = 0
          crack.hp = 1
          crack.state = 'live'
          step(run, { ...still, interact: true }, 0.05)
          const opened = (run.flags ?? []).some((flag) => flag.startsWith('secret:') && !flags.has(flag))
          const loot = run.drops.length > drops
          expect(opened || loot, `${crack.id} at depth ${depth}`).toBe(true)
          expect(crack.state).toBe('open')
          if (opened) {
            const room = chart.rooms.find((item) => item.id === crack.room)
            const door = room?.doors.find((item) => item.lock === 'secret')
            expect(door).toBeTruthy()
            expect(run.seenRooms).toContain(door!.to)
            expect(run.floats.some((item) => item.text === 'A hidden passage!')).toBe(true)
          }
        }
        const secret = chart.rooms.find((room) => room.role === 'secret')
        expect(secret).toBeTruthy()
        const chest = chart.props.find((prop) => prop.kind === 'chest' && prop.room === secret!.id)
        expect(chest?.loot.length).toBeGreaterThan(0)
        if (depth >= 4) {
          expect(chart.spawns.some((spawn) => spawn.room === secret!.id && !spawn.elite)).toBe(true)
        }
      }
    }
  })
})
