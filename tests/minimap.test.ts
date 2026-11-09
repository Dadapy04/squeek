import { describe, expect, it } from 'vitest'
import { markers, reveal, tileKey, worldPoint } from '../src/extract/minimap.ts'
import { CRATES, deploy, freshSave, type Run } from '../src/extract/sim.ts'
import { loadExtract, writeExtract } from '../src/extract/save.ts'

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
  expect(deploy(save, [{ kind: 'sword', n: 1 }], true)).toBeNull()
  return save.run!
}

describe('minimap fog', () => {
  it('loads an old save that has no explored field', () => {
    const store = memory()
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }], false)
    const raw = JSON.parse(JSON.stringify(save)) as { run: Run }
    delete (raw.run as { explored?: string[] }).explored
    store.setItem('npcs-burrow-pixel-extract.save.v1', JSON.stringify(raw))
    const loaded = loadExtract(store)
    expect(loaded.run?.explored).toEqual([])
    expect(loaded.run?.zone).toBe('pangkalan')
  })

  it('keeps explored tiles across a save and reveals only nearby ground', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }], false)
    const run = save.run!
    run.zone = 'tambang'
    run.x = -30
    run.y = -10
    expect(reveal(run)).toBe(true)
    expect(run.explored.length).toBeGreaterThan(0)
    expect(run.explored.every((key) => key.startsWith('tambang:'))).toBe(true)
    const far = tileKey('tambang', 90, 120)
    expect(far).toBeTruthy()
    expect(run.explored.includes(far!)).toBe(false)
    const store = memory()
    writeExtract(store, save)
    expect(loadExtract(store).run?.explored).toEqual(run.explored)
  })

  it('shows chests and the extract circle, never a monster', () => {
    const run = started()
    run.zone = 'reruntuhan'
    run.x = -20
    run.y = -70
    reveal(run)
    run.explored.push(tileKey('pangkalan', 0, 70)!, tileKey('pangkalan', 0, -80)!, tileKey('reruntuhan', 50, 30)!)
    const relic = CRATES.find((crate) => crate.id === 'crate-relic')!
    run.opened.push('crate-ore')
    const kinds = markers(run).map((mark) => mark.kind)
    expect(kinds).toContain('player')
    expect(kinds).toContain('chest')
    expect(kinds).toContain('chest-open')
    expect(kinds).toContain('extract')
    expect(kinds).toContain('base')
    expect(kinds).not.toContain('foe')
    expect(JSON.stringify(markers(run))).not.toContain('crab')
    expect(JSON.stringify(markers(run))).not.toContain('spitter')
    const fancy = markers(run).find((mark) => mark.fancy)
    expect(fancy?.x).toBe(relic.x)
    expect(fancy?.kind).toBe('chest')
  })

  it('places the base above the mine and the ruins to the right', () => {
    const base = worldPoint('pangkalan', 0, 0)
    const mine = worldPoint('tambang', 0, 0)
    const ruins = worldPoint('reruntuhan', 0, 0)
    expect(base.y).toBeLessThan(mine.y)
    expect(ruins.x).toBeGreaterThan(mine.x)
    expect(ruins.y).toBe(mine.y)
  })
})
