import { addReserve, armShield, attackGap, chooseUpgrade, createRun, critChance, damageOf, dodgeGap, reachOf, RESERVE_MAX, scriptedStep, speedOf, step, stormRadius, UPGRADES, upgradePreview, type BonusMode, type Input, type RunState, type UpgradeId, type WeaponLook } from './sim.ts'
import { loadArena, loadBonusMode, loadLiveBest, PIXEL_VIEW_KEY, writeArena, writeBonusMode, writeLiveBest } from './save.ts'
import { cardSignature } from './pick.ts'
import { applyWheelBody, createWheelSession, resetWheelBaseline, STATUS_URL, unavailableDecision, type WheelDecision } from './wheel.ts'
import { drawPixel, setPixelZoom } from './pixel.ts'
import { createArenaStage, type ArenaStage } from './view3d.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#arena')
const canvas3d = document.querySelector<HTMLCanvasElement>('#arena3d')
const hud = document.querySelector<HTMLElement>('#hud')
if (!canvas || !canvas3d || !hud) throw new Error('Arena tidak ada')
const glCanvas: HTMLCanvasElement = canvas3d
const board: HTMLCanvasElement = canvas
const root: HTMLElement = hud
const ctx = board.getContext('2d')
if (!ctx) throw new Error('Kanvas tidak ada')
const pen = ctx
const stage: ArenaStage | null = createArenaStage(glCanvas)

const storage = probe()
let best = loadArena(storage).bestWave
let liveBest = loadLiveBest(storage)
let look: WeaponLook = 'pedang'
let run = createRun()
run.bonusMode = loadBonusMode(storage)
const wheel = createWheelSession()
let decision: WheelDecision = unavailableDecision('belum dibaca')
let paused = false
const keys = new Set<string>()
let stickX = 0
let stickY = 0
let stickId = -1
let dodgeDown = false
let stormDown = false
let dodgeTap = false
let stormTap = false
let dodgePointer = -1
let stormPointer = -1
let dodgeSeen = 0
let stormSeen = 0
let denyUntil = 0

const waveText = must('waveText')
const bestText = must('bestText')
const hpFill = must('hpFill')
const stormFill = must('stormFill')
const message = must('message')
const coinsText = must('coinsText')
const pick = must('pick')
const cards = must('cards')
const end = must('end')
const endTitle = must('endTitle')
const endBody = must('endBody')
const stick = must('stick')

bindHold(mustBtn('dodgeBtn'), 'dodge')
bindHold(mustBtn('stormBtn'), 'storm')
mustBtn('pauseBtn').addEventListener('click', () => { paused = !paused; render() })
mustBtn('againBtn').addEventListener('click', () => {
  run = createRun()
  run.weapon = look
  run.bonusMode = loadBonusMode(storage)
  paused = false
  end.hidden = true
  render()
})
mustBtn('pedangBtn').addEventListener('click', () => setLook('pedang'))
mustBtn('tombakBtn').addEventListener('click', () => setLook('tombak'))
mustBtn('modeStorm').addEventListener('click', () => setMode('storm'))
mustBtn('modeShield').addEventListener('click', () => setMode('shield'))
mustBtn('armShield').addEventListener('click', () => { armShield(run); render() })

stick.addEventListener('pointerdown', (event) => {
  stickId = event.pointerId
  try { stick.setPointerCapture(event.pointerId) } catch { /* synthetic */ }
  placeStick(event)
})
stick.addEventListener('pointermove', (event) => { if (event.pointerId === stickId) placeStick(event) })
const releaseStick = (event: PointerEvent) => {
  if (event.pointerId !== stickId) return
  stickId = -1
  stickX = 0
  stickY = 0
  const knob = document.querySelector<HTMLElement>('#knob')
  if (knob) knob.style.transform = 'translate(0px, 0px)'
}
stick.addEventListener('pointerup', releaseStick)
stick.addEventListener('pointercancel', releaseStick)
stick.addEventListener('lostpointercapture', releaseStick)

