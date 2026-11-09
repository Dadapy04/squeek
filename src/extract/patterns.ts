/** Cached 1× pixel motifs. Gameplay blits them at camera scale. */

type Palette = Record<string, string>
type Pen = CanvasRenderingContext2D

const cache = new Map<string, HTMLCanvasElement>()

function paint(name: string, rows: string[], pal: Palette): HTMLCanvasElement {
  const hit = cache.get(name)
  if (hit) return hit
  if (typeof document === 'undefined') {
    const blank = { width: 16, height: 16 } as HTMLCanvasElement
    cache.set(name, blank)
    return blank
  }
  const clean = rows.map((row) => row.trim()).filter((row) => row.length > 0)
  const width = Math.max(1, ...clean.map((row) => row.length))
  const norm = clean.map((row) => row.padEnd(width, '.').slice(0, width))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = norm.length
  const pen = canvas.getContext('2d')
  if (!pen) return canvas
  norm.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const color = pal[row[x] ?? '']
      if (!color) continue
      pen.fillStyle = color
      pen.fillRect(x, y, 1, 1)
    }
  })
  cache.set(name, canvas)
  return canvas
}

const ink = '#14181c'
const wood = { '.': '', k: ink, a: '#6a5340', b: '#4a3828', c: '#3a2c20', d: '#2a2018', e: '#7a6248', n: '#c4b8a4', m: '#8d5a32' }
const stone = { '.': '', k: ink, a: '#4a3428', b: '#3a2c24', c: '#5c4634', d: '#241c16', g: '#3d5a40', o: '#6a8f58', m: '#5c6570', h: '#8d97a3', r: '#8d5a32', n: '#c4b8a4' }
const ruin = { '.': '', k: '#1c1816', a: '#3e3c38', b: '#5a564e', c: '#6e6a62', d: '#2a2826', g: '#3d5a40', r: '#8d5a32' }

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

/** Short grout ticks. A full-width row read as a black cut across the ruins. */
export function isRuinGrout(gx: number, gy: number): boolean {
  const along = mod(gx, 16)
  const down = mod(gy, 16)
  const tick = along >= 6 && along <= 8
  const tickY = down >= 6 && down <= 8
  return (mod(gx, 64) === 0 && tickY) || (mod(gy, 64) === 0 && tick)
}

export function timberTile(cx: number, cy: number): HTMLCanvasElement {
  const postHere = mod(cx, 4) === 0
  const knot = mod(cy, 3) === 0
  const rows: string[] = []
  for (let y = 0; y < 16; y += 1) {
    let row = ''
    const gy = cy * 16 + y
    const joint = mod(gy, 16) === 15
    for (let x = 0; x < 16; x += 1) {
      const post = postHere && x < 2
      if (post) row += y % 2 === 0 ? 'e' : 'd'
      else if (joint) row += 'k'
      else if (knot && x === 8 && mod(gy, 16) === 6) row += 'm'
      else if (mod(gy, 16) === 0) row += 'a'
      else row += 'b'
    }
    rows.push(row)
  }
  return paint(`timber-${postHere ? 1 : 0}-${knot ? 1 : 0}`, rows, wood)
}

export function mineTile(cx: number, cy: number): HTMLCanvasElement {
  const rows: string[] = []
  for (let y = 0; y < 16; y += 1) {
    let row = ''
    for (let x = 0; x < 16; x += 1) {
      const gx = cx * 16 + x
      const gy = cy * 16 + y
      const slab = mod(Math.floor(gx / 40) + Math.floor(gy / 40), 2) === 0
      const lx = mod(gx, 72)
      const ly = mod(gy, 64)
      const plate = lx < 28 && ly > 40
      const ore = mod(Math.floor(gx / 56) + Math.floor(gy / 48), 5) === 0 && lx > 36 && lx < 58 && ly > 16 && ly < 40
      if (plate && (lx === 2 || lx === 24) && (ly === 44 || ly === 58)) row += 'n'
      else if (plate) row += 'm'
      else if (ore) row += 'o'
      else row += slab ? 'b' : 'a'
    }
    rows.push(row)
  }
  return paint(`mine-${cx}-${cy}`, rows, stone)
}

