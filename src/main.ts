import { BONUS_MAX, ITEM_NAME, SHOP, STAMINA_MAX, UPGRADE_NAME } from './balance.ts'
import { draw } from './draw.ts'
import { addBonus, createRun, deriveCombat, openCrate, step, takeBank, useBanked, useCarried, type Input, type RunState } from './run.ts'
import { buyUpgrade, loadMeta, probeStorage, saveMeta } from './save.ts'
import {
  POLL_MS,
  STATUS_URL,
  TIMEOUT_MS,
  anchorIsConfirmed,
  coreLabel,
  createSession,
  formatRpm,
  formatWib,
  ingest,
  makeDemoBody,
  nextDelayMs,
  parseStatus,
  projectedIsOptimistic,
  pullStatus,
  resetBaseline,
  submissionIsConfirmed,
  withFreshness,
  type ParsedStatus,
  type PullResult,
  type RewardDecision,
} from './telemetry.ts'
import type { Meta, UpgradeId } from './types.ts'
import { createSwordAudio } from './audio.ts'
import { WEAPON_ORDER, WEAPONS } from './guns.ts'
import { createTacticalView, type TacticalView } from './view3d.ts'
import { CAMPAIGN, zoneName } from './world.ts'

type LinkMode = 'loading' | 'live' | 'stale' | 'offline' | 'demo' | 'schema' | 'limited'

function pillText(mode: LinkMode): string {
  if (mode === 'loading') return 'MENUNGGU'
  if (mode === 'live') return 'LIVE'
  if (mode === 'stale') return 'STALE'
  if (mode === 'offline') return 'OFFLINE'
  if (mode === 'demo') return 'DEMO'
  if (mode === 'schema') return 'SKEMA'
  return 'DIBATASI'
}

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Elemen #${id} hilang`)
  return el as T
}