window.addEventListener('keydown', (event) => {
  keys.add(event.code)
  if (event.code === 'Escape') paused = !paused
  if (event.code === 'KeyQ') armShield(run)
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault()
})
window.addEventListener('keyup', (event) => keys.delete(event.code))
window.addEventListener('contextmenu', (event) => event.preventDefault())
window.addEventListener('pointerdown', (event) => {
  if (event.button === 2) armDodge()
})
window.addEventListener('pointerup', (event) => {
  if (event.button === 2) dodgeDown = false
  releasePointer(event.pointerId)
})
window.addEventListener('pointercancel', (event) => releasePointer(event.pointerId))
window.addEventListener('blur', () => {
  keys.clear()
  dodgeDown = false
  stormDown = false
  dodgeTap = false
  stormTap = false
  dodgePointer = -1
  stormPointer = -1
  stickX = 0
  stickY = 0
  stickId = -1
})

let mode3d = stage !== null && storage?.getItem(PIXEL_VIEW_KEY) === '3d'
applyView()
mustBtn('viewBtn').addEventListener('click', () => {
  if (!stage) return
  mode3d = !mode3d
  try { storage?.setItem(PIXEL_VIEW_KEY, mode3d ? '3d' : 'pixel') } catch { /* ignore */ }
  applyView()
  render()
})

const detail = document.getElementById('detail')
mustBtn('detailBtn').addEventListener('click', () => {
  if (!detail) return
  detail.hidden = !detail.hidden
})

let sqkOn = false
mustBtn('sqkBtn').addEventListener('click', () => {
  const host = must('web3Host')
  sqkOn = !sqkOn
  host.hidden = !sqkOn
})

function applyView(): void {
  board.classList.toggle('is-off', mode3d)
  glCanvas.classList.toggle('is-off', !mode3d)
  const button = document.getElementById('viewBtn')
  if (!button) return
  if (!stage) {
    button.setAttribute('disabled', 'true')
    button.textContent = '2D saja'
    return
  }
  button.removeAttribute('disabled')
    button.textContent = mode3d ? 'Pixel' : '3D'
}

function placeStick(event: PointerEvent): void {
  const rect = stick.getBoundingClientRect()
  const dx = event.clientX - (rect.left + rect.width / 2)
  const dy = event.clientY - (rect.top + rect.height / 2)
  const max = rect.width * 0.36
  const len = Math.hypot(dx, dy) || 1
  const scale = Math.min(1, max / len)
  stickX = (dx * scale) / max
  stickY = (dy * scale) / max
  const knob = document.querySelector<HTMLElement>('#knob')
  if (knob) knob.style.transform = `translate(${stickX * 28}px, ${stickY * 28}px)`
}

function armDodge(): void {
  dodgeDown = true
  dodgeTap = true
  dodgeSeen = performance.now()
}

function armStorm(): void {
  stormDown = true
  stormTap = true
  stormSeen = performance.now()
}

function releasePointer(id: number): void {
  if (id === dodgePointer) {
    dodgePointer = -1
    dodgeDown = false
  }
  if (id === stormPointer) {
    stormPointer = -1
    stormDown = false
  }
}

function bindHold(button: HTMLButtonElement, kind: 'dodge' | 'storm'): void {
  const arm = () => { if (kind === 'dodge') armDodge(); else armStorm() }
  const release = () => { if (kind === 'dodge') dodgeDown = false; else stormDown = false }
  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    arm()
    if (kind === 'dodge') dodgePointer = event.pointerId
    else stormPointer = event.pointerId
    try { button.setPointerCapture(event.pointerId) } catch { /* synthetic or unsupported */ }
  })
  button.addEventListener('pointerup', release)
  button.addEventListener('pointercancel', release)
  button.addEventListener('lostpointercapture', release)
  button.addEventListener('touchstart', (event) => {
    if (event.cancelable) event.preventDefault()
    arm()
  }, { passive: false })
  button.addEventListener('touchend', release)
  button.addEventListener('touchcancel', release)
  button.addEventListener('click', () => {
    const seen = kind === 'dodge' ? dodgeSeen : stormSeen
    if (performance.now() - seen < 500) return
    if (kind === 'dodge') dodgeTap = true
    else stormTap = true
  })
}