export function ruinTile(cx: number, cy: number): HTMLCanvasElement {
  const rows: string[] = []
  for (let y = 0; y < 16; y += 1) {
    let row = ''
    for (let x = 0; x < 16; x += 1) {
      const gx = cx * 16 + x
      const gy = cy * 16 + y
      const seam = isRuinGrout(gx, gy)
      const slab = mod(Math.floor(gx / 64) + Math.floor(gy / 64) * 2, 3)
      const lx = mod(gx, 64)
      const ly = mod(gy, 64)
      const puddle = mod(Math.floor(gx / 64) + Math.floor(gy / 64), 4) === 0 && lx > 18 && lx < 46 && ly > 22 && ly < 48
      const crack = mod(Math.floor(gx / 64) * 3 + Math.floor(gy / 64), 5) === 1 && ly > 8 && ly < 11 && lx > 12 && lx < 48
      if (seam) row += 'k'
      else if (crack) row += 'd'
      else if (puddle) row += 'g'
      else row += slab === 0 ? 'a' : slab === 1 ? 'b' : 'c'
    }
    rows.push(row)
  }
  return paint(`ruin-${cx}-${cy}`, rows, { ...ruin, a: '#2a2826', b: '#302e2b', c: '#262422', g: '#243433', d: '#1c1a18', k: '#242220' })
}

export function rockRim(variant = 0): HTMLCanvasElement {
  const rows = variant % 2 === 0
    ? [
        '......kkkk......',
        '....kkccccck....',
        '...kcccceeeek...',
        '..kccceeeeeek...',
        '..kceeeeeaaek...',
        '.kceeeeaaaaaek..',
        '.kceeeaaaaaaek..',
        '.kceeaaaaaraek..',
        '.kceaaaaadaaek..',
        '..kcaaaaaaaek...',
        '..kkaadddddk....',
        '...kkdddddk.....',
        '....kkkkkk......',
        '.....k..k.......',
      ]
    : [
        '.....kkkkk......',
        '...kkccccckk....',
        '..kcccceeeek....',
        '.kccceeeeeaek...',
        '.kceeeeeaaaaek..',
        '.kceeeaaaaaaek..',
        '.kceeaaaaagaek..',
        '.kceaaaaadaaek..',
        '..kcaaaaaaaek...',
        '..kkadddddk.....',
        '...kkddddk......',
        '....kkkkk.......',
        '.....kk.........',
        '................',
      ]
  return paint(`rock-${variant % 2}`, rows, { '.': '', k: ink, c: '#d5d0c4', e: '#8a8478', a: '#5a564e', d: '#2a2826', r: '#8d5a32', g: '#3d5a40' })
}

export function pipeRun(): HTMLCanvasElement {
  const rows = [
    'kkkkkkkkkkkkkkkkkkkkkkkk',
    'kbbbbbbbbbbkkkkbbbbbbbbk',
    'kchhhhhhhhckkkchhhhhhhck',
    'kbbbbbbbbbbkkkkbbbbbbbbk',
    'kbrrrbbbbrrkkkkbbrrrbbbk',
    'kkkkkkkkkkkkkkkkkkkkkkkk',
    '..kk........kkkk........',
    '..kk........kkkk........',
  ]
  return paint('pipe', rows, { '.': '', k: ink, b: '#5c6570', c: '#8d97a3', h: '#c4b8a4', r: '#8d5a32' })
}

export function cableRun(): HTMLCanvasElement {
  const rows = [
    'k..k........k..k',
    'kkkkkkkkkkkkkkkk',
    'kddddddddddddddk',
    'kkkkkkkkkkkkkkkk',
    '....kk......kk..',
    '....kk......kk..',
  ]
  return paint('cable', rows, { '.': '', k: ink, d: '#2a241c' })
}

export function lampHousing(): HTMLCanvasElement {
  const rows = [
    '....kkkkkk....',
    '...kcccccck...',
    '..kcghhhgck...',
    '..kcgwhhgck...',
    '..kcghhhgck...',
    '...kcccccck...',
    '....kkkkkk....',
    '....krrrkk....',
    '.....kddk.....',
    '.....kddk.....',
    '.....kddk.....',
    '....kkddkk....',
    '...krrrrrrk...',
    '...kkkkkkkk...',
  ]
  return paint('lamp', rows, { '.': '', k: ink, c: '#5c6570', g: '#3a3424', h: '#c4a15a', w: '#e7d7a4', r: '#8d5a32', d: '#2a241c' })
}

