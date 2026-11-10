import { describe, expect, it } from 'vitest'
import { EXTRACT_SAVE_KEY, loadExtract, writeExtract } from '../src/extract/save.ts'
import { freshSave } from '../src/extract/sim.ts'

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

describe('extract save guard', () => {
  it('keeps an older save and ignores a torn write', () => {
    const storage = memory()
    const save = freshSave()
    save.coins = 428
    save.depth = 4
    expect(writeExtract(storage, save)).toBe(true)
    expect(storage.getItem(`${EXTRACT_SAVE_KEY}.tmp`)).toBeNull()
    storage.setItem(EXTRACT_SAVE_KEY, '{"depth":')
    storage.setItem(`${EXTRACT_SAVE_KEY}.tmp`, storage.getItem(EXTRACT_SAVE_KEY) ? JSON.stringify({ coins: 12, depth: 2, hpScaled: true }) : '')
    const recovered = loadExtract(storage)
    expect(recovered.coins).toBe(12)
    expect(recovered.depth).toBe(2)
    storage.setItem(EXTRACT_SAVE_KEY, 'not-json')
    storage.removeItem(`${EXTRACT_SAVE_KEY}.tmp`)
    expect(loadExtract(storage).coins).toBe(0)
    const legacy = loadExtract(memory())
    legacy.coins = 7
    const box = memory()
    box.setItem(EXTRACT_SAVE_KEY, JSON.stringify({ coins: 7, depth: 3, shield: 4, stash: [{ kind: 'bandage', n: 1 }] }))
    const loaded = loadExtract(box)
    expect(loaded.coins).toBe(7)
    expect(loaded.depth).toBe(3)
    expect(loaded.bagSlots).toBe(12)
    expect(loaded.swordLevel).toBe(1)
    expect(loaded.stash.some((stack) => stack.kind === 'bandage')).toBe(true)
    const preAudio = memory()
    preAudio.setItem(EXTRACT_SAVE_KEY, JSON.stringify({ coins: 40, depth: 2, ventures: 3, hpScaled: true, swordLevel: 4, bagSlots: 16 }))
    const kept = loadExtract(preAudio)
    expect(kept.coins).toBe(40)
    expect(kept.swordLevel).toBe(4)
    expect(kept.bagSlots).toBe(16)
    expect(kept.ventures).toBe(3)
  })
})
