/** Pixel sizes for the landscape control cluster. CSS uses the same numbers. */

export const CONTROL_FIT = {
  bar: 36,
  note: 0,
  small: 44,
  sword: 74,
  gap: 8,
  surrender: 0,
  surrenderGap: 0,
  stick: 108,
  smallRows: 2,
  pad: 8,
}

export function controlsFit(height: number): { need: number; fits: boolean } {
  const arc = CONTROL_FIT.sword + CONTROL_FIT.small + CONTROL_FIT.gap
  const slots = 52
  const need = CONTROL_FIT.bar + arc + slots + CONTROL_FIT.pad
  return { need, fits: need <= height }
}

/** A control pinned by its right and bottom edges, in the action cluster's coordinates. */
export type ClusterBox = { id: string; right: number; bottom: number; w: number; h: number }

const PHONE: ClusterBox[] = [
  { id: 'attack', right: 0, bottom: 0, w: 74, h: 74 },
  { id: 'useItem', right: 86, bottom: 8, w: 44, h: 44 },
  { id: 'soul', right: 148, bottom: 18, w: 44, h: 44 },
  { id: 'dodge', right: 64, bottom: 64, w: 44, h: 44 },
  { id: 'block', right: 8, bottom: 86, w: 44, h: 44 },
  { id: 'open', right: 108, bottom: 108, w: 40, h: 40 },
  { id: 'support', right: 64, bottom: 116, w: 40, h: 40 },
  { id: 'bagSwap', right: 156, bottom: 110, w: 120, h: 36 },
  { id: 'claim', right: 156, bottom: 68, w: 168, h: 36 },
]

const SHORT: ClusterBox[] = [
  { id: 'attack', right: 0, bottom: 0, w: 64, h: 64 },
  { id: 'useItem', right: 74, bottom: 6, w: 44, h: 44 },
  { id: 'soul', right: 132, bottom: 12, w: 44, h: 44 },
  { id: 'dodge', right: 54, bottom: 54, w: 44, h: 44 },
  { id: 'block', right: 6, bottom: 74, w: 44, h: 44 },
  { id: 'open', right: 96, bottom: 92, w: 44, h: 44 },
  { id: 'support', right: 54, bottom: 100, w: 44, h: 44 },
  { id: 'bagSwap', right: 148, bottom: 98, w: 120, h: 32 },
  { id: 'claim', right: 148, bottom: 62, w: 148, h: 32 },
]

const DESK: ClusterBox[] = [
  { id: 'attack', right: 0, bottom: 0, w: 88, h: 88 },
  { id: 'useItem', right: 102, bottom: 10, w: 52, h: 52 },
  { id: 'soul', right: 168, bottom: 22, w: 52, h: 52 },
  { id: 'dodge', right: 76, bottom: 76, w: 52, h: 52 },
  { id: 'block', right: 10, bottom: 102, w: 52, h: 52 },
  { id: 'open', right: 128, bottom: 128, w: 52, h: 52 },
  { id: 'support', right: 76, bottom: 136, w: 52, h: 52 },
  { id: 'bagSwap', right: 188, bottom: 128, w: 140, h: 40 },
  { id: 'claim', right: 188, bottom: 80, w: 168, h: 40 },
]

export type ClusterMode = 'phone' | 'short' | 'desk'

export function clusterMode(width: number, height: number): ClusterMode {
  if (width >= 1200 && height >= 700) return 'desk'
  if (height <= 340) return 'short'
  return 'phone'
}

export function clusterBoxes(mode: ClusterMode): ClusterBox[] {
  if (mode === 'short') return SHORT
  if (mode === 'desk') return DESK
  return PHONE
}

function separated(a: ClusterBox, b: ClusterBox, gap: number): boolean {
  const aRight = a.right + a.w
  const bRight = b.right + b.w
  const aTop = a.bottom + a.h
  const bTop = b.bottom + b.h
  const clearX = a.right >= bRight + gap || b.right >= aRight + gap
  const clearY = a.bottom >= bTop + gap || b.bottom >= aTop + gap
  return clearX || clearY
}

/** Take sits with the sword cluster and stays below the Bag / Workshop / Base row. */
export function claimPlacement(width: number, height: number, hudRows = 1, safeBottom = 0): { clear: boolean; belowHud: boolean; bySword: boolean } {
  const mode = clusterMode(width, height)
  const boxes = clusterBoxes(mode)
  const claim = boxes.find((box) => box.id === 'claim')!
  const sword = boxes.find((box) => box.id === 'attack')!
  const others = boxes.filter((box) => box.id !== 'claim')
  const clear = others.every((box) => separated(claim, box, 4))
  const lift = (mode === 'short' ? 48 : 54) + safeBottom
  const claimTop = height - (lift + claim.bottom + claim.h)
  const shortcutBottom = CONTROL_FIT.bar * hudRows + 4 + 28
  const belowHud = claimTop >= shortcutBottom + 8
  const bySword = claim.right >= sword.right + sword.w && claim.bottom <= sword.bottom + sword.h + 16
  return { clear, belowHud, bySword }
}