export function machineSprite(): HTMLCanvasElement {
  const rows = [
    '......kkkk......',
    '......kghk......',
    '......khhk......',
    '..kkkkkkkkkkkk..',
    '.kbbbbbbbbbbbbk.',
    '.kbcnbbbbbbncbk.',
    '.kbbbbbbbbbbbbk.',
    '.kbvvvvvvvvvvbk.',
    '.kbrrrrrrrrrrbk.',
    '.kbbbbkkkkbbbbk.',
    '.kkkkkkkkkkkkkk.',
    '...kdd....kdd...',
    '...kdd....kdd...',
    '....kk....kk....',
  ]
  return paint('machine', rows, { '.': '', k: ink, b: '#3a332c', c: '#5c6570', n: '#c4b8a4', v: '#1c2428', r: '#8d5a32', h: '#6aa8a4', g: '#2a4448', d: '#241c18' })
}

export function chestSprite(open: boolean): HTMLCanvasElement {
  const closed = [
    '.kkkkkkkkkkkkkk.',
    'kksssssssssssskk',
    'kksssssssssssskk',
    'kbbbbbbbbbbbbbbk',
    'kbrrrrrrrrrrrrbk',
    'kbrrrrrrrrrrrrbk',
    'kbbbbkkkkkkbbbbk',
    'kbbbbkhhhhkbbbbk',
    'kbbbbkhhhhkbbbbk',
    'kbbbbkkkkkkbbbbk',
    'kbbbbbbbbbbbbbbk',
    'kbrrrrrrrrrrrrbk',
    'kkkkkkkkkkkkkkkk',
    '.kk........kk...',
  ]
  const opened = [
    'kkkkkkkkkkkkkkkk',
    'kssssssssssssssk',
    'kssssssssssssssk',
    'ksddddddddddddsk',
    'kkkkkkkkkkkkkkkk',
    '.kbbbbbbbbbbbbk.',
    '.kbiiiiiiiiibbk.',
    '.kbiiiiwwiiibbk.',
    '.kbbbbbhhhhbbbk.',
    '.kbrrrrrrrrrrrk.',
    '.kbbbbbbbbbbbbk.',
    '.kkkkkkkkkkkkkk.',
  ]
  return paint(open ? 'chest-open' : 'chest', open ? opened : closed, {
    '.': '',
    k: ink,
    b: '#6a442c',
    r: '#8d5a32',
    h: '#c4a15a',
    s: '#d5dce6',
    d: '#2a241c',
    i: '#1a1612',
    w: '#c4b8a4',
  })
}

export function lootIcon(kind: string): HTMLCanvasElement {
  const rows: Record<string, string[]> = {
    scrap: ['kkkkkkkk', 'krrhhrrk', 'krhkkhrk', 'krrhhrrk', 'krhhhhrk', 'kkkkkkkk'],
    ore: ['..kkkk..', '.kggggk.', 'kgglgggk', 'kggggggk', '.kggggk.', '..kkkk..'],
    relic: ['..kkkk..', '.kcccck.', 'kchhhhck', 'kchwhhck', 'kcccccck', '..kkkk..'],
    shard: ['...kk...', '..kttk..', '.ktwttk.', 'kttttttk', '.kttttk.', '..kkkk..'],
    bandage: ['kkkkkkkk', 'kwwwwwwk', 'kwwrrwwk', 'kwrrrrwk', 'kwwrrwwk', 'kwwwwwwk', 'kkkkkkkk'],
    tonic: ['..kkkk..', '.kggggk.', '.kgwwgk.', 'kkkkkkkk', 'kggggggk', 'kggggggk', '.kkkkkk.'],
    sword: ['...kk...', '...ssk...', '...ssk...', '..kkkk..', '...hh...'],
    tombak: ['k.......', 'kt......', '.kt.....', '..kt....', '...kh...', '....hh..'],
  }
  const pal: Palette = { '.': '', k: ink, r: '#8d5a32', h: '#c4a15a', g: '#5f8a62', l: '#8aaf86', c: '#c4a15a', t: '#6aa8a4', w: '#e7edf4', s: '#d5dce6' }
  return paint(`loot-${kind}`, rows[kind] ?? rows.scrap!, pal)
}