function deny(id: string): void {
  document.getElementById(id)?.classList.add('is-deny')
  denyUntil = performance.now() + 500
}

function paintAction(button: HTMLButtonElement, down: boolean, waiting: boolean, ready: boolean, hint: string): void {
  button.classList.toggle('is-down', down)
  button.classList.toggle('is-wait', waiting)
  button.classList.toggle('is-ready', ready)
  if (performance.now() > denyUntil) button.classList.remove('is-deny')
  const small = button.querySelector('small')
  if (small) small.textContent = hint
}

function input(): Input {
  let mx = stickX
  let my = stickY
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1
  if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1
  if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1
  return {
    moveX: mx,
    moveY: my,
    dodge: dodgeDown || dodgeTap || keys.has('Space'),
    storm: stormDown || stormTap || keys.has('KeyE'),
  }
}

function render(): void {
  const play = must('play')
  const width = Math.max(1, play.clientWidth)
  const height = Math.max(1, play.clientHeight)
  const bar = document.getElementById('topbar')?.getBoundingClientRect().height ?? 72
  const wide = width > height
  const stickBox = document.getElementById('stick')?.getBoundingClientRect()
  const actionBox = document.getElementById('actions')?.getBoundingClientRect()
  const inset = {
    top: bar + 8,
    bottom: wide ? 10 : (stickBox?.height ?? 96) + 18,
    left: wide ? (stickBox?.width ?? 120) + 18 : 10,
    right: wide ? (actionBox?.width ?? 160) + 18 : 10,
  }
  if (mode3d && stage) {
    stage.render(run, width, height, inset)
  } else {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    if (board.width !== Math.round(width * dpr) || board.height !== Math.round(height * dpr)) {
      board.width = Math.round(width * dpr)
      board.height = Math.round(height * dpr)
    }
    pen.setTransform(dpr, 0, 0, dpr, 0, 0)
    pen.imageSmoothingEnabled = false
    drawPixel(pen, run, width, height, inset)
  }
  waveText.textContent = run.phase === 'victory' ? 'Menang · 10' : `Gelombang ${run.wave}`
  bestText.textContent = `Latihan ${best} · Roda ${liveBest}`
  const reserveFill = document.getElementById('reserveFill')
  if (reserveFill) reserveFill.style.width = `${(run.reserve / RESERVE_MAX) * 100}%`
  const wheelState = document.getElementById('wheelState')
  const wheelMeta = document.getElementById('wheelMeta')
  if (wheelState) wheelState.textContent = feedLine(decision)
  if (wheelMeta) {
    const source = decision.provenance ? `Sumber ${decision.provenance}.` : 'Tanpa measurement.'
    wheelMeta.textContent = `${decision.detail} ${source} Cadangan ${run.reserve}/${RESERVE_MAX}. Bukan proyeksi.`
  }
  const arm = document.getElementById('armShield')
  if (arm) arm.hidden = run.bonusMode !== 'shield'
  mustBtn('modeStorm').setAttribute('aria-pressed', run.bonusMode === 'storm' ? 'true' : 'false')
  mustBtn('modeShield').setAttribute('aria-pressed', run.bonusMode === 'shield' ? 'true' : 'false')
  hpFill.style.width = `${(run.hp / run.maxHp) * 100}%`
  stormFill.style.width = `${(run.storm / run.stormMax) * 100}%`
  paintAction(mustBtn('dodgeBtn'), dodgeDown, run.dodgeCd > 0.05 && run.dodgeLeft <= 0, false, run.dodgeLeft > 0 ? 'kebal' : run.dodgeCd > 0.05 ? `${run.dodgeCd.toFixed(1)} dtk` : 'siap')
  paintAction(mustBtn('stormBtn'), stormDown, run.storm + 0.001 < run.stormMax, run.storm + 0.001 >= run.stormMax, run.storm + 0.001 >= run.stormMax ? 'siap' : 'belum penuh')
  message.textContent = paused && run.phase === 'fight' ? 'Jeda. Esc atau tombol Jeda untuk lanjut.' : run.message
  const statLine = document.getElementById('statLine')
  if (statLine) {
    const n = (value: number) => {
      const rounded = Math.round(value * 100) / 100
      return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0$/, '')
    }
    statLine.textContent = `Tebas ${n(damageOf(run))} · jeda ${n(attackGap(run))}s · gerak ${n(speedOf(run))} · capai ${n(reachOf(run))} · hindar ${n(dodgeGap(run))}s · kritik ${n(critChance(run) * 100)}% · badai ${n(stormRadius(run))} isi ${run.stormMax}`
  }
  coinsText.textContent = `${run.coins} remah latihan`
  pick.hidden = run.phase !== 'pick'
  end.hidden = run.phase !== 'dead' && run.phase !== 'victory'
  syncCards()
  if (run.phase === 'dead' || run.phase === 'victory') {
    endTitle.textContent = run.phase === 'victory' ? 'Arena beres' : 'Kalah'
    endBody.textContent = run.phase === 'victory'
      ? `Gelombang 10. Rekor lokal ${best}. Bukan hadiah rantai.`
      : `Sampai gelombang ${run.cleared}. Rekor lokal ${best}. Nyawa tidak pulih di tengah lari.`
  }
}

