import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('en')
import { EXTRACT_SAVE_KEY, loadExtract } from '../src/extract/save.ts'
import { freshSave } from '../src/extract/sim.ts'
import { markSeen, normalizeTutorial, replayTutorial, skipTutorial, tipToShow, type TutorialWorld } from '../src/extract/tutorial.ts'
import { THEME_KITS } from '../src/extract/tilesets.ts'

const calm: TutorialWorld = {
  inRun: true,
  calm: true,
  nearVein: false,
  nearLoot: false,
  nearOpen: false,
  nearBarrel: false,
  bagFull: false,
  onExtract: false,
  fastRoom: false,
  bossRoom: false,
  lowHp: false,
  workshopOpen: false,
}

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

describe('first-run tutorial', () => {
  it('shows each hint once, then stays quiet after skip', () => {
    let flags = normalizeTutorial(undefined, undefined, 0)
    expect(tipToShow(flags, calm)).toBe('move')
    flags = markSeen(flags, 'move')
    expect(tipToShow(flags, calm)).toBe('sword')
    flags = markSeen(flags, 'move')
    expect(flags.seen.filter((id) => id === 'move')).toHaveLength(1)
    flags = skipTutorial(flags)
    expect(tipToShow(flags, { ...calm, nearVein: true })).toBeNull()
    expect(tipToShow(flags, calm)).toBeNull()
  })

  it('hides hints while a foe is aggroed and persists skip across a save', () => {
    const flags = normalizeTutorial(undefined, undefined, 0)
    expect(tipToShow(flags, { ...calm, calm: false, nearVein: true })).toBeNull()
    const store = memory()
    const save = freshSave()
    save.tutorialSkip = true
    save.tutorialSeen = ['move']
    store.setItem(EXTRACT_SAVE_KEY, JSON.stringify(save))
    const loaded = loadExtract(store)
    expect(loaded.tutorialSkip).toBe(true)
    expect(loaded.tutorialSeen).toEqual(['move'])
    expect(tipToShow({ seen: loaded.tutorialSeen ?? [], skip: loaded.tutorialSkip === true }, calm)).toBeNull()
    const again = replayTutorial()
    expect(again.skip).toBe(false)
    expect(tipToShow(again, calm)).toBe('move')
    expect(normalizeTutorial(undefined, undefined, 3).skip).toBe(true)
  })
})

describe('depth tilesets', () => {
  it('gives every depth its own palette', () => {
    expect(THEME_KITS).toHaveLength(7)
    const ids = THEME_KITS.map((kit) => kit.id)
    expect(new Set(ids).size).toBe(7)
    for (const kit of THEME_KITS) {
      const colors = [kit.floor, kit.floorB, kit.wall, kit.wallTop, kit.trim, kit.mote, kit.accent, kit.dark]
      expect(new Set(colors).size).toBeGreaterThanOrEqual(6)
    }
    expect(THEME_KITS[0]!.floor).not.toBe(THEME_KITS[6]!.floor)
    expect(THEME_KITS[2]!.mote).not.toBe(THEME_KITS[4]!.mote)
  })
})
