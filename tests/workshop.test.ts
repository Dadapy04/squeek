import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('id')
import { EXTRACT_SAVE_KEY, loadExtract, writeExtract } from '../src/extract/save.ts'
import { EXTRACT_TIME, SHIELD_MAX, bankRun, count, deploy, freshSave, killRun } from '../src/extract/sim.ts'
import { applyWorkshop, workshopView } from '../src/extract/workshop.ts'

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

function home() {
  const save = freshSave()
  save.stash.push({ kind: 'scrap', n: 5 }, { kind: 'ore', n: 2 })
  return save
}

describe('bengkel shield repair', () => {
  it('repairs one point per scrap and refuses to pass 4/4', () => {
    const save = home()
    save.shield = 2
    expect(workshopView(save).offers.find((item) => item.action === 'fill')?.scrap).toBe(2)
    expect(applyWorkshop(save, 'mend')).toMatchObject({ ok: true, shield: 3, note: 'Perisai 3/4. Besi −1.' })
    expect(count(save.stash, 'scrap')).toBe(4)
    expect(count(save.stash, 'ore')).toBe(2)
    expect(applyWorkshop(save, 'mend').ok).toBe(true)
    expect(save.shield).toBe(SHIELD_MAX)
    expect(count(save.stash, 'scrap')).toBe(3)
    const full = applyWorkshop(save, 'mend')
    expect(full).toMatchObject({ ok: false, reason: 'Perisai sudah 4/4.' })
    expect(save.shield).toBe(SHIELD_MAX)
    expect(count(save.stash, 'scrap')).toBe(3)
    expect(workshopView(save).offers.find((item) => item.action === 'fill')?.enabled).toBe(false)
  })

  it('fills the remaining durability in one spend', () => {
    const save = home()
    save.shield = 1
    save.stash = save.stash.map((stack) => stack.kind === 'scrap' ? { kind: 'scrap', n: 3 } : stack)
    expect(applyWorkshop(save, 'fill')).toMatchObject({ ok: true, shield: 4, note: 'Perisai 4/4. Besi −3.' })
    expect(count(save.stash, 'scrap')).toBe(0)
    expect(applyWorkshop(save, 'fill').ok).toBe(false)
  })

  it('forges one new shield from 3 scrap and 1 ore, and will not make a second', () => {
    const save = home()
    save.shield = null
    save.stash = [
      { kind: 'sword', n: 1 },
      { kind: 'scrap', n: 3 },
      { kind: 'ore', n: 1 },
    ]
    expect(workshopView(save).state).toBe('Perisai hancur')
    expect(applyWorkshop(save, 'forge')).toMatchObject({ ok: true, shield: 4, note: 'Perisai 4/4. Besi −3, bijih −1.' })
    expect(save.shield).toBe(SHIELD_MAX)
    expect(count(save.stash, 'scrap')).toBe(0)
    expect(count(save.stash, 'ore')).toBe(0)
    expect(count(save.stash, 'sword')).toBe(1)
    save.stash.push({ kind: 'scrap', n: 3 }, { kind: 'ore', n: 1 })
    expect(applyWorkshop(save, 'forge')).toMatchObject({ ok: false, reason: 'Sudah ada satu perisai.' })
    expect(count(save.stash, 'scrap')).toBe(3)
    expect(count(save.stash, 'ore')).toBe(1)
  })

  it('spends nothing when the stash is short', () => {
    const damaged = home()
    damaged.shield = 2
    damaged.stash = damaged.stash.filter((stack) => stack.kind !== 'scrap')
    expect(applyWorkshop(damaged, 'mend')).toMatchObject({ ok: false, reason: 'Besi kurang.' })
    expect(applyWorkshop(damaged, 'fill')).toMatchObject({ ok: false, reason: 'Besi kurang.' })
    expect(damaged.shield).toBe(2)

    const broken = home()
    broken.shield = null
    broken.stash = [{ kind: 'scrap', n: 3 }]
    expect(applyWorkshop(broken, 'forge')).toMatchObject({ ok: false, reason: 'Bijih kurang.' })
    expect(broken.shield).toBeNull()
    expect(count(broken.stash, 'scrap')).toBe(3)

    broken.stash = [{ kind: 'scrap', n: 2 }, { kind: 'ore', n: 1 }]
    expect(applyWorkshop(broken, 'forge')).toMatchObject({ ok: false, reason: 'Besi kurang.' })
    expect(count(broken.stash, 'scrap')).toBe(2)
    expect(count(broken.stash, 'ore')).toBe(1)
    expect(applyWorkshop(broken, 'mend')).toMatchObject({ ok: false, reason: 'Tidak ada perisai untuk ditambal.' })
  })

  it('refuses repair during a run and never spends the bag', () => {
    const save = home()
    save.shield = 2
    expect(deploy(save, [{ kind: 'sword', n: 1 }], false)).toBeNull()
    expect(save.run).not.toBeNull()
    expect(save.shield).toBe(2)
    save.run!.bag.push({ kind: 'scrap', n: 9 }, { kind: 'ore', n: 4 })
    const scrap = count(save.stash, 'scrap')
    expect(applyWorkshop(save, 'mend')).toMatchObject({ ok: false, reason: 'Galian masih berjalan.' })
    expect(applyWorkshop(save, 'fill').ok).toBe(false)
    expect(applyWorkshop(save, 'forge').ok).toBe(false)
    expect(save.shield).toBe(2)
    expect(count(save.stash, 'scrap')).toBe(scrap)
    expect(count(save.run!.bag, 'scrap')).toBe(9)
    expect(count(save.run!.bag, 'ore')).toBe(4)

    const carried = home()
    expect(deploy(carried, [{ kind: 'sword', n: 1 }], true)).toBeNull()
    carried.run!.shield = 1
    carried.run!.bag.push({ kind: 'scrap', n: 6 }, { kind: 'ore', n: 2 })
    expect(applyWorkshop(carried, 'mend').ok).toBe(false)
    expect(applyWorkshop(carried, 'forge').ok).toBe(false)
    expect(carried.shield).toBeNull()
    expect(carried.run!.shield).toBe(1)
    expect(count(carried.run!.bag, 'scrap')).toBe(6)
  })

  it('lets an old broken save forge again without resetting the stash', () => {
    const storage = memory()
    storage.setItem(EXTRACT_SAVE_KEY, JSON.stringify({
      shieldGranted: true,
      shield: null,
      stash: [{ kind: 'relic', n: 2 }, { kind: 'scrap', n: 3 }, { kind: 'ore', n: 1 }],
      support: 4,
      run: null,
    }))
    const loaded = loadExtract(storage)
    expect(loaded.shield).toBeNull()
    expect(loaded.shieldGranted).toBe(true)
    expect(count(loaded.stash, 'relic')).toBe(2)
    expect(applyWorkshop(loaded, 'forge').ok).toBe(true)
    expect(loaded.shield).toBe(SHIELD_MAX)
    expect(count(loaded.stash, 'relic')).toBe(2)
    expect(loaded.support).toBe(4)
    writeExtract(storage, loaded)
    const again = loadExtract(storage)
    expect(again.shield).toBe(SHIELD_MAX)
    expect(count(again.stash, 'scrap')).toBe(0)
    expect(count(again.stash, 'ore')).toBe(0)
    expect(count(again.stash, 'relic')).toBe(2)
  })

  it('repairs a shield that came home damaged, and death still does not mint one', () => {
    const save = home()
    expect(deploy(save, [{ kind: 'sword', n: 1 }], true)).toBeNull()
    save.run!.shield = 1
    save.run!.channel = EXTRACT_TIME
    save.run!.zone = 'pangkalan'
    save.run!.x = 0
    save.run!.y = -80
    expect(bankRun(save)).toBe(true)
    expect(save.shield).toBe(1)
    expect(applyWorkshop(save, 'fill').ok).toBe(true)
    expect(save.shield).toBe(4)

    save.shield = 2
    expect(deploy(save, [{ kind: 'sword', n: 1 }], true)).toBeNull()
    killRun(save)
    expect(save.shield).toBeNull()
    expect(save.run).toBeNull()
    expect(applyWorkshop(save, 'mend').ok).toBe(false)
  })
})
