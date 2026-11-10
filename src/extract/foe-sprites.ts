/** Readable pixel monsters. Two frames, facing right, outlined. Stats stay in the sim. */

export interface FoeMotif {
  rows: string[]
  pal: Record<string, string>
}

const ink = '#14110e'
const base = { '.': '', k: ink, w: '#f7fbff', e: '#e10600', y: '#f2c04a', n: '#e7edf4' }

function motif(rows: string[], extra: Record<string, string>): FoeMotif {
  return { rows, pal: { ...base, ...extra } }
}

function step(rows: string[]): string[] {
  return rows.map((row, index) => (index < rows.length - 2 ? row : row.slice(1) + row[0]))
}

const moth = motif([
  '..kkkk....kkkk..',
  '.kYYYYk..kYYYYk.',
  'kYYYYYYkkYYYYYYk',
  '.kYkkYYkkYYkkYk.',
  '..kkBBeeBBkk....',
  '....kBBmBBk.....',
  '....kLLLLRRk....',
  '.....kLkkRk.....',
], { Y: '#f2c04a', B: '#6a3a68', m: '#e7b2a4', L: '#c4a15a', R: '#c4a15a', l: '#8a6a32', r: '#8a6a32' })

const swarm = motif([
  '.kk..kk....kk...',
  'kYYkkYYk..kYYk..',
  '.kBBeBk..kBBeBk.',
  '..kmk....kmk....',
  '.kLRk..kLRk.....',
  '..kk....kk......',
], { Y: '#f7e7a0', B: '#5a3058', m: '#e7b2a4', L: '#c4a15a', R: '#a08040', l: '#8a6a32', r: '#6a4424' })

const burrow = motif([
  '....kkkkkkkk....',
  '...kBBBBBBeek...',
  '..kBBBBBBBBmmk..',
  '.kBBBnnnnnnnnk..',
  'kLLLBBBBBBBRRRk.',
  '.kk.kBBBBBBk.kk.',
  '....kLL..RRk....',
], { B: '#8a5a32', m: '#e7b2a4', L: '#c4a15a', R: '#c4a15a', l: '#6a4424', r: '#6a4424' })

const liang = motif([
  '...kkkkkkkkkk...',
  '..kBBBBBBBeek...',
  '.kBBBBBBBBBmmk..',
  'kBBBnnnnnnnnnnk.',
  'kLLBBBBBBBBBRRk.',
  '.k.kBBBBBBBBk.k.',
  '...kLLL..RRRk...',
], { B: '#a86a3a', m: '#f0c8b8', L: '#e7c27a', R: '#e7c27a', l: '#6a4424', r: '#6a4424' })

const spore = motif([
  '...kkkkkkkk.....',
  '..kGGGGGGGGk....',
  '.kGGwwGGGwGGk...',
  '..kGGGGGGGGk....',
  '....kBBmBBk.....',
  '...kLLLLRRRk....',
  '....kLLkkRRk....',
], { G: '#7ec8c4', B: '#24584a', m: '#f2e2a0', L: '#3d6a58', R: '#3d6a58', l: '#1c3a30', r: '#1c3a30' })

const spora = motif([
  '..kkkkkkkkkk....',
  '.kGGGGGGGGGGk...',
  'kGGwGGGwGGGwGGk.',
  '.kGGGGGGGGGGk...',
  '...kBBBBmBBk....',
  '..kLLLLRRRRRk...',
  '...kLLkkkkRRk...',
], { G: '#9dcec4', B: '#1c4038', m: '#f2c04a', L: '#4a7a68', R: '#4a7a68', l: '#143028', r: '#143028' })

const beetle = motif([
  '..kk....kk......',
  '.kSSkkkkkSSk....',
  'kSSSSSSSSSSSSk..',
  'kSSwwSSSSSwSSk..',
  '.kSSSmmSSSSk....',
  '..kLLLLRRRRk....',
  '...kLk..kRk.....',
], { S: '#3d5a28', m: '#e10600', L: '#6a8a40', R: '#6a8a40', l: '#2a3a18', r: '#2a3a18' })