export function debrisSprite(): HTMLCanvasElement {
  const rows = [
    '..kkkk....kk..',
    '.kbbbck..krk..',
    'kkbbbckkkkk...',
    '.kkkk..kmmk...',
    '......kkkk....',
  ]
  return paint('debris', rows, { '.': '', k: ink, b: '#5c534c', c: '#8a8478', r: '#8d5a32', m: '#3a332c' })
}

export function knightCape(facing: 'n' | 'e' | 's'): HTMLCanvasElement {
  const south = [
    '..kkkkkkkkkkkkkkkkkk..',
    '.kcccddddddddddddccck.',
    'kccccddddddddddddcccck',
    'kcccccddddddddddccccck',
    'kccccccddddddddcccccck',
    'kcccccddddddddddccccck',
    'kccccddddddddddddcccck',
    'kcccddddddddddddddccck',
    '.kcccddddddddddddccck.',
    '..kkcccccccccccccckk..',
    '...kkkkkkkkkkkkkkkk...',
  ]
  const north = [
    'kkkkkkkkkkkkkkkkkkkkkk',
    'kddddddddddddddddddddk',
    'kdddccccccccccccccdddk',
    'kdddccccccccccccccdddk',
    'kddddddddddddddddddddk',
    'kdddccccccccccccccdddk',
    'kddddddddddddddddddddk',
    'kkkkkkkkkkkkkkkkkkkkkk',
  ]
  const side = [
    '...kkkkkkkk',
    '..kcccdddck',
    '.kccccdddck',
    'kccccccddck',
    'kcccccccddk',
    'kccccccddck',
    '.kccccdddck',
    '..kccccccck',
    '...kkkkkkkk',
  ]
  const rows = facing === 'n' ? north : facing === 's' ? south : side
  return paint(`cape-${facing}`, rows, { '.': '', k: ink, c: '#2f6fd0', d: '#1d4e9c' })
}

function stampDisc(grid: string[][], cx: number, cy: number, rx: number, ry: number, color: string): void {
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < (grid[0]?.length ?? 0); x += 1) {
      const nx = (x + 0.5 - cx) / rx
      const ny = (y + 0.5 - cy) / ry
      if (nx * nx + ny * ny <= 1) grid[y]![x] = color
    }
  }
}

function outlineGrid(grid: string[][]): string[] {
  const h = grid.length
  const w = grid[0]?.length ?? 0
  const next = grid.map((row) => row.slice())
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if ((grid[y]?.[x] ?? '.') !== '.') continue
      const touch = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (grid[y + (dy ?? 0)]?.[x + (dx ?? 0)] ?? '.') !== '.')
      if (touch) next[y]![x] = 'k'
    }
  }
  return next.map((row) => row.join(''))
}

