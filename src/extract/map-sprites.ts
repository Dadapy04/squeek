/** Pixel sprites for the room-map props. Each motif uses several colors and an outline. */

import { t, type MsgKey } from './i18n.ts'

export interface Motif {
  rows: string[]
  pal: Record<string, string>
}

const ink = '#14110e'
const pal = {
  '.': '',
  k: ink,
  w: '#f7fbff',
  y: '#f2c04a',
  Y: '#f7e7a0',
  b: '#6b4424',
  d: '#3a2c22',
  s: '#5c534c',
  S: '#2a241c',
  n: '#c4a15a',
  g: '#5f8a62',
  G: '#9dce78',
  t: '#7ec8c4',
  p: '#b388ff',
  r: '#a33b32',
  o: '#e25a2a',
  m: '#8a8478',
  c: '#6aa8a4',
}

function motif(rows: string[]): Motif {
  return { rows, pal }
}

/** The flat yellow stall from the phone shot, drawn as a real awning. */
const vendor = motif([
  '..kkkkkkkkkk..',
  '.kryyryyryyrk.',
  '.kyyyyyyyyyyk.',
  '.kkkkkkkkkkkk.',
  '....k....k....',
  '....kddddk....',
  '...kddddddk...',
  '...kd.yy.dk...',
  '...kddddddk...',
  '....kkkkkk....',
])

const chest = motif([
  '..kkkkkkkkkk..',
  '.kyyyyyyyyyk..',
  '.kykykykykyk..',
  'kkkkkkkkkkkkkk',
  'kddddddddddddk',
  'kdddkdddkkdddk',
  'kdddyYydykdddk',
  'kddddddddddddk',
  '.kkkkkkkkkkkk.',
])

const chestOpen = motif([
  '....kkkkkk....',
  '...kddddddk...',
  '..kddddddddk..',
  '.kkkkkkkkkkkk.',
  'kddddddddddddk',
  'kdd........ddk',
  'kdd..yyY...ddk',
  'kddddddddddddk',
  '.kkkkkkkkkkkk.',
])

const barrel = motif([
  '....kkkkkk....',
  '...krrrrrrk...',
  '..kryyryyryk..',
  '..krrrrrrrrk..',
  '..kkkkkkkkkk..',
  '..krrrrrrrrk..',
  '..kryyryyryk..',
  '...krrrrrrk...',
  '....kkkkkk....',
])

const crate = motif([
  '.kkkkkkkkkkkk.',
  'kbnnbnnbnnbnk.',
  'kbnnbnnbnnbnk.',
  'kkkkkkkkkkkkk.',
  'kbnnbnnbnnbnk.',
  'kbnnbnnbnnbnk.',
  '.kkkkkkkkkkkk.',
])

const lever = motif([
  '......kk......',
  '.....kyyk.....',
  '......kk......',
  '......bk......',
  '......bk......',
  '....kkkkkk....',
  '...kddddddk...',
  '....kkkkkk....',
])

const crack = motif([
  '..ssSssssSs...',
  '.sSkkss.Smm...',
  '.sskkm...ss...',
  '..sSkkss.m....',
  '...sskkSs.....',
  '....mSkkss....',
  '.....sskkm....',
  '......sSk.....',
  '....ssSSss....',
])

const shrine = motif([
  '......kk......',
  '.....kttk.....',
  '....kttttk....',
  '...kttwtttk...',
  '..kttttttttk..',
  '.kkkkkkkkkkkk.',
  'kggggggggggggk',
  'kgggtttttttggk',
  '.kkkkkkkkkkkk.',
])

const puddle = motif([
  '...kkkkkkkk...',
  '..kgGGGGGGGk..',
  '.kgGwwggggGGk.',
  'kgGggggggggGGk',
  '.kgGggggggGGk.',
  '..kgGGGGGGGk..',
  '...kkkkkkkk...',
])

const lava = motif([
  '...oooooooo...',
  '..oyyyyyyyyo..',
  '.oyyooooooyyo.',
  'oyyooooooooyyo',
  '.oyyooooooyyo.',
  '..oooooooooo..',
  '...ssssssss...',
])

const web = motif([
  'k..........k..',
  '.k....m...k...',
  '..k..kk..k....',
  '...k.ww.k.....',
  'kkkkwwwwkkkk..',
  '...k.ww.k.....',
  '..k..kk..m....',
  '.k........k...',
])

const debris = motif([
  '...ssmm.......',
  '..sSkkSs......',
  '.smSSSSss.nn..',
  '..sskkss.sSs..',
  '....mm..ssnn..',
  '.......sSss...',
])

const thorn = motif([
  '....k..k..k...',
  '...kg.kg.kg...',
  '..kggkggkggk..',
  '.kggggggggggk.',
  'kkkkkkkkkkkkkk',
  '..ssssssssss..',
])

const key = motif([
  '....kkkk......',
  '...kywyyk.....',
  '...ky.kyk.....',
  '...kyyyyk.....',
  '....kkkk......',
  '.....kk.......',
  '.....kbbk.....',
  '.....kk..k....',
  '.....kkkk.....',
])

