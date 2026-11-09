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