/** Golden Squeek hamster in an open helm. Frame 0 idle, 1–2 walk, 3 dodge tuck. */
export function knightBust(facing: 'n' | 'e' | 's' | 'w', frame = 0): HTMLCanvasElement {
  const W = 26
  const H = 30
  const grid = Array.from({ length: H }, () => Array<string>(W).fill('.'))
  const side = facing === 'e' || facing === 'w'
  const lift = frame === 1 ? -1 : frame === 2 ? 1 : 0
  if (facing === 'n') {
    stampDisc(grid, 8, 5, 3.2, 3.4, 'g')
    stampDisc(grid, 17, 5, 3.2, 3.4, 'g')
    stampDisc(grid, 8, 5, 1.4, 1.8, 'p')
    stampDisc(grid, 17, 5, 1.4, 1.8, 'p')
    stampDisc(grid, 12.5, 13, 8, 6.5, 'd')
    stampDisc(grid, 12.5, 12, 6, 4, 'g')
    stampDisc(grid, 12.5, 8, 6, 1.2, 's')
    stampDisc(grid, 12.5, 23 + lift * 0.2, 6.5, 5, 'g')
    stampDisc(grid, 12.5, 22, 4, 2.4, 's')
  } else if (!side) {
    stampDisc(grid, 7, 5, 3.1, 3.3, 'g')
    stampDisc(grid, 18, 5, 3.1, 3.3, 'g')
    stampDisc(grid, 7, 5.2, 1.5, 1.8, 'p')
    stampDisc(grid, 18, 5.2, 1.5, 1.8, 'p')
    stampDisc(grid, 12.5, 14, 9, 7.2, 'd')
    stampDisc(grid, 12.5, 13.5, 7.4, 6, 'g')
    stampDisc(grid, 6.5, 15, 2.4, 2, 'c')
    stampDisc(grid, 18.5, 15, 2.4, 2, 'c')
    stampDisc(grid, 12.5, 16, 4.2, 3, 'm')
    stampDisc(grid, 9.2, 13, 1.5, 1.7, 'e')
    stampDisc(grid, 15.8, 13, 1.5, 1.7, 'e')
    grid[12]![8] = 'w'
    grid[12]![15] = 'w'
    stampDisc(grid, 12.5, 15.2, 1.1, 0.8, 'n')
    grid[17]![11] = 'w'
    grid[17]![13] = 'w'
    grid[18]![11] = 'w'
    grid[18]![13] = 'w'
    stampDisc(grid, 12.5, 9.2, 6.2, 1.3, 's')
    stampDisc(grid, 12.5, 23.5, 6.2, 4.6, 'g')
    stampDisc(grid, 12.5, 24.5, 3.6, 2.6, 'b')
    stampDisc(grid, 12.5, 22.2, 4.2, 2.5, 's')
    grid[26]![8] = 'g'
    grid[26]![16] = 'g'
    if (frame === 1) grid[27]![7] = 'd'
    if (frame === 2) grid[27]![17] = 'd'
  } else {
    stampDisc(grid, 16, 5, 3, 3.2, 'g')
    stampDisc(grid, 16, 5.2, 1.4, 1.7, 'p')
    stampDisc(grid, 14, 14, 7, 6.4, 'd')
    stampDisc(grid, 15, 13.5, 5.5, 5, 'g')
    stampDisc(grid, 18, 15, 2.6, 2.2, 'm')
    stampDisc(grid, 12.5, 12.5, 1.4, 1.6, 'e')
    grid[11]![12] = 'w'
    stampDisc(grid, 19.2, 15, 0.9, 0.7, 'n')
    grid[16]![20] = 'w'
    grid[17]![20] = 'w'
    stampDisc(grid, 14, 8.5, 4, 1.1, 's')
    stampDisc(grid, 13, 23, 5.5, 4.2, 'g')
    stampDisc(grid, 14, 22, 3.2, 2.2, 's')
    grid[26]![10 + lift] = 'd'
  }
  if (frame === 3) {
    for (let y = 0; y < 3; y += 1) grid[y] = Array<string>(W).fill('.')
  }
  return paint(`ham-${facing === 'w' ? 'e' : facing}-${frame}`, outlineGrid(grid), {
    '.': '',
    k: ink,
    g: '#f2c04a',
    d: '#e09820',
    c: '#f6d35a',
    m: '#f8e7b0',
    p: '#f4b8c4',
    e: '#24180f',
    w: '#f7fbff',
    n: '#e07a9a',
    s: '#e7eef6',
    b: '#f3d98a',
  })
}

export function hamsterDown(): HTMLCanvasElement {
  const W = 30
  const H = 16
  const grid = Array.from({ length: H }, () => Array<string>(W).fill('.'))
  stampDisc(grid, 8, 6, 3, 3, 'g')
  stampDisc(grid, 8, 6, 1.3, 1.5, 'p')
  stampDisc(grid, 16, 8, 7, 5, 'g')
  stampDisc(grid, 18, 8, 2, 1.5, 'm')
  grid[7]![14] = 'e'
  grid[9]![20] = 'w'
  stampDisc(grid, 16, 8, 3, 1, 's')
  return paint('ham-down', outlineGrid(grid), {
    '.': '',
    k: ink,
    g: '#f2c04a',
    p: '#f4b8c4',
    m: '#f8e7b0',
    e: '#24180f',
    w: '#f7fbff',
    s: '#e7eef6',
  })
}

