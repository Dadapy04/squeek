/** Fixed sim step. A 120Hz frame banks time; a slow frame may catch up, but only a little. */

export const SIM_STEP = 1 / 60
export const MAX_FRAME = 0.05
export const MAX_STEPS = 3

export function takeFrames(bank: number, rawSeconds: number): { bank: number; steps: number; frameDt: number } {
  const frameDt = Number.isFinite(rawSeconds) && rawSeconds > 0 ? Math.min(rawSeconds, MAX_FRAME) : 0
  let next = Math.min(MAX_FRAME, Math.max(0, bank) + frameDt)
  let steps = 0
  while (next >= SIM_STEP - 1e-9 && steps < MAX_STEPS) {
    next -= SIM_STEP
    steps += 1
  }
  if (next < 1e-8) next = 0
  return { bank: next, steps, frameDt }
}