let paintedOffers = ''

function syncCards(): void {
  const key = cardSignature(run.phase, run.offers, run.stacks)
  if (key === paintedOffers) return
  paintedOffers = key
  cards.replaceChildren()
  if (run.phase !== 'pick') return
  for (const id of run.offers) {
    const spec = UPGRADES.find((item) => item.id === id)
    if (!spec) continue
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.upgrade = id
    button.textContent = `${spec.name} · ${spec.detail} (${run.stacks[id]}/${spec.max}) · ${upgradePreview(run, id)}`
    cards.append(button)
  }
}

function upgradeFromTarget(target: EventTarget | null): UpgradeId | null {
  if (!(target instanceof Element)) return null
  const button = target.closest('button[data-upgrade]')
  const id = button?.getAttribute('data-upgrade')
  if (!id || !run.offers.includes(id as UpgradeId)) return null
  return id as UpgradeId
}

function takeUpgrade(event: Event): void {
  const id = upgradeFromTarget(event.target)
  if (!id) return
  if (chooseUpgrade(run, id)) render()
}

cards.addEventListener('pointerup', takeUpgrade)
cards.addEventListener('click', takeUpgrade)
cards.addEventListener('touchend', (event) => {
  const touch = event.changedTouches[0]
  if (!touch) return
  const node = document.elementFromPoint(touch.clientX, touch.clientY)
  const id = upgradeFromTarget(node)
  if (!id) return
  if (chooseUpgrade(run, id)) render()
})

function noteEnd(): void {
  if (run.cleared <= 0) return
  if (run.liveAssisted) {
    if (run.cleared > liveBest) {
      liveBest = run.cleared
      writeLiveBest(storage, liveBest)
    }
    return
  }
  if (run.cleared > best) {
    best = run.cleared
    writeArena(storage, { bestWave: best })
  }
}

