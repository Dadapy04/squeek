/** Frames the whole arena disc inside the HUD inset. Sim y maps to world z. */

export const STAGE_WORLD_FIT = 680

export interface StageInset {
  top: number
  right: number
  bottom: number
  left: number
}

export function stageFrame(width: number, height: number, inset: StageInset, worldFit = STAGE_WORLD_FIT): { viewW: number; viewH: number; frustumH: number; frustumW: number; units: number } {
  const viewW = Math.max(80, width - inset.left - inset.right)
  const viewH = Math.max(80, height - inset.top - inset.bottom)
  const units = worldFit / Math.min(viewW, viewH)
  const frustumH = units * height
  const frustumW = units * width
  return { viewW, viewH, frustumH, frustumW, units }
}

export function simToWorld(x: number, y: number, height = 0): { x: number; y: number; z: number } {
  return { x, y: height, z: y }
}