function gem(rock: string, crystal: string, spark: string): Motif {
  return {
    pal: { ...pal, R: rock, C: crystal, W: spark },
    rows: [
      '..RRRRRRRR..',
      '.RRRRRRRRRR.',
      'RRRCCCCCCRRR',
      'RRCCCCCCCCCR',
      'RRCCCWCCCCRR',
      'RRCCCCCCCCCR',
      '.RRCCCCCCRR.',
      '..RRRRRRRR..',
      '...RRRRRR...',
    ],
  }
}

export const MAP_SPRITES: Record<string, Motif> = {
  vendor,
  chest,
  'chest-open': chestOpen,
  barrel,
  crate,
  lever,
  crack,
  shrine,
  puddle,
  lava,
  web,
  debris,
  thorn,
  key,
  'vein-copper': gem('#5c4634', '#c4a15a', '#f7e7a0'),
  'vein-silver': gem('#4a3428', '#d5dee6', '#f7fbff'),
  'vein-gold': gem('#3a2c22', '#f2c04a', '#f7e7a0'),
  'vein-spore': gem('#2a241c', '#9dce78', '#f7fbff'),
  'vein-gem': gem('#2a2018', '#b388ff', '#f7fbff'),
  'vein-abyss': gem('#241418', '#e25a2a', '#f2c04a'),
  'vein-big': {
    pal: { ...pal },
    rows: [
      '...ssssssssss...',
      '..ssSSSSSSSSss..',
      '.ssSyyyyyyyySss.',
      'ssSyyYyyyyyyYSss',
      'ssSyyyyYwyyySss.',
      'ssSyyyyyyyyySss.',
      '.ssSSSSSSSSss...',
      '..ssssssssss....',
      '....ssssss......',
    ],
  },
}

export const MAP_SPRITE_IDS = Object.keys(MAP_SPRITES)

const cache = new Map<string, HTMLCanvasElement>()

export function motifCanvas(id: string): HTMLCanvasElement | null {
  const hit = cache.get(id)
  if (hit) return hit
  const motif = MAP_SPRITES[id]
  if (!motif || typeof document === 'undefined') return null
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
  cache.set(id, canvas)
  return canvas
}

export function blitMotif(
  ctx: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  scale: number,
): void {
  const art = motifCanvas(id)
  if (!art) return
  const s = Math.max(1, scale)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(art, Math.round(x - (art.width * s) / 2), Math.round(y - art.height * s), Math.round(art.width * s), Math.round(art.height * s))
}

export function spriteStats(id: string): { colors: number; opaque: number; clear: number; topShare: number } {
  const motif = MAP_SPRITES[id]
  if (!motif) return { colors: 0, opaque: 0, clear: 0, topShare: 1 }
  const counts = new Map<string, number>()
  let opaque = 0
  let clear = 0
  for (const row of motif.rows) {
    for (const ch of row) {
      if (!ch || ch === '.' || !motif.pal[ch]) {
        clear += 1
        continue
      }
      opaque += 1
      counts.set(motif.pal[ch], (counts.get(motif.pal[ch]) ?? 0) + 1)
    }
  }
  let top = 0
  for (const n of counts.values()) top = Math.max(top, n)
  return { colors: counts.size, opaque, clear, topShare: opaque ? top / opaque : 1 }
}

const LABELS: Record<string, MsgKey> = {
  vendor: 'map.seller',
  chest: 'prop.chest',
  'chest-open': 'prop.open',
  barrel: 'prop.blast',
  crate: 'prop.crate',
  lever: 'prop.lever',
  crack: 'prop.crack',
  shrine: 'map.pool',
  puddle: 'prop.puddle',
  lava: 'prop.lava',
  web: 'prop.web',
  debris: 'prop.debris',
  thorn: 'prop.thorn',
  key: 'room.key',
  'vein-copper': 'ore.copper',
  'vein-silver': 'ore.silver',
  'vein-gold': 'ore.gold',
  'vein-spore': 'ore.spore',
  'vein-gem': 'ore.gem',
  'vein-abyss': 'ore.abyss',
  'vein-big': 'ore.big',
}

export function spriteIdFor(kind: string, ore?: string, big?: boolean, open?: boolean): string {
  if (kind === 'vein') return big ? 'vein-big' : `vein-${ore || 'copper'}`
  if (kind === 'chest' && open) return 'chest-open'
  return LABELS[kind] ? kind : 'crate'
}

export function mapLabel(kind: string, ore?: string, big?: boolean, open?: boolean): string {
  const id = spriteIdFor(kind, ore, big, open)
  return t(LABELS[id] ?? 'ore.vein')
}

export function interactable(id: string): boolean {
  return !['puddle', 'lava', 'web', 'debris', 'thorn'].includes(id)
}

export function drawMapSheet(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#1a140f'
  ctx.fillRect(0, 0, width, height)
  const ids = MAP_SPRITE_IDS
  const cols = 7
  const cellW = Math.floor(width / cols)
  const cellH = Math.floor(height / Math.ceil(ids.length / cols))
  ctx.font = '12px Courier New, monospace'
  ctx.textAlign = 'center'
  ids.forEach((id, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const x = col * cellW + cellW / 2
    const y = row * cellH + cellH * 0.42
    blitMotif(ctx, id, x, y, 3)
    ctx.fillStyle = '#f6ecd8'
    ctx.fillText(id, x, row * cellH + cellH - 8)
  })
}