const kumbang = motif([
  '.kk......kk.....',
  'kHHkkkkkkkkHHk..',
  'kHHHHHHHHHHHHk..',
  'kHHwHHHHHHwHHk..',
  '.kHHHmmHHHHk....',
  '..kLLLLRRRRk....',
  '...kLL..RRRk....',
], { H: '#6a4424', m: '#f2c04a', L: '#c4a15a', R: '#c4a15a', l: '#3a2c18', r: '#3a2c18' })

const jelly = motif([
  '...kkkkkkkk.....',
  '..kJJJJJJJJk....',
  '.kJJwwJJwwJJk...',
  '.kJJJJJJmmJJk...',
  '..kJJJJJJJJk....',
  '...kLLLLRRk.....',
  '....kk..kk......',
], { J: '#6aa86a', m: '#1c3a28', L: '#3d6a40', R: '#3d6a40', l: '#1c3a28', r: '#1c3a28' })

const mole = motif([
  '....kkkkkk......',
  '...kMMMMwwk.....',
  '..kMMMMMMnnk....',
  '.kLLLMMMMRRRk...',
  '.kLLkMMMMRk.k...',
  '..kk.kMMk.kk....',
  '....kLL.RRk.....',
], { M: '#5c564c', L: '#8aa0b8', R: '#8aa0b8', l: '#3a4038', r: '#3a4038' })

const mondok = motif([
  '...kkkkkkkk.....',
  '..kMMMMMMwwk....',
  '.kMMMMMMMMnnk...',
  'kLLLLMMMMRRRRk..',
  'kLLkMMMMMRk..k..',
  '.kk.kMMMMk.kk...',
  '...kLLL.RRRk....',
], { M: '#6a6458', L: '#d5dce6', R: '#d5dce6', l: '#3a4038', r: '#3a4038' })

const web = motif([
  'kL........Rk....',
  '.kL..kk..Rk.....',
  '..k.kwwk.k......',
  '...kkmmkk.......',
  '..k.kwwk.k......',
  '.kL..kk..Rk.....',
  'kL........Rk....',
], { L: '#6a5438', R: '#6a5438', m: '#e7b2a4', l: '#3a2c20', r: '#3a2c20' })

const laba = motif([
  'kL..........Rk..',
  '.kL...kk...Rk...',
  '..kL.kwwk.Rk....',
  '...kkmmmmkk.....',
  '..kL.kwwk.Rk....',
  '.kL...kk...Rk...',
  'kL..........Rk..',
], { L: '#8a6a48', R: '#8a6a48', m: '#f0c8b8', l: '#3a2c20', r: '#3a2c20' })

const ember = motif([
  '......yy........',
  '.....yEEy.......',
  '....kEEEEkk.....',
  '...kEEwwEEmk....',
  '..kEEEEEEEEnk...',
  '..kLLLEERRRk....',
  '...kk.kk.kk.....',
], { E: '#6a2a18', y: '#f2c04a', m: '#e07a32', L: '#a33b32', R: '#a33b32', l: '#3a140c', r: '#3a140c' })

const leech = motif([
  '..kkkkkkkkkk....',
  '.kLLLLwwLLLLk...',
  'kLLLLLLLLLmmmk..',
  '.kLLLLLLLLLLk...',
  '..kRRRRRRRRk....',
  '...kk....kk.....',
], { L: '#4a1020', m: '#f7fbff', R: '#a33b32', l: '#2a0810', r: '#2a0810' })

const bomber = motif([
  '......yk........',
  '.....ykk........',
  '....kkkkkk......',
  '...kBBBBwwk.....',
  '..kBBBBBBmmk....',
  '..kLLBBBRRRk....',
  '...kk.kk.kk.....',
], { B: '#3a2c20', y: '#e10600', m: '#e7edf4', L: '#6a4424', R: '#6a4424', l: '#241810', r: '#241810' })