function boot(): void {
  const app = must('app')
  const canvas = must<HTMLCanvasElement>('field')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak tersedia')
  const pen: CanvasRenderingContext2D = ctx
  const linkPill = must<HTMLButtonElement>('linkPill')
  const telePop = must('telePop')
  const teleLine = must('teleLine')
  const anchorLine = must('anchorLine')
  const extraReadout = must('extraReadout')
  const demoBanner = must('demoBanner')
  const demoToggle = must<HTMLButtonElement>('demoToggle')
  const refreshBtn = must<HTMLButtonElement>('refreshBtn')
  const hpText = must('hpText')
  const hpFill = must<HTMLElement>('hpFill')
  const stamText = must('stamText')
  const stamFill = must<HTMLElement>('stamFill')
  const bonusText = must('bonusText')
  const bonusFill = must<HTMLElement>('bonusFill')
  const bagText = must('bagText')
  const zoneText = must('zoneText')
  const bankText = must('bankText')
  const arrow = must('arrow')
  const arrowWrap = must('arrowWrap')
  const eventLine = must('eventLine')
  const coach = must('coach')
  const coachOk = must<HTMLButtonElement>('coachOk')
  const shop = must('shop')
  const shopClose = must<HTMLButtonElement>('shopClose')
  const btnShop = must<HTMLButtonElement>('btnShop')
  const bagPanel = must('bagPanel')
  const bagList = must('bagList')
  const bagClose = must<HTMLButtonElement>('bagClose')
  const useBandage = must<HTMLButtonElement>('useBandage')
  const useTonic = must<HTMLButtonElement>('useTonic')
  const btnBag = must<HTMLButtonElement>('btnBag')
  const dodgeCd = must<HTMLElement>('dodgeCd')
  const attackCd = must<HTMLElement>('attackCd')
  const buyDamage = must<HTMLButtonElement>('buyDamage')
  const buyBag = must<HTMLButtonElement>('buyBag')
  const buyVitality = must<HTMLButtonElement>('buyVitality')
  const result = must('result')
  const resultTitle = must('resultTitle')
  const resultBody = must('resultBody')
  const resultAgain = must<HTMLButtonElement>('resultAgain')
  const stick = must('stick')
  const knob = must('knob')
  const btnDodge = must<HTMLButtonElement>('btnDodge')
  const btnAttack = must<HTMLButtonElement>('btnAttack')
  const btnBoost = must<HTMLButtonElement>('btnBoost')
  const btnShield = must<HTMLButtonElement>('btnShield')
  const viewBtn = must<HTMLButtonElement>('viewBtn')
  const tuneBtn = must<HTMLButtonElement>('tuneBtn')
  const tune = must('tune')
  const tuneClose = must<HTMLButtonElement>('tuneClose')
  const sensInput = must<HTMLInputElement>('sens')
  const fovInput = must<HTMLInputElement>('fov')
  const gl = must<HTMLCanvasElement>('gl')
  const tactRow = must('tactRow')
  const ammoText = must('ammoText')
  const crosshair = must('crosshair')
  const glNote = must('glNote')
  const glNoteText = must('glNoteText')
  const glMap = must<HTMLButtonElement>('glMap')
  const btnPause = must<HTMLButtonElement>('btnPause')
  const pausePanel = must('pause')
  const pauseResume = must<HTMLButtonElement>('pauseResume')
  const volInput = must<HTMLInputElement>('vol')
  const qualityInput = must<HTMLSelectElement>('quality')
  const attackLabel = must('attackLabel')
  const btnAim = must<HTMLButtonElement>('btnAim')
  const btnReload = must<HTMLButtonElement>('btnReload')
  const btnJump = must<HTMLButtonElement>('btnJump')
  const btnCrouch = must<HTMLButtonElement>('btnCrouch')
  const btnSprint = must<HTMLButtonElement>('btnSprint')
  const btnSwitch = must<HTMLButtonElement>('btnSwitch')
  const btnInteract = must<HTMLButtonElement>('btnInteract')
  const btnFireMode = must<HTMLButtonElement>('btnFireMode')
  const controls = must('controls')
  const handInput = must<HTMLSelectElement>('hand')
  const floaters = must('floaters')
  const floaterSlots = Array.from({ length: 8 }, () => {
    const slot = document.createElement('span')
    slot.hidden = true
    floaters.append(slot)
    return slot
  })

  const storage = probeStorage()
  let meta: Meta = loadMeta(storage)
  let run: RunState = createRun(meta)
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  run.reduced = reduced
  const audio = createSwordAudio()
  const audioKey = 'npcs-burrow-extraction.audio'
  const savedAudio = storage?.getItem(audioKey)
  if (savedAudio === 'mute') audio.setMuted(true)
  else if (savedAudio && savedAudio.startsWith('v:')) audio.setVolume(Number(savedAudio.slice(2)) || 0.55)
  const muteBtn = must<HTMLButtonElement>('muteBtn')
  muteBtn.textContent = audio.muted ? 'Diam' : 'Suara'
  muteBtn.setAttribute('aria-pressed', audio.muted ? 'true' : 'false')
  const keys = new Set<string>()
  let stickX = 0
  let stickY = 0
  let stickPointer = -1
  let attackHeld = false
  let tactical = true
  let yaw = Math.PI
  let pitch = 0
  let lookSens = 1
  let fov = 62
  const lookSaved = storage?.getItem('npcs-burrow-extraction.look')
  if (lookSaved) {
    const [sensRaw, fovRaw] = lookSaved.split(',')
    const sensNum = Number(sensRaw)
    const fovNum = Number(fovRaw)
    if (sensNum >= 0.6 && sensNum <= 1.6) lookSens = sensNum
    if (fovNum >= 50 && fovNum <= 75) fov = fovNum
  }
  sensInput.value = String(lookSens)
  fovInput.value = String(fov)
  let fireHeld = false
  let aimHeld = false
  let sprintHeld = false
  let crouchHeld = false
  let jumpDown = false
  let reloadDown = false
  let switchDown = false
  let mouseFire = false
  let mouseAim = false
  let lookId = -1
  let lookX = 0
  let lookY = 0
  let view: TacticalView | null = null
  let paused = false
  const queued = { dodge: false, boost: false, shield: false, attack: false }
  let resultShown: RunState['phase'] | null = null
  const session = createSession()
  let lastParsed: ParsedStatus | null = null
  let lastNotes: string[] = []
  let linkMode: LinkMode = 'loading'
  let etag: string | null = null
  let errors = 0
  let pollTimer = 0
  let polling = false
  let abort: AbortController | null = null
  let demoOn = false
  let demoTick = 0
  let demoTimer = 0
  let lastAttempt = 0
  let waitHint = '12 dtk'

  if (storage?.getItem('npcs-burrow-extraction.coach') === '1') coach.hidden = true

  function restart(): void {
    const bonus = run.bonus
    run = createRun(meta, CAMPAIGN, bonus)
    run.reduced = reduced
    resultShown = null
    result.hidden = true
    shop.hidden = true
    eventLine.textContent = 'Jalan baru. Tas kosong.'
  }

  function persist(): void {
    saveMeta(storage, meta)
  }

  function costLabel(id: UpgradeId): string {
    const rank = meta.ranks[id]
    const cost = SHOP[id][rank]
    if (!cost) return `${UPGRADE_NAME[id]} penuh`
    const parts = [
      cost.scrap ? `${cost.scrap} skrap` : '',
      cost.ore ? `${cost.ore} bijih` : '',
      cost.gear ? `${cost.gear} gigi` : '',
      cost.core ? `${cost.core} inti` : '',
      cost.relic ? `${cost.relic} relik` : '',
    ].filter(Boolean)
    return `${UPGRADE_NAME[id]} ${rank + 1}: ${parts.join(' + ')}`
  }

  function applyShop(id: UpgradeId): void {
    if (!buyUpgrade(meta, id)) {
      eventLine.textContent = 'Simpanan belum cukup.'
      return
    }
    const stats = deriveCombat(meta)
    const gained = stats.maxHp - run.maxHp
    run.maxHp = stats.maxHp
    if (gained > 0) run.hp += gained
    run.bagSize = stats.bagSize
    run.attackDamage = stats.attackDamage
    persist()
    eventLine.textContent = `${UPGRADE_NAME[id]} terpasang.`
  }

  function applyDecision(decision: RewardDecision): void {
    const total = decision.grantedEnergy + decision.sealEnergy
    if (total > 0) {
      const gained = addBonus(run, total)
      eventLine.textContent = gained > 0 ? `Muatan roda +${gained}` : 'Cadangan muatan penuh'
    }
    lastNotes = decision.notes
  }

  function ingestBody(body: unknown, source: 'live' | 'demo'): void {
    const parsed = parseStatus(body, Date.now())
    if (!parsed.ok) {
      linkMode = 'schema'
      lastNotes = [`Skema tidak dikenali (${parsed.error}). Napas tetap pulih.`]
      return
    }
    lastParsed = parsed.status
    const decision = ingest(session, parsed.status, source)
    linkMode = source === 'demo' ? 'demo' : parsed.status.fresh ? 'live' : 'stale'
    applyDecision(decision)
  }

  function handlePull(pulled: PullResult): void {
    if (pulled.etag) etag = pulled.etag
    if (pulled.kind === 'ok' || pulled.kind === 'not_modified') errors = 0
    else errors += 1
    if (pulled.kind === 'ok') {
      ingestBody(pulled.body, 'live')
      return
    }
    if (pulled.kind === 'not_modified' && lastParsed) {
      lastParsed = withFreshness(lastParsed, Date.now())
      linkMode = lastParsed.fresh ? 'live' : 'stale'
      if (!lastParsed.fresh) lastNotes = ['Usia bacaan melewati staleAfterSeconds. Napas tetap pulih.']
      return
    }
    if (pulled.kind === 'rate_limited' || pulled.httpStatus === 429) {
      linkMode = 'limited'
      waitHint = `${Math.ceil(nextDelayMs(pulled, errors) / 1000)} dtk`
      lastNotes = [`HTTP 429. Menunggu ${waitHint}.`]
      return
    }
    linkMode = pulled.kind === 'parse' ? 'schema' : 'offline'
    lastNotes = [
      pulled.kind === 'timeout'
        ? 'Batas waktu 8 dtk. Napas tetap pulih.'
        : `Roda tidak terjangkau (${pulled.message}). Napas tetap pulih.`,
    ]
  }

  function schedule(ms: number): void {
    if (pollTimer) window.clearTimeout(pollTimer)
    pollTimer = window.setTimeout(() => void pollOnce(), ms)
  }

  async function pollOnce(): Promise<void> {
    if (demoOn || document.hidden || polling) return
    polling = true
    const ctrl = new AbortController()
    abort = ctrl
    const killer = window.setTimeout(() => ctrl.abort('timeout'), TIMEOUT_MS)
    lastAttempt = Date.now()
    let pulled: PullResult
    try {
      pulled = await pullStatus({
        url: STATUS_URL,
        etag,
        fetchImpl: (url, init) => fetch(url, init),
        signal: ctrl.signal,
      })
    } finally {
      window.clearTimeout(killer)
      polling = false
    }
    if (demoOn || ctrl.signal.reason === 'stop') return
    handlePull(pulled)
    if (!document.hidden && !demoOn) schedule(nextDelayMs(pulled, errors))
  }

  function setDemo(on: boolean): void {
    demoOn = on
    demoBanner.hidden = !on
    demoToggle.setAttribute('aria-pressed', on ? 'true' : 'false')
    demoToggle.textContent = on ? 'Matikan demo' : 'Demo telemetry'
    resetBaseline(session)
    if (demoTimer) window.clearInterval(demoTimer)
    demoTimer = 0
    if (!on) {
      linkMode = 'loading'
      lastNotes = ['Demo dimatikan. Bacaan live berikutnya hanya garis dasar.']
      schedule(400)
      return
    }
    if (pollTimer) window.clearTimeout(pollTimer)
    abort?.abort('stop')
    demoTick = 0
    const body = makeDemoBody(demoTick, Date.now())
    demoTick += 1
    ingestBody(body, 'demo')
    demoTimer = window.setInterval(() => {
      ingestBody(makeDemoBody(demoTick, Date.now()), 'demo')
      demoTick += 1
    }, POLL_MS)
  }

  function input(): Input {
    let moveX = stickX
    let moveY = stickY
    if (keys.has('keya') || keys.has('arrowleft')) moveX -= 1
    if (keys.has('keyd') || keys.has('arrowright')) moveX += 1
    if (keys.has('keyw') || keys.has('arrowup')) moveY -= 1
    if (keys.has('keys') || keys.has('arrowdown')) moveY += 1
    if (tactical) {
      const forward = -moveY
      const strafe = moveX
      const fx = Math.sin(yaw)
      const fz = -Math.cos(yaw)
      const rx = Math.cos(yaw)
      const rz = Math.sin(yaw)
      moveX = strafe * rx + forward * fx
      moveY = strafe * rz + forward * fz
    }
    const sword = run.weapon === 'sword'
    const shooting = fireHeld || mouseFire
    const next: Input = {
      moveX,
      moveY,
      dodge: queued.dodge,
      attack: tactical ? (sword && shooting) || attackHeld || queued.attack : attackHeld || queued.attack,
      boost: queued.boost,
      shield: queued.shield,
      mode: tactical ? 'tactical' : undefined,
      yaw,
      pitch,
      sprint: tactical && (sprintHeld || keys.has('shiftleft') || keys.has('shiftright')),
      crouch: tactical && (crouchHeld || keys.has('keyc')),
      jump: tactical && jumpDown,
      aim: tactical && (aimHeld || mouseAim),
      fire: tactical && shooting && !sword,
      reload: tactical && reloadDown,
      switchWeapon: tactical && switchDown,
    }
    queued.dodge = false
    queued.attack = false
    queued.boost = false
    queued.shield = false
    return next
  }

  function renderHud(): void {
    const banked = takeBank(meta, run)
    if (banked) {
      persist()
      resultShown = 'extracted'
      result.hidden = false
      shop.hidden = true
      resultTitle.textContent = 'Terkumpul di pangkalan'
      const summary = banked.length ? banked.map((item) => ITEM_NAME[item]).join(', ') : 'tas kosong'
      resultBody.textContent = `Disimpan sekali: ${summary}. Simpanan skrap ${meta.bank.scrap}, gigi ${meta.bank.gear}, inti ${meta.bank.core}.`
    }
    if (run.phase === 'dead' && resultShown !== 'dead') {
      resultShown = 'dead'
      result.hidden = false
      resultTitle.textContent = 'Jatuh di galian'
      resultBody.textContent = `Tas hilang: ${run.lost.length ? run.lost.map((item) => ITEM_NAME[item]).join(', ') : 'kosong'}. Simpanan tetap: skrap ${meta.bank.scrap}, bijih ${meta.bank.ore}, gigi ${meta.bank.gear}, inti ${meta.bank.core}.`
    }
    hpText.textContent = String(Math.ceil(run.hp))
    hpFill.style.width = `${(run.hp / run.maxHp) * 100}%`
    stamText.textContent = String(Math.floor(run.stamina))
    stamFill.style.width = `${(run.stamina / STAMINA_MAX) * 100}%`
    bonusText.textContent = String(Math.floor(run.bonus))
    bonusFill.style.width = `${(run.bonus / BONUS_MAX) * 100}%`
    bagText.textContent = `Tas ${run.bag.length}/${run.bagSize}`
    zoneText.textContent = zoneName(run.y)
    zoneText.dataset.x = String(Math.round(run.x))
    zoneText.dataset.y = String(Math.round(run.y))
    zoneText.dataset.bag = String(run.bag.length)
    zoneText.dataset.phase = run.phase
    zoneText.dataset.hp = String(Math.ceil(run.hp))
    zoneText.dataset.stamina = String(Math.floor(run.stamina))
    zoneText.dataset.swing = run.lastSwing
    zoneText.dataset.view = tactical ? 'tactical' : 'map'
    zoneText.dataset.weapon = run.weapon
    zoneText.dataset.paused = paused ? '1' : '0'
    zoneText.dataset.mag = String(run.mag[run.weapon] ?? 0)
    const spec = WEAPONS[run.weapon]
    const dur = run.durability[spec.id] ?? 100
    const modeLabel = spec.auto ? (run.fireMode === 'semi' ? ' ketuk' : ' tahan') : ''
    ammoText.textContent = spec.kind === 'melee' ? 'Pedang' : `${spec.label} ${run.mag[spec.id]}/${run.reserve[spec.id]} · ${dur}${run.reloadLeft > 0 ? ' isi' : ''}${modeLabel}`
    btnFireMode.hidden = !tactical || !spec.auto
    btnFireMode.textContent = run.fireMode === 'semi' ? 'Ketuk' : 'Tahan'
    floaters.hidden = !tactical
    for (let i = 0; i < floaterSlots.length; i++) {
      const slot = floaterSlots[i]
      const popup = run.popups[i]
      if (!slot) continue
      if (!tactical || !popup) {
        slot.hidden = true
        continue
      }
      slot.hidden = false
      slot.textContent = popup.text
      slot.style.opacity = String(Math.max(0.35, Math.min(1, popup.life * 2)))
    }
    attackLabel.textContent = tactical && spec.kind !== 'melee' ? 'Tembak' : 'Pedang'
    bankText.textContent = `Simpanan ${meta.bank.scrap}/${meta.bank.gear}/${meta.bank.core}`
    bankText.dataset.bankScrap = String(meta.bank.scrap)
    bankText.dataset.bankGear = String(meta.bank.gear)
    bankText.dataset.bankCore = String(meta.bank.core)
    const dx = CAMPAIGN.extract.x - run.x
    const dy = CAMPAIGN.extract.y - run.y
    const dist = Math.hypot(dx, dy)
    arrow.style.transform = `rotate(${(Math.atan2(dx, -dy) * 180) / Math.PI}deg)`
    arrowWrap.hidden = dist < CAMPAIGN.extract.r + 8
    btnShop.hidden = run.y >= CAMPAIGN.safeY || run.phase === 'dead' || run.phase === 'extracted'
    dodgeCd.style.height = `${Math.max(0, Math.min(1, run.dodgeCd / 1.25)) * 100}%`
    attackCd.style.height = run.attackHold > 0.08 ? `${Math.min(1, run.attackHold / 0.34) * 100}%` : `${Math.max(0, Math.min(1, run.attackCd / 0.5)) * 100}%`
    btnDodge.disabled = run.dodgeCd > 0.05 || run.stamina < 28
    btnBoost.disabled = run.bonus < 24
    btnShield.disabled = run.bonus < 24
    buyDamage.textContent = costLabel('damage')
    buyBag.textContent = costLabel('bag')
    buyVitality.textContent = costLabel('vitality')
    if (!result.hidden) eventLine.textContent = ''
    else if (run.phase === 'extracting') eventLine.textContent = `Ekstrak ${run.extractLeft.toFixed(1)} dtk — jangan keluar lingkaran`
    else if (run.nearId >= 0) eventLine.textContent = 'Peti di depanmu. Buka sekali.'
    btnInteract.hidden = run.nearId < 0
    app.classList.toggle('modal', [result, pausePanel, shop, bagPanel, tune, coach].some((panel) => !panel.hidden))
    linkPill.textContent = pillText(linkMode)
    linkPill.className = `pill ${linkMode === 'loading' ? '' : linkMode}`
    const measurement = lastParsed?.measurement
    if (measurement) {
      teleLine.textContent = `${linkMode === 'demo' ? 'DEMO · ' : ''}${coreLabel(measurement.coreStatus)} · ${formatRpm(measurement.rpmMilli)} · kerja baru ${session.workCredited}`
    } else if (linkMode === 'offline' || linkMode === 'schema' || linkMode === 'limited') {
      teleLine.textContent = lastNotes[0] ?? 'Roda offline. Napas tetap pulih.'
    }
    const anchor = lastParsed?.anchor
    const projected = lastParsed?.projected
    const submission = lastParsed?.submission
    anchorLine.textContent = `${anchor ? `Anchor ${anchor.blockHeight} ${anchorIsConfirmed(anchor) ? 'dikonfirmasi' : 'tanpa confirmedAt'}` : 'Anchor belum ada'} · ${projected ? (projectedIsOptimistic(projected) ? `proyeksi ${projected.blockHeight ?? '—'} optimistis, bukan hadiah` : `proyeksi ${projected.blockHeight ?? '—'} bukan dikonfirmasi`) : 'proyeksi belum ada'} · ${submission ? (submissionIsConfirmed(submission) ? 'submission dikonfirmasi' : `submission ${submission.lifecycle ?? '—'} belum dikonfirmasi`) : 'submission belum ada'}`
    const bits: string[] = []
    if (measurement) {
      bits.push(`${measurement.speedMmPerSecond} mm/s`)
      bits.push(`provenance ${measurement.provenance}`)
      bits.push(`epoch ${measurement.counterEpoch}`)
    }
    if (lastParsed?.generatedAtMs != null) bits.push(formatWib(lastParsed.generatedAtMs))
    if (lastNotes.length) bits.push(lastNotes.join(' '))
    extraReadout.textContent = bits.join(' · ')
  }

  function resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
  }

  let benchNeed = 0
  let benchMs: number[] = []
  let benchCalls: number[] = []
  let benchTris: number[] = []
  let benchDone: ((value: Record<string, unknown>) => void) | null = null
  function pct(sorted: number[], p: number): number {
    if (!sorted.length) return 0
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
    return sorted[index] ?? 0
  }
  function summarizeBench(): Record<string, unknown> {
    const ms = [...benchMs].sort((a, b) => a - b)
    const calls = [...benchCalls].sort((a, b) => a - b)
    const sum = benchMs.reduce((total, sample) => total + sample, 0)
    return {
      frames: benchMs.length,
      durationMs: Math.round(sum),
      p50Ms: Number(pct(ms, 50).toFixed(2)),
      p95Ms: Number(pct(ms, 95).toFixed(2)),
      maxMs: Number((ms[ms.length - 1] ?? 0).toFixed(2)),
      callsP50: pct(calls, 50),
      callsMax: calls[calls.length - 1] ?? 0,
      trianglesP50: pct([...benchTris].sort((a, b) => a - b), 50),
      gpu: view?.gpu() ?? 'none',
      quality: view?.quality() ?? 'none',
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      browser: navigator.userAgent,
      paused,
    }
  }
  function frame(now: number): void {
    const rawMs = now - last
    const dt = Math.min(0.05, rawMs / 1000)
    last = now
    const glDown = tactical && Boolean(view?.lost())
    if (!paused && !glDown && (run.phase === 'explore' || run.phase === 'extracting')) step(run, dt, input())
    for (const cue of run.cues) audio.play(cue)
    run.cues.length = 0
    if (tactical && view) {
      view.resize()
      view.sync(run, aimHeld || mouseAim, { fov, dt })
      glNote.hidden = !view.lost()
      glMap.hidden = !view.lost()
      if (view.lost()) glNoteText.textContent = 'Gambar 3D putus. Peta atas tetap jalan.'
    } else {
      resize()
      draw(pen, canvas.clientWidth, canvas.clientHeight, Math.min(2, window.devicePixelRatio || 1), run, reduced)
    }
    if (benchNeed > 0) {
      benchMs.push(rawMs)
      const live = view?.stats()
      if (live) {
        benchCalls.push(live.calls)
        benchTris.push(live.triangles)
      }
      if (benchMs.length >= benchNeed) {
        benchNeed = 0
        const finish = benchDone
        benchDone = null
        finish?.(summarizeBench())
      }
    }
    renderHud()
    requestAnimationFrame(frame)
  }

  function resetKnob(): void {
    const knobSize = knob.offsetWidth || 44
    knob.style.left = `${stick.clientWidth / 2 - knobSize / 2}px`
    knob.style.top = `${stick.clientHeight / 2 - knobSize / 2}px`
    stick.setAttribute('aria-valuenow', '0')
  }
  function releaseInputs(): void {
    stickPointer = -1
    stickX = 0
    stickY = 0
    keys.clear()
    attackHeld = false
    fireHeld = false
    aimHeld = false
    sprintHeld = false
    crouchHeld = false
    jumpDown = false
    reloadDown = false
    switchDown = false
    mouseFire = false
    mouseAim = false
    lookId = -1
    resetKnob()
  }
  function setPaused(next: boolean): void {
    if (next && (run.phase === 'dead' || run.phase === 'extracted')) return
    paused = next
    if (paused) releaseInputs()
    pausePanel.hidden = !paused
    btnPause.textContent = paused ? 'Lanjut' : 'Jeda'
    btnPause.setAttribute('aria-pressed', paused ? 'true' : 'false')
  }
  function bindHold(button: HTMLButtonElement, set: (down: boolean) => void): void {
    const down = (event: PointerEvent) => {
      if (paused) return
      event.preventDefault()
      try {
        button.setPointerCapture(event.pointerId)
      } catch {
        /* synthetic pointers have no capture */
      }
      set(true)
    }
    const up = () => set(false)
    button.addEventListener('pointerdown', down)
    button.addEventListener('pointerup', up)
    button.addEventListener('pointercancel', up)
    button.addEventListener('lostpointercapture', up)
  }
  bindHold(btnAttack, (down) => {
    if (tactical && run.weapon !== 'sword') fireHeld = down
    else {
      attackHeld = down
      fireHeld = false
      if (down) queued.attack = true
    }
  })
  bindHold(btnAim, (down) => {
    aimHeld = down
  })
  bindHold(btnSprint, (down) => {
    sprintHeld = down
  })
  bindHold(btnCrouch, (down) => {
    crouchHeld = down
  })
  bindHold(btnJump, (down) => {
    jumpDown = down
  })
  bindHold(btnReload, (down) => {
    reloadDown = down
  })
  bindHold(btnSwitch, (down) => {
    switchDown = down
  })
  function tryOpen(): void {
    if (paused) return
    if (openCrate(run)) eventLine.textContent = 'Peti terbuka.'
  }
  btnInteract.addEventListener('click', tryOpen)
  function toggleFireMode(): void {
    if (paused || !WEAPONS[run.weapon].auto) return
    run.fireMode = run.fireMode === 'semi' ? 'auto' : 'semi'
  }
  btnFireMode.addEventListener('click', toggleFireMode)
  bindHold(btnDodge, (down) => {
    if (down) queued.dodge = true
  })
  bindHold(btnBoost, (down) => {
    if (down) queued.boost = true
  })
  bindHold(btnShield, (down) => {
    if (down) queued.shield = true
  })

  function moveStick(event: PointerEvent): void {
    if (paused) return
    const rect = stick.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = event.clientX - cx
    let dy = event.clientY - cy
    const max = rect.width * 0.38
    const len = Math.hypot(dx, dy) || 1
    const scale = Math.min(1, max / len)
    dx *= scale
    dy *= scale
    stickX = dx / max
    stickY = dy / max
    const knobSize = knob.offsetWidth || 44
    knob.style.left = `${rect.width / 2 + dx - knobSize / 2}px`
    knob.style.top = `${rect.height / 2 + dy - knobSize / 2}px`
    stick.setAttribute('aria-valuenow', Math.min(1, len / max).toFixed(2))
  }
  stick.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    stickPointer = event.pointerId
    try {
      stick.setPointerCapture(event.pointerId)
    } catch {
      /* synthetic pointers have no capture */
    }
    moveStick(event)
  })
  stick.addEventListener('pointermove', (event) => {
    if (event.pointerId === stickPointer) moveStick(event)
  })
  const releaseStick = (event: PointerEvent) => {
    if (event.pointerId !== stickPointer) return
    stickPointer = -1
    stickX = 0
    stickY = 0
    const knobSize = knob.offsetWidth || 44
    knob.style.left = `${stick.clientWidth / 2 - knobSize / 2}px`
    knob.style.top = `${stick.clientHeight / 2 - knobSize / 2}px`
    stick.setAttribute('aria-valuenow', '0')
  }
  stick.addEventListener('pointerup', releaseStick)
  stick.addEventListener('pointercancel', releaseStick)
  stick.addEventListener('lostpointercapture', releaseStick)

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase()
    if (key === 'escape' || key === 'p') {
      setPaused(!paused)
      return
    }
    if (paused) return
    if (key === 'e') tryOpen()
    if (key === 'v') toggleFireMode()
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault()
    keys.add(event.code.toLowerCase())
    if (!tactical && (key === ' ' || key === 'shift')) queued.dodge = true
    if (tactical && key === 'f') queued.dodge = true
    if (tactical && key === ' ') jumpDown = true
    if (tactical && key === 'r') reloadDown = true
    if (tactical && (key === 'q' || key === 'g')) switchDown = true
    if (tactical && key >= '1' && key <= '6') {
      const nextWeapon = WEAPON_ORDER[Number(key) - 1]
      if (nextWeapon) {
        run.weapon = nextWeapon
        run.reloadLeft = 0
      }
    }
    if (!tactical && (key === 'j' || key === 'k')) queued.attack = true
    if (key === 'u') queued.boost = true
    if (key === 'i') queued.shield = true
    if (key === 'j') {
      if (tactical && run.weapon !== 'sword') fireHeld = true
      else attackHeld = true
    }
  })
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code.toLowerCase())
    const key = event.key.toLowerCase()
    if (key === 'j' || key === 'k') {
      attackHeld = false
      fireHeld = false
    }
    if (key === ' ') jumpDown = false
    if (key === 'r') reloadDown = false
    if (key === 'q' || key === 'g') switchDown = false
  })

  linkPill.addEventListener('click', () => {
    telePop.hidden = !telePop.hidden
    linkPill.setAttribute('aria-expanded', telePop.hidden ? 'false' : 'true')
  })
  demoToggle.addEventListener('click', () => setDemo(!demoOn))
  refreshBtn.addEventListener('click', () => {
    if (demoOn) {
      ingestBody(makeDemoBody(demoTick, Date.now()), 'demo')
      demoTick += 1
      return
    }
    if (polling || Date.now() - lastAttempt < 3000) return
    if (pollTimer) window.clearTimeout(pollTimer)
    void pollOnce()
  })
  coachOk.addEventListener('click', () => {
    coach.hidden = true
    storage?.setItem('npcs-burrow-extraction.coach', '1')
  })
  function counts(list: RunState['bag']): string {
    const names = ['scrap', 'ore', 'gear', 'bandage', 'tonic', 'core', 'relic'] as const
    return names
      .map((kind) => {
        const count = list.filter((item) => item === kind).length
        return count ? `${ITEM_NAME[kind]} ${count}` : ''
      })
      .filter(Boolean)
      .join(', ')
  }
  function refreshBag(): void {
    const carried = counts(run.bag)
    bagList.textContent = carried || 'Tas kosong.'
  }
  function drink(kind: 'bandage' | 'tonic'): void {
    if (useCarried(run, kind)) {
      eventLine.textContent = kind === 'bandage' ? 'Perban dipakai dari tas.' : 'Tonik dipakai dari tas.'
      return
    }
    if (useBanked(meta, run, kind)) {
      persist()
      eventLine.textContent = kind === 'bandage' ? 'Perban dari simpanan.' : 'Tonik dari simpanan.'
      return
    }
    eventLine.textContent = 'Tidak ada, atau nyawa/napas sudah penuh.'
  }
  btnBag.addEventListener('click', () => {
    refreshBag()
    bagPanel.hidden = false
    shop.hidden = true
  })
  bagClose.addEventListener('click', () => {
    bagPanel.hidden = true
  })
  useBandage.addEventListener('click', () => drink('bandage'))
  useTonic.addEventListener('click', () => drink('tonic'))
  btnShop.addEventListener('click', () => {
    shop.hidden = false
  })
  shopClose.addEventListener('click', () => {
    shop.hidden = true
  })
  buyDamage.addEventListener('click', () => applyShop('damage'))
  buyBag.addEventListener('click', () => applyShop('bag'))
  buyVitality.addEventListener('click', () => applyShop('vitality'))
  resultAgain.addEventListener('click', restart)

  function unlockAudio(): void {
    audio.unlock()
  }
  window.addEventListener('pointerdown', unlockAudio, { passive: true })
  window.addEventListener('keydown', unlockAudio)
  const savedHand = storage?.getItem('npcs-burrow-extraction.hand')
  if (savedHand === 'right' || savedHand === 'left') {
    handInput.value = savedHand
    controls.classList.toggle('hand-right', savedHand === 'right')
  }
  handInput.addEventListener('change', () => {
    const hand = handInput.value === 'right' ? 'right' : 'left'
    controls.classList.toggle('hand-right', hand === 'right')
    storage?.setItem('npcs-burrow-extraction.hand', hand)
  })
  volInput.value = String(audio.volume)
  volInput.addEventListener('input', () => {
    audio.setVolume(Number(volInput.value))
    if (!audio.muted) storage?.setItem(audioKey, `v:${audio.volume.toFixed(2)}`)
  })
  btnPause.addEventListener('click', () => setPaused(!paused))
  pauseResume.addEventListener('click', () => setPaused(false))
  glMap.addEventListener('click', () => {
    tactical = false
    applyView()
    glNote.hidden = true
    glMap.hidden = true
  })
  muteBtn.addEventListener('click', () => {
    audio.setMuted(!audio.muted)
    muteBtn.textContent = audio.muted ? 'Diam' : 'Suara'
    muteBtn.setAttribute('aria-pressed', audio.muted ? 'true' : 'false')
    storage?.setItem(audioKey, audio.muted ? 'mute' : `v:${audio.volume.toFixed(2)}`)
  })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (pollTimer) window.clearTimeout(pollTimer)
      audio.suspend()
      releaseInputs()
      setPaused(true)
      return
    }
    audio.resume()
    if (!demoOn) schedule(500)
  })
  window.addEventListener('blur', () => releaseInputs())
  window.addEventListener('pointercancel', () => releaseInputs())
  window.addEventListener('touchmove', (event) => {
    const target = event.target
    if (target instanceof Element && target.closest('input, select, textarea')) return
    event.preventDefault()
  }, { passive: false })
  window.addEventListener('resize', () => {
    resize()
    view?.resize()
  })
  window.addEventListener('orientationchange', () => {
    resize()
    view?.resize()
  })

  function lookBy(dx: number, dy: number): void {
    if (paused) return
    yaw -= dx * 0.0055 * lookSens
    pitch = Math.max(-1.05, Math.min(0.75, pitch - dy * 0.0045 * lookSens))
  }
  function storeLook(): void {
    lookSens = Math.max(0.6, Math.min(1.6, Number(sensInput.value) || 1))
    fov = Math.max(50, Math.min(75, Number(fovInput.value) || 62))
    storage?.setItem('npcs-burrow-extraction.look', `${lookSens.toFixed(2)},${fov}`)
  }
  tuneBtn.addEventListener('click', () => {
    tune.hidden = !tune.hidden
    tuneBtn.setAttribute('aria-expanded', tune.hidden ? 'false' : 'true')
  })
  tuneClose.addEventListener('click', () => {
    tune.hidden = true
    tuneBtn.setAttribute('aria-expanded', 'false')
  })
  sensInput.addEventListener('input', storeLook)
  fovInput.addEventListener('input', storeLook)
  function applyView(): void {
    canvas.hidden = tactical
    gl.hidden = !tactical
    tactRow.hidden = !tactical
    crosshair.hidden = !tactical
    ammoText.hidden = !tactical
    viewBtn.textContent = tactical ? 'Atas' : 'Taktis'
    viewBtn.setAttribute('aria-pressed', tactical ? 'true' : 'false')
    if (tactical) view?.resize()
  }
  function enterTactical(): void {
    if (!view) {
      gl.hidden = false
      glNote.hidden = false
      glMap.hidden = true
      glNoteText.textContent = 'Menyiapkan galian…'
      view = createTacticalView(gl, reduced)
      if (!view) {
        tactical = false
        glNote.hidden = true
        eventLine.textContent = 'WebGL tidak tersedia. Peta atas tetap jalan.'
        applyView()
        return
      }
    }
    tactical = true
    glNote.hidden = true
    glMap.hidden = true
    const savedQuality = storage?.getItem('npcs-burrow-extraction.quality')
    if (savedQuality === 'low' || savedQuality === 'med') {
      qualityInput.value = savedQuality
      view?.setQuality(savedQuality)
    }
    eventLine.textContent = 'Geser untuk kamera. Tembak, Bidik, Isi. Ganti memutar senjata.'
    applyView()
  }
  viewBtn.addEventListener('click', () => {
    if (tactical) {
      tactical = false
      applyView()
      return
    }
    enterTactical()
  })
  gl.addEventListener('contextmenu', (event) => event.preventDefault())
  gl.addEventListener('pointerdown', (event) => {
    if (paused) return
    if (event.pointerType === 'mouse' && event.button === 2) mouseAim = true
    if (event.pointerType === 'mouse' && event.button === 0) mouseFire = true
    try {
      gl.setPointerCapture(event.pointerId)
    } catch {
      /* synthetic clicks have no pointer to capture */
    }
    lookId = event.pointerId
    lookX = event.clientX
    lookY = event.clientY
    if (event.pointerType === 'mouse' && event.button === 0) {
      try {
        gl.requestPointerLock()
      } catch {
        /* pointer lock is optional */
      }
    }
  })
  gl.addEventListener('pointermove', (event) => {
    if (document.pointerLockElement === gl) lookBy(event.movementX, event.movementY)
    else if (event.pointerId === lookId) {
      lookBy(event.clientX - lookX, event.clientY - lookY)
      lookX = event.clientX
      lookY = event.clientY
    }
  })
  const endLook = (event: PointerEvent) => {
    if (event.pointerId === lookId) lookId = -1
    if (event.pointerType !== 'mouse') return
    if (event.button === 0) mouseFire = false
    if (event.button === 2) mouseAim = false
  }
  gl.addEventListener('pointerup', endLook)
  gl.addEventListener('pointercancel', endLook)
  gl.addEventListener('lostpointercapture', endLook)
  gl.addEventListener('wheel', (event) => {
    if (!tactical) return
    event.preventDefault()
    switchDown = true
    window.setTimeout(() => {
      switchDown = false
    }, 40)
  }, { passive: false })

  let last = performance.now()
  resize()
  enterTactical()
  schedule(200)
  requestAnimationFrame(frame)
  const hook = window as Window & {
    __npcsBoot?: boolean
    __npcs?: {
      run: () => RunState
      audio: ReturnType<typeof createSwordAudio>
      stats: () => { calls: number; triangles: number; cameraDist: number } | null
      lost: () => boolean
      paused: () => boolean
      pause: () => void
      resume: () => void
      bench: (frames: number) => Promise<Record<string, unknown>>
      lose: () => void
      restore: () => void
      setQuality: (quality: 'low' | 'med') => void
      createView: typeof createTacticalView
    }
  }
  hook.__npcsBoot = true
  hook.__npcs = {
    run: () => run,
    audio,
    stats: () => view?.stats() ?? null,
      lost: () => view?.lost() ?? false,
      paused: () => paused,
      pause: () => setPaused(true),
      resume: () => setPaused(false),
      lose: () => view?.lose(),
      restore: () => view?.restore(),
      setQuality: (quality: 'low' | 'med') => view?.setQuality(quality),
      bench: (frames: number) => {
        benchMs = []
        benchCalls = []
        benchTris = []
        benchNeed = Math.max(30, Math.min(600, Math.floor(frames)))
        return new Promise<Record<string, unknown>>((resolve) => {
          benchDone = resolve
        })
      },
      createView: createTacticalView,
    }
  }

window.addEventListener('error', (event) => {
  const el = document.getElementById('bootError')
  if (el && el.textContent === '') el.textContent = event.message
})

try {
  boot()
} catch (err) {
  const el = document.getElementById('bootError')
  if (el) el.textContent = err instanceof Error ? err.message : 'Gagal memulai.'
}
