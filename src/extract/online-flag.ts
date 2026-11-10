/** Online features stay off until a build sets VITE_API_URL. GitHub Pages leaves it empty. */

export function apiUrl(raw = import.meta.env.VITE_API_URL): string {
  return typeof raw === 'string' ? raw.trim().replace(/\/$/, '') : ''
}

export function onlineEnabled(raw?: string): boolean {
  return apiUrl(raw ?? import.meta.env.VITE_API_URL) !== ''
}

export function walletConnectId(raw = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID): string {
  const id = typeof raw === 'string' ? raw.trim() : ''
  if (!id || id === 'REPLACE_ME') return ''
  return id
}

/** A landscape phone is short and not very wide. A desktop window is taller. */
export function phoneLayout(input: { width: number; height: number; coarse: boolean; ua: string }): boolean {
  if (/iPhone|iPad|iPod|Android/i.test(input.ua)) return true
  if (input.coarse && input.width < 1100) return true
  return input.width <= 900 && input.height <= 520
}

/** Phones with no injected wallet get a coming-soon note. Desktop still offers Connect wallet. */
export function walletOffer(input: { injected: boolean; mobile: boolean }): 'connect' | 'soon' {
  if (input.mobile && !input.injected) return 'soon'
  return 'connect'
}