let noted = false
let last = performance.now()
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  const sample = input()
  const risingDodge = sample.dodge && !run.dodgeHeld
  const risingStorm = sample.storm && !run.stormHeld
  const dodgeBefore = run.dodgeLeft
  const stormBefore = run.storm
  const cdBefore = run.dodgeCd
  if (!paused && (run.phase === 'fight')) {
    step(run, sample, dt)
    if (!dodgeDown) dodgeTap = false
    if (!stormDown) stormTap = false
    if (risingDodge && run.dodgeLeft === dodgeBefore && cdBefore > 0.02) deny('dodgeBtn')
    if (risingStorm && Math.abs(run.storm - stormBefore) < 0.001 && stormBefore + 0.001 < run.stormMax) deny('stormBtn')
  }
  if ((run.phase === 'dead' || run.phase === 'victory') && !noted) {
    noted = true
    noteEnd()
  }
  if (run.phase === 'fight' || run.phase === 'pick') noted = false
  render()
  requestAnimationFrame(frame)
}
window.addEventListener('resize', () => render())
requestAnimationFrame(frame)

const hook = window as Window & {
  __arena?: {
    state: () => RunState
    best: () => number
    scripted: typeof scriptedStep
    setPaused: (value: boolean) => void
    step: (input: Input, dt: number) => void
    feed: () => WheelDecision
    view: () => 'pixel' | '3d'
    gl: () => { calls: number; triangles: number } | null
    setHeroClose: (value: boolean) => void
    setPixelZoom: (value: number) => void
  }
}
hook.__arena = {
  state: () => run,
  best: () => best,
  scripted: scriptedStep,
  setPaused: (value) => { paused = value },
    step: (next, dt) => step(run, next, dt),
    feed: () => decision,
    view: () => (mode3d && stage ? '3d' : 'pixel'),
    gl: () => (stage ? stage.info() : null),
    setHeroClose: (value) => stage?.setHeroClose(value),
    setPixelZoom: (value: number) => setPixelZoom(value),
  }

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    resetWheelBaseline(wheel)
    decision = { ...decision, detail: 'Tab latar. Garis dasar direset.' }
  }
})

async function pollWheel(): Promise<void> {
  if (document.hidden) return
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(STATUS_URL, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    const text = await response.text()
    let body: unknown = null
    try { body = JSON.parse(text) } catch { body = null }
    if (response.status === 304) return
    decision = applyWheelBody(wheel, body, Date.now(), response.status)
    addReserve(run, decision.energy)
  } catch {
    decision = unavailableDecision('jaringan atau waktu habis')
  } finally {
    clearTimeout(timer)
  }
}

void pollWheel()
window.setInterval(() => void pollWheel(), 12000)

function setMode(next: BonusMode): void {
  run.bonusMode = next
  writeBonusMode(storage, next)
  render()
}

function feedLine(item: WheelDecision): string {
  const when = item.readAt ? item.readAt.slice(11, 19) + 'Z' : 'tanpa waktu'
  if (item.feed === 'running') return `Roda berputar · ${when}`
  if (item.feed === 'resting') return `Roda online, istirahat · RPM ${item.rpm ?? 0} · ${when}`
  if (item.feed === 'stale') return `Roda basi · ${when}`
  return `Roda tidak terbaca · ${item.detail}`
}

function setLook(next: WeaponLook): void {
  look = next
  run.weapon = next
  mustBtn('pedangBtn').setAttribute('aria-pressed', next === 'pedang' ? 'true' : 'false')
  mustBtn('tombakBtn').setAttribute('aria-pressed', next === 'tombak' ? 'true' : 'false')
}

function must(id: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(`#${id}`) ?? document.getElementById(id)
  if (!found) throw new Error(`#${id} hilang`)
  return found
}

function mustBtn(id: string): HTMLButtonElement {
  return must(id) as HTMLButtonElement
}

function probe(): Storage | null {
  try {
    localStorage.setItem('__arena__', '1')
    localStorage.removeItem('__arena__')
    return localStorage
  } catch {
    return null
  }
}
