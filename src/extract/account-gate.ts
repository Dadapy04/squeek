/** Who the screen is playing as. A guest run must not be replaced by a late wallet restore. */

export interface AccountView {
  presence: 'guest' | 'wallet'
  address: string | null
  name: string | null
}

export interface GateState {
  settled: boolean
  inRun: boolean
  current: AccountView
  deferred: AccountView | null
}

export type SessionEvent =
  | { type: 'settled' }
  | { type: 'restored'; address: string; name: string | null }
  | { type: 'dropped' }
  | { type: 'reconnected'; address: string; name: string | null }
  | { type: 'explicit-connect'; address: string; name: string | null }
  | { type: 'explicit-disconnect' }

export interface GateResult {
  state: GateState
  /** Non-null only when the screen should switch accounts now. */
  apply: AccountView | null
  canDepart: boolean
}

const guest: AccountView = { presence: 'guest', address: null, name: null }

export function freshGate(): GateState {
  return { settled: false, inRun: false, current: guest, deferred: null }
}

export function reduceGate(state: GateState, event: SessionEvent): GateResult {
  if (event.type === 'settled') {
    const next = { ...state, settled: true }
    return finish(next, null)
  }
  if (event.type === 'dropped') return finish(state, null)
  if (event.type === 'reconnected') {
    if (sameWallet(state.current, event.address)) return finish(state, null)
    return offer(state, wallet(event.address, event.name))
  }
  if (event.type === 'restored' || event.type === 'explicit-connect') {
    return offer(state, wallet(event.address, event.name))
  }
  if (state.inRun) return finish(state, null)
  return finish({ ...state, current: guest, deferred: null }, guest)
}

export function setRunOpen(state: GateState, inRun: boolean): GateResult {
  if (inRun === state.inRun) return finish(state, null)
  if (inRun) return finish({ ...state, inRun: true }, null)
  if (!state.deferred) return finish({ ...state, inRun: false }, null)
  const apply = state.deferred
  return finish({ ...state, inRun: false, current: apply, deferred: null }, apply)
}

function offer(state: GateState, next: AccountView): GateResult {
  if (sameView(state.current, next)) return finish({ ...state, deferred: null }, null)
  if (state.inRun) return finish({ ...state, deferred: next }, null)
  return finish({ ...state, current: next, deferred: null }, next)
}

function wallet(address: string, name: string | null): AccountView {
  return { presence: 'wallet', address, name }
}

function sameWallet(view: AccountView, address: string): boolean {
  return view.presence === 'wallet' && view.address === address
}

function sameView(a: AccountView, b: AccountView): boolean {
  return a.presence === b.presence && a.address === b.address && a.name === b.name
}

function finish(state: GateState, apply: AccountView | null): GateResult {
  return { state, apply, canDepart: state.settled && !state.inRun }
}