export function mawSprite(): HTMLCanvasElement {
  const rows = [
    '......kkkkkk......',
    '....kkggggggkk....',
    '...kgglggggggk....',
    '..kggggggggggggk..',
    '..kgggkkkkkkgggk..',
    '.kgggkttttttkgggk.',
    '.kggkttwwttttkggk.',
    '.kggkddddddddkggk.',
    '..kgkkddddddkkggk.',
    '..kggkkkkkkkkggk..',
    '...kgggggggggk....',
    '....kkkkkkkkkk....',
    '.....k..kk..k.....',
  ]
  return paint('maw', rows, { '.': '', k: ink, g: '#5f8a62', l: '#8aaf86', d: '#24180f', w: '#f7fbff', t: '#e7d7a4' })
}

export function wingMembrane(): HTMLCanvasElement {
  const rows = [
    '....cccccc.',
    '..ccccccccc',
    '.cccccccccc',
    'ccccccccccc',
    '.ccccccccc.',
    '..ccccccc..',
  ]
  return paint('wing', rows, { '.': '', c: '#d5c6ae', k: '#8d6a32' })
}

export function eyeBody(): HTMLCanvasElement {
  const rows = [
    '..kkkkkk..',
    '.kcccccck.',
    'kchhhhhck.',
    'kchwwwwhk.',
    'kchwpwphk.',
    'kchwwwwhk.',
    '.kchhhhck.',
    '..kkkkkk..',
  ]
  return paint('eye', rows, { '.': '', k: ink, c: '#8d6a32', h: '#e7c27a', w: '#f7fbff', p: '#14181c' })
}

export function blit(ctx: Pen, art: HTMLCanvasElement, x: number, y: number, scale: number): void {
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(art, Math.round(x), Math.round(y), Math.round(art.width * scale), Math.round(art.height * scale))
}

export function drawAssetSheet(ctx: Pen, width: number, height: number): void {
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#101418'
  ctx.fillRect(0, 0, width, height)
  const arts: Array<[string, HTMLCanvasElement]> = [
    ['kayu sambungan', timberTile(0, 0)],
    ['kayu simpul', timberTile(1, 1)],
    ['tanah bijih', mineTile(1, 0)],
    ['lantai logam', mineTile(4, 3)],
    ['bata retak', ruinTile(0, 0)],
    ['bata lumut', ruinTile(0, 1)],
    ['batu sisi', rockRim(0)],
    ['batu lumut', rockRim(1)],
    ['pipa', pipeRun()],
    ['kabel', cableRun()],
    ['lampu', lampHousing()],
    ['mesin', machineSprite()],
    ['peti', chestSprite(false)],
    ['peti buka', chestSprite(true)],
    ['perban', lootIcon('bandage')],
    ['tonik', lootIcon('tonic')],
    ['besi', lootIcon('scrap')],
    ['bijih', lootIcon('ore')],
    ['relik', lootIcon('relic')],
    ['pecahan', lootIcon('shard')],
    ['hamster depan', knightBust('s', 0)],
    ['hamster jalan', knightBust('s', 1)],
    ['hamster sisi', knightBust('e', 0)],
    ['hamster punggung', knightBust('n', 0)],
    ['hamster rebah', hamsterDown()],
    ['jubah', knightCape('s')],
    ['mulut', mawSprite()],
    ['mata', eyeBody()],
    ['sayap', wingMembrane()],
  ]
  arts.forEach(([label, art], index) => {
    const col = index % 7
    const row = Math.floor(index / 7)
    const x = 18 + col * 108
    const y = 36 + row * 124
    ctx.fillStyle = '#1c242c'
    ctx.fillRect(x - 6, y - 16, 100, 112)
    blit(ctx, art, x, y, 4)
    ctx.fillStyle = '#d5dee6'
    ctx.font = '11px Courier New, monospace'
    ctx.fillText(label, x, y - 4)
  })
}