const wisp = motif([
  '....kkkkkk......',
  '...kCCCCwwk.....',
  '..kCCCCCCmk.....',
  '..kCCCCCCCk.....',
  '...kCCCCCk......',
  '....kLLRRk......',
  '.....kkkk.......',
], { C: '#1a4a58', m: '#7ec8c4', L: '#7ec8c4', R: '#4a8a90', l: '#0e2830', r: '#0e2830' })

const crusher = motif([
  '.kkkkkkkkkkkk...',
  'kSSSSSSSSwwSSk..',
  'kSSSSSSSSmmSSk..',
  'kSSnnnnnnnnSSk..',
  '.kSSSSSSSSSSSk..',
  '..kLLLLRRRRRk...',
  '...kk....kk.....',
], { S: '#3a4038', m: '#e10600', L: '#5c6458', R: '#5c6458', l: '#241c18', r: '#241c18' })

const mulut = motif([
  'kkkkkkkkkkkkkk..',
  'kDDDDDDDDwwDDk..',
  'kDDDDDDDDmmDDk..',
  'kDDnnnnnnnnDDk..',
  '.kDDDDDDDDDDDk..',
  '..kLLLLRRRRRk...',
  '...kkk..kkk.....',
], { D: '#2a1418', m: '#f2c04a', L: '#6a3030', R: '#6a3030', l: '#14080c', r: '#14080c' })

export const FOE_MOTIFS: Record<string, [FoeMotif, FoeMotif]> = {
  moth: [moth, { ...moth, rows: step(moth.rows) }],
  swarm: [swarm, { ...swarm, rows: step(swarm.rows) }],
  burrow: [burrow, { ...burrow, rows: step(burrow.rows) }],
  liang: [liang, { ...liang, rows: step(liang.rows) }],
  spore: [spore, { ...spore, rows: step(spore.rows) }],
  spora: [spora, { ...spora, rows: step(spora.rows) }],
  beetle: [beetle, { ...beetle, rows: step(beetle.rows) }],
  kumbang: [kumbang, { ...kumbang, rows: step(kumbang.rows) }],
  jelly: [jelly, { ...jelly, rows: step(jelly.rows) }],
  mole: [mole, { ...mole, rows: step(mole.rows) }],
  mondok: [mondok, { ...mondok, rows: step(mondok.rows) }],
  web: [web, { ...web, rows: step(web.rows) }],
  laba: [laba, { ...laba, rows: step(laba.rows) }],
  ember: [ember, { ...ember, rows: step(ember.rows) }],
  leech: [leech, { ...leech, rows: step(leech.rows) }],
  bomber: [bomber, { ...bomber, rows: step(bomber.rows) }],
  wisp: [wisp, { ...wisp, rows: step(wisp.rows) }],
  crusher: [crusher, { ...crusher, rows: step(crusher.rows) }],
  mulut: [mulut, { ...mulut, rows: step(mulut.rows) }],
}

export function hasFoeSprite(breed: string | undefined): boolean {
  return !!breed && breed in FOE_MOTIFS
}

const cache = new Map<string, HTMLCanvasElement>()

export function foeCanvas(breed: string, frame: number): HTMLCanvasElement | null {
  const pair = FOE_MOTIFS[breed]
  if (!pair || typeof document === 'undefined') return null
  const key = `${breed}:${frame % 2}`
  const hit = cache.get(key)
  if (hit) return hit
  const motif = pair[frame % 2]!
  const width = Math.max(...motif.rows.map((row) => row.length))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = motif.rows.length
  const pen = canvas.getContext('2d')
  if (!pen) return null
  motif.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const color = motif.pal[row[x] ?? '.']
      if (!color) continue
      pen.fillStyle = color
      pen.fillRect(x, y, 1, 1)
    }
  })
  cache.set(key, canvas)
  return canvas
}

export function foeInkCount(breed: string): number {
  const motif = FOE_MOTIFS[breed]?.[0]
  if (!motif) return 0
  const colors = new Set<string>()
  for (const row of motif.rows) {
    for (const ch of row) {
      const color = motif.pal[ch]
      if (color) colors.add(color)
    }
  }
  return colors.size
}
