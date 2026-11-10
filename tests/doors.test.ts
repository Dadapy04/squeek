import { describe, expect, it } from 'vitest'
import {
  DOOR_CLEAR,
  connected,
  doorPad,
  generateFloor,
  nextExitDoor,
  onDoor,
  roomAt,
  type Dir,
} from '../src/extract/dungeon.ts'

const OPPOSITE: Record<Dir, Dir> = { n: 's', s: 'n', e: 'w', w: 'e' }

describe('door graph', () => {
  it('keeps every depth walkable, symmetric, and clear, and the hint follows a real door', () => {
    for (let depth = 1; depth <= 7; depth += 1) {
      for (let seed = 1; seed <= 24; seed += 1) {
        const chart = generateFloor(depth, seed)
        expect(connected(chart), `d${depth} s${seed}`).toBe(true)
        const start = chart.rooms.find((room) => room.role === 'start')!
        const extract = chart.rooms.find((room) => room.role === 'extract')
        expect(extract, `extract d${depth}`).toBeTruthy()
        const seen = new Set<string>([start.id])
        const queue = [start.id]
        for (let i = 0; i < queue.length; i += 1) {
          const room = roomAt(chart, queue[i])!
          for (const door of room.doors) {
            const other = roomAt(chart, door.to)
            expect(other, door.to).toBeTruthy()
            const back = other!.doors.find((item) => item.to === room.id && item.dir === OPPOSITE[door.dir])
            expect(back, `${room.id} ${door.dir}`).toBeTruthy()
            if (!seen.has(door.to)) {
              seen.add(door.to)
              queue.push(door.to)
            }
          }
        }
        expect(seen.has(extract!.id), `reach extract d${depth} s${seed}`).toBe(true)
        for (const room of chart.rooms) {
          for (const prop of chart.props) {
            if (prop.room !== room.id || prop.kind === 'crack') continue
            expect(onDoor(room, prop.x, prop.y), `${prop.id}`).toBe(false)
          }
          for (const vein of chart.veins) {
            if (vein.room !== room.id) continue
            expect(onDoor(room, vein.x, vein.y), vein.id).toBe(false)
          }
          for (const torch of chart.torches) {
            if (torch.room !== room.id) continue
            expect(onDoor(room, torch.x, torch.y, DOOR_CLEAR - 4), torch.id).toBe(false)
          }
        }
        for (const room of chart.rooms) {
          const step = nextExitDoor(chart, room.id)
          if (room.role === 'extract' || room.role === 'fast') {
            expect(step).toBeNull()
            continue
          }
          expect(step, room.id).toBeTruthy()
          expect(room.doors.some((door) => door.dir === step!.dir && door.to === step!.to)).toBe(true)
          const pad = doorPad(step!.dir)
          const edge = step!.dir === 'n' || step!.dir === 's'
          if (edge) expect(Math.abs(pad.x)).toBe(0)
          else expect(Math.abs(pad.y)).toBe(0)
        }
      }
    }
  })
})
