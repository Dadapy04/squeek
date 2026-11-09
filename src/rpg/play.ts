import { createRuinView } from './view.ts'
import { createRpg, step, toSave, type Input, type RpgState } from './sim.ts'
import { loadRpg, writeRpg, type RpgSave } from './save.ts'

export function startPlay(canvas: HTMLCanvasElement, hud: HTMLElement, onExit: () => void): { stop: () => void } {
  const storage = probe()
  let save = loadRpg(storage)
  let state = createRpg(save)
  const view = createRuinView(canvas)
  const keys = new Set<string>()
  let yaw = 0
  let stickX = 0
  let stickY = 0
  let attack = false
  let skill = false
  let lookId = -1
  let lookX = 0
  let pointer = -1
  const queued = { dodge: false, interact: false }
  let alive = true
  let noted = false

  const stick = must<HTMLElement>(hud, 'rpgStick')
  const attackBtn = must<HTMLButtonElement>(hud, 'rpgAttack')
  const skillBtn = must<HTMLButtonElement>(hud, 'rpgSkill')
  const dodgeBtn = must<HTMLButtonElement>(hud, 'rpgDodge')
  const useBtn = must<HTMLButtonElement>(hud, 'rpgUse')
  const message = must<HTMLElement>(hud, 'rpgMessage')
  const hp = must<HTMLElement>(hud, 'rpgHp')
  const focus = must<HTMLElement>(hud, 'rpgFocus')
  const coach = must<HTMLElement>(hud, 'rpgCoach')
  const end = must<HTMLElement>(hud, 'rpgEnd')
  const endTitle = must<HTMLElement>(hud, 'rpgEndTitle')
  const endBody = must<HTMLElement>(hud, 'rpgEndBody')
  const again = must<HTMLButtonElement>(hud, 'rpgAgain')
  const leave = must<HTMLButtonElement>(hud, 'rpgLeave')

  if (storage?.getItem('npcs-burrow-rpg.coach') === '1') coach.hidden = true
  must<HTMLButtonElement>(hud, 'rpgCoachOk').addEventListener('click', () => {
    coach.hidden = true
    storage?.setItem('npcs-burrow-rpg.coach', '1')
  })
  hold(attackBtn, (down) => { attack = down })
  hold(skillBtn, (down) => { skill = down })
  dodgeBtn.addEventListener('pointerdown', (event) => { event.preventDefault(); queued.dodge = true })
  useBtn.addEventListener('pointerdown', (event) => { event.preventDefault(); queued.interact = true })
  again.addEventListener('click', () => {
    save = loadRpg(storage)
    save.bossDefeated = false
    writeRpg(storage, save)
    state = createRpg(save)
    noted = false
    end.hidden = true
  })
  leave.addEventListener('click', () => onExit())

  stick.addEventListener('pointerdown', (event) => {
    pointer = event.pointerId
    try { stick.setPointerCapture(event.pointerId) } catch { /* synthetic */ }
    moveStick(event)
  })
  stick.addEventListener('pointermove', (event) => { if (event.pointerId === pointer) moveStick(event) })
  const releaseStick = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return
    pointer = -1
    stickX = 0
    stickY = 0
  }
  stick.addEventListener('pointerup', releaseStick)
  stick.addEventListener('pointercancel', releaseStick)
  stick.addEventListener('lostpointercapture', releaseStick)

  canvas.addEventListener('pointerdown', (event) => {
    if ((event.target as HTMLElement).closest('button, #rpgStick')) return
    lookId = event.pointerId
    lookX = event.clientX
  })
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerId !== lookId) return
    yaw -= (event.clientX - lookX) * 0.006
    lookX = event.clientX
  })
  canvas.addEventListener('pointerup', (event) => { if (event.pointerId === lookId) lookId = -1 })
  canvas.addEventListener('pointercancel', (event) => { if (event.pointerId === lookId) lookId = -1 })

  const onKeyDown = (event: KeyboardEvent) => {
    keys.add(event.code)
    if (event.code === 'Space') queued.dodge = true
    if (event.code === 'KeyE') queued.interact = true
    if (event.code === 'Escape') onExit()
  }
  const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  const onBlur = () => { keys.clear(); attack = false; skill = false; stickX = 0; stickY = 0; lookId = -1; pointer = -1 }
  window.addEventListener('blur', onBlur)

  let last = performance.now()
  function frame(now: number): void {
    if (!alive) return
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const input = readInput()
    step(state, input, dt)
    queued.dodge = false
    queued.interact = false
    if (state.phase !== 'play') {
      if (!noted) {
        noted = true
        save = toSave(state)
        writeRpg(storage, save)
      }
      end.hidden = false
      endTitle.textContent = state.phase === 'victory' ? 'Penjaga runtuh' : 'Jatuh di gua'
      endBody.textContent = state.phase === 'victory' ? 'Loot tetap tersimpan. Bukan token rantai.' : 'Nyawa kembali di catatan. Perlengkapan tidak hilang.'
    } else end.hidden = true
    message.textContent = state.message
    hp.textContent = `${Math.ceil(state.hp)}/${state.maxHp}`
    focus.textContent = `${Math.floor(state.focus)}`
    useBtn.hidden = !state.nearChest
    view?.sync(state, dt)
    requestAnimationFrame(frame)
  }
  view?.resize()
  requestAnimationFrame(frame)
  const onResize = () => view?.resize()
  window.addEventListener('resize', onResize)

  function readInput(): Input {
    let moveX = stickX
    let moveY = stickY
    if (keys.has('KeyA')) moveX -= 1
    if (keys.has('KeyD')) moveX += 1
    if (keys.has('KeyW')) moveY -= 1
    if (keys.has('KeyS')) moveY += 1
    const fx = Math.sin(yaw)
    const fz = -Math.cos(yaw)
    const rx = Math.cos(yaw)
    const rz = Math.sin(yaw)
    const forward = -moveY
    const strafe = moveX
    return {
      moveX: strafe * rx + forward * fx,
      moveY: strafe * rz + forward * fz,
      attack: attack || keys.has('KeyJ'),
      skill: skill || keys.has('KeyK'),
      dodge: queued.dodge,
      interact: queued.interact,
      yaw,
    }
  }

  function moveStick(event: PointerEvent): void {
    const rect = stick.getBoundingClientRect()
    const dx = event.clientX - (rect.left + rect.width / 2)
    const dy = event.clientY - (rect.top + rect.height / 2)
    const max = rect.width * 0.38
    const len = Math.hypot(dx, dy) || 1
    const scale = Math.min(1, max / len)
    stickX = (dx * scale) / max
    stickY = (dy * scale) / max
  }

  const hook = window as Window & { __burrow?: { state: () => RpgState; save: () => RpgSave } }
  hook.__burrow = { state: () => state, save: () => toSave(state) }

  return {
    stop: () => {
      alive = false
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('resize', onResize)
      view?.dispose()
      delete hook.__burrow
    },
  }
}

function hold(button: HTMLButtonElement, set: (down: boolean) => void): void {
  const down = (event: PointerEvent) => {
    event.preventDefault()
    try { button.setPointerCapture(event.pointerId) } catch { /* synthetic */ }
    set(true)
  }
  const up = () => set(false)
  button.addEventListener('pointerdown', down)
  button.addEventListener('pointerup', up)
  button.addEventListener('pointercancel', up)
  button.addEventListener('lostpointercapture', up)
}

function must<T extends HTMLElement>(root: ParentNode, id: string): T {
  const found = root.querySelector(`#${id}`)
  if (!found) throw new Error(`#${id} hilang`)
  return found as T
}

function probe(): Storage | null {
  try {
    localStorage.setItem('__burrow__', '1')
    localStorage.removeItem('__burrow__')
    return localStorage
  } catch {
    return null
  }
}
