import {
  ATTACK_PER_RANK,
  BAG_BASE,
  BAG_PER_RANK,
  BONUS_MAX,
  BOOST_COST,
  BOOST_MULT,
  BOOST_TIME,
  COMBO_WINDOW,
  DODGE_COST,
  DODGE_COOLDOWN,
  DODGE_SPEED,
  DODGE_TIME,
  EXTRACT_TIME,
  HEAVY_CHARGE,
  HEAL_AMOUNT,
  HP_BASE,
  ITEM_NAME,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  SHIELD_COST,
  SHIELD_TIME,
  STAMINA_MAX,
  STAMINA_REGEN,
  STEP_CAP,
  TONIC_AMOUNT,
  VITALITY_HP,
} from './balance.ts'
import { emptyMag, emptyReserve, stepGuns, type WeaponId } from './guns.ts'
import type { EnemyKind, ItemKind, Meta, Phase, World } from './types.ts'
import { CAMPAIGN } from './world.ts'

export interface Input {
  moveX: number
  moveY: number
  dodge: boolean
  attack: boolean
  boost: boolean
  shield: boolean
  mode?: 'tactical'
  yaw?: number
  pitch?: number
  sprint?: boolean
  crouch?: boolean
  jump?: boolean
  aim?: boolean
  fire?: boolean
  reload?: boolean
  switchWeapon?: boolean
}

export interface Loot {
  id: number
  kind: ItemKind
  x: number
  y: number
  taken: boolean
  extra: ItemKind[]
}

export interface Enemy {
  id: number
  kind: EnemyKind
  x: number
  y: number
  hp: number
  maxHp: number
  touch: number
  state: 'idle' | 'windup' | 'recover'
  timer: number
  telegraph: number
  aimX: number
  aimY: number
  face: number
  mind: 'idle' | 'patrol' | 'investigate' | 'alert' | 'chase' | 'search' | 'return' | 'dead'
  homeX: number
  homeY: number
  wx: number
  wy: number
  route: number
  lastX: number
  lastY: number
  seen: number
  stuck: number
  steer: number
  dropped: boolean
  alarm: number
}

export interface Shot {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  damage: number
}

export interface Popup {
  x: number
  y: number
  text: string
  life: number
}

export interface RunState {
  phase: Phase
  time: number
  x: number
  y: number
  hp: number
  maxHp: number
  facingX: number
  facingY: number
  stamina: number
  bonus: number
  attackDamage: number
  bag: ItemKind[]
  bagSize: number
  loots: Loot[]
  enemies: Enemy[]
  shots: Shot[]
  popups: Popup[]
  payload: ItemKind[]
  lost: ItemKind[]
  didBank: boolean
  dodgeCd: number
  dodgeLeft: number
  dodgeX: number
  dodgeY: number
  dodgeHeld: boolean
  boostHeld: boolean
  shieldHeld: boolean
  boostUntil: number
  shieldUntil: number
  attackCd: number
  iframes: number
  swing: number
  travel: number
  comboStage: number
  comboUntil: number
  attackDown: boolean
  attackHold: number
  swingOnRelease: boolean
  slashLife: number
  slashArc: number
  slashRange: number
  slashAngle: number
  slashKind: 'light' | 'heavy' | 'dash'
  lastSwing: string
  hitStop: number
  swingT: number
  windup: number
  active: number
  follow: number
  hitResolved: boolean
  didHit: boolean
  kick: number
  cues: string[]
  buffered: boolean
  bufferUntil: number
  sparks: { x: number; y: number; vx: number; vy: number; life: number }[]
  z: number
  vz: number
  yaw: number
  pitch: number
  stance: 'stand' | 'crouch'
  weapon: WeaponId
  fireMode: 'auto' | 'semi'
  mag: ReturnType<typeof emptyMag>
  reserve: ReturnType<typeof emptyReserve>
  reloadLeft: number
  recoil: number
  fireCd: number
  triggerHeld: boolean
  switchHeld: boolean
  reloadHeld: boolean
  jumpHeld: boolean
  slideX: number
  slideY: number
  grounded: boolean
  tracers: { x: number; y: number; z: number; x2: number; y2: number; z2: number; life: number }[]
  impacts: { x: number; y: number; z: number; life: number; part: 'head' | 'torso' | 'arm' | 'leg' | 'wall' }[]
  muzzle: number
  durability: Partial<Record<WeaponId, number>>
  noise: number
  noiseX: number
  noiseY: number
  noiseT: number
  nearId: number
  stepCd: number
  lowCd: number
  reduced: boolean
  extractLeft: number
  hitFlash: number
  shake: number
  fullNotice: number
  world: World
}

export const IDLE_INPUT: Input = {
  moveX: 0,
  moveY: 0,
  dodge: false,
  attack: false,
  boost: false,
  shield: false,
}

export function deriveCombat(meta: Meta): { maxHp: number; bagSize: number; attackDamage: number } {
  return {
    maxHp: HP_BASE + meta.ranks.vitality * VITALITY_HP,
    bagSize: BAG_BASE + meta.ranks.bag * BAG_PER_RANK,
    attackDamage: 12 + meta.ranks.damage * ATTACK_PER_RANK,
  }
}

export function createRun(meta: Meta, world: World = CAMPAIGN, bonus = 0): RunState {
  const stats = deriveCombat(meta)
  return {
    phase: 'explore',
    time: 0,
    x: world.spawn.x,
    y: world.spawn.y,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    facingX: 0,
    facingY: 1,
    stamina: STAMINA_MAX,
    bonus: Math.max(0, Math.min(BONUS_MAX, bonus)),
    attackDamage: 12 + meta.ranks.damage * ATTACK_PER_RANK,
    bag: [],
    bagSize: stats.bagSize,
    loots: world.loots.map((loot, index) => ({ id: index + 1, kind: loot.kind, x: loot.x, y: loot.y, taken: false, extra: loot.extra ?? [] })),
    enemies: world.enemies.map((enemy, index) => ({
      id: index + 1,
      kind: enemy.kind,
      x: enemy.x,
      y: enemy.y,
      hp: enemy.hp,
      maxHp: enemy.hp,
      touch: enemy.touch,
      state: 'idle',
      timer: 0.25 + index * 0.08,
      telegraph: 0,
      aimX: enemy.x,
      aimY: enemy.y,
      face: Math.PI,
      mind: 'patrol',
      homeX: enemy.x,
      homeY: enemy.y,
      wx: patrolPoint(world, enemy.x, enemy.y).x,
      wy: patrolPoint(world, enemy.x, enemy.y).y,
      route: 0,
      lastX: enemy.x,
      lastY: enemy.y,
      seen: 0,
      stuck: 0,
      steer: 1,
      dropped: false,
      alarm: 0,
    })),
    shots: [],
    popups: [],
    payload: [],
    lost: [],
    didBank: false,
    dodgeCd: 0,
    dodgeLeft: 0,
    dodgeX: 0,
    dodgeY: 1,
    dodgeHeld: false,
    boostHeld: false,
    shieldHeld: false,
    boostUntil: 0,
    shieldUntil: 0,
    attackCd: 0,
    iframes: 0,
    swing: 0,
    travel: 0,
    comboStage: 0,
    comboUntil: 0,
    attackDown: false,
    attackHold: 0,
    swingOnRelease: false,
    slashLife: 0,
    slashArc: 0,
    slashRange: 0,
    slashAngle: 0,
    slashKind: 'light',
    lastSwing: '',
    hitStop: 0,
    swingT: -1,
    windup: 0,
    active: 0,
    follow: 0,
    hitResolved: true,
    didHit: false,
    kick: 0,
    cues: [],
    buffered: false,
    bufferUntil: 0,
    sparks: [],
    z: 0,
    vz: 0,
    yaw: Math.PI,
    pitch: 0,
    stance: 'stand',
    weapon: 'sword',
    fireMode: 'auto',
    mag: emptyMag(),
    reserve: emptyReserve(),
    reloadLeft: 0,
    recoil: 0,
    fireCd: 0,
    triggerHeld: false,
    switchHeld: false,
    reloadHeld: false,
    jumpHeld: false,
    slideX: 0,
    slideY: 0,
    grounded: true,
    tracers: [],
    impacts: [],
    muzzle: 0,
    durability: { sword: 100, pistol: 100, smg: 100, assault: 100, shotgun: 100, marksman: 100 },
    noise: 0,
    noiseX: 0,
    noiseY: 0,
    noiseT: 0,
    nearId: -1,
    stepCd: 0.2,
    lowCd: 0.4,
    reduced: false,
    extractLeft: 0,
    hitFlash: 0,
    shake: 0,
    fullNotice: 0,
    world,
  }
}

export function blocked(world: World, x: number, y: number, radius: number): boolean {
  if (x - radius < 0 || y - radius < 0 || x + radius > world.w || y + radius > world.h) return true
  for (const box of world.obstacles) {
    const cx = Math.max(box.x, Math.min(x, box.x + box.w))
    const cy = Math.max(box.y, Math.min(y, box.y + box.h))
    const dx = x - cx
    const dy = y - cy
    if (dx * dx + dy * dy < radius * radius) return true
  }
  return false
}

function resolve(world: World, x: number, y: number, radius: number): { x: number; y: number } {
  let px = x
  let py = y
  for (let pass = 0; pass < 2; pass++) {
    px = Math.max(radius, Math.min(world.w - radius, px))
    py = Math.max(radius, Math.min(world.h - radius, py))
    for (const box of world.obstacles) {
      const cx = Math.max(box.x, Math.min(px, box.x + box.w))
      const cy = Math.max(box.y, Math.min(py, box.y + box.h))
      let dx = px - cx
      let dy = py - cy
      const distSq = dx * dx + dy * dy
      if (distSq >= radius * radius) continue
      if (distSq === 0) {
        const left = px - box.x
        const right = box.x + box.w - px
        const top = py - box.y
        const bottom = box.y + box.h - py
        const min = Math.min(left, right, top, bottom)
        if (min === left) px = box.x - radius
        else if (min === right) px = box.x + box.w + radius
        else if (min === top) py = box.y - radius
        else py = box.y + box.h + radius
        continue
      }
      const dist = Math.sqrt(distSq)
      const push = (radius - dist) / dist
      px += dx * push
      py += dy * push
    }
  }
  return {
    x: Math.max(radius, Math.min(world.w - radius, px)),
    y: Math.max(radius, Math.min(world.h - radius, py)),
  }
}

function popup(run: RunState, text: string): void {
  run.popups.push({ x: run.x, y: run.y - 18, text, life: 0.8 })
}

function die(run: RunState): void {
  if (run.phase === 'dead' || run.phase === 'extracted') return
  run.hp = 0
  run.phase = 'dead'
  run.lost = [...run.bag]
  run.bag = []
  run.extractLeft = 0
  popup(run, 'jatuh')
  cue(run, 'die')
}

export function hurtPlayer(run: RunState, amount: number): void {
  if (run.phase !== 'explore' && run.phase !== 'extracting') return
  if (run.y < run.world.safeY) return
  if (run.iframes > 0) return
  if (run.time < run.shieldUntil) {
    popup(run, 'perisai')
    return
  }
  run.hp = Math.max(0, run.hp - amount)
  run.hitFlash = 0.22
  run.shake = run.reduced ? 0 : 0.16
  cue(run, 'hurt')
  if (run.hp <= 0) die(run)
}

function tryDodge(run: RunState, input: Input): void {
  if (run.dodgeCd > 0 || run.dodgeLeft > 0 || run.stamina < DODGE_COST) return
  let dx = input.moveX
  let dy = input.moveY
  const len = Math.hypot(dx, dy)
  if (len < 0.2) {
    dx = run.facingX
    dy = run.facingY
  } else {
    dx /= len
    dy /= len
  }
  run.stamina -= DODGE_COST
  run.dodgeLeft = DODGE_TIME
  run.dodgeCd = DODGE_COOLDOWN
  run.iframes = DODGE_TIME
  run.dodgeX = dx
  run.dodgeY = dy
}

function trySpendBonus(run: RunState, kind: 'boost' | 'shield'): void {
  const cost = kind === 'boost' ? BOOST_COST : SHIELD_COST
  if (run.bonus < cost) {
    popup(run, 'muatan kurang')
    return
  }
  run.bonus -= cost
  if (kind === 'boost') {
    run.boostUntil = run.time + BOOST_TIME
    popup(run, 'pacu')
  } else {
    run.shieldUntil = run.time + SHIELD_TIME
    popup(run, 'perisai')
  }
}

const LIGHT = [
  { id: 'light-1', damage: 12, range: 42, arc: 1.2, knock: 8, recover: 0.2 },
  { id: 'light-2', damage: 17, range: 50, arc: 1.55, knock: 12, recover: 0.22 },
  { id: 'light-3', damage: 30, range: 62, arc: 2.15, knock: 22, recover: 0.5 },
] as const

const HEAVY = { id: 'heavy', damage: 40, range: 74, arc: 2.5, knock: 28, recover: 0.9 }
const DASH_CUT = { id: 'dash', damage: 24, range: 58, arc: 1.05, knock: 16, recover: 0.26 }

function segmentBlocked(world: World, x1: number, y1: number, x2: number, y2: number): boolean {
  const dist = Math.hypot(x2 - x1, y2 - y1)
  const steps = Math.max(1, Math.ceil(dist / 6))
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    if (blocked(world, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 1)) return true
  }
  return false
}

function cue(run: RunState, name: string): void {
  run.cues.push(name)
  if (run.cues.length > 12) run.cues.shift()
}

function beginSwing(
  run: RunState,
  move: { id: string; damage: number; range: number; arc: number; knock: number; recover: number },
  kind: 'light' | 'heavy' | 'dash',
): void {
  run.swingT = 0
  run.windup = kind === 'heavy' ? 0.02 : kind === 'dash' ? 0.015 : 0.02
  run.active = 0.06
  run.follow = move.recover
  run.hitResolved = false
  run.didHit = false
  const recoverScale = kind === 'heavy' || move.id === 'light-3' ? 0.72 : 0.55
  run.attackCd = run.windup + run.active + move.recover * recoverScale
  run.swing = run.windup + run.active + run.follow
  run.slashLife = kind === 'heavy' ? 0.34 : 0.22
  run.slashArc = move.arc
  run.slashRange = move.range
  run.slashAngle = Math.atan2(run.facingY, run.facingX)
  run.slashKind = kind
  run.lastSwing = move.id
  cue(run, kind === 'light' ? `whoosh-${move.id}` : kind === 'heavy' ? 'whoosh-heavy' : 'whoosh-dash')
}

function resolveSwing(run: RunState, move: { id: string; damage: number; range: number; arc: number; knock: number }): number {
  const bonus = Math.max(0, run.attackDamage - 12)
  const boosted = run.time < run.boostUntil
  const amount = Math.round((move.damage + bonus) * (boosted ? BOOST_MULT : 1))
  let hits = 0
  for (const enemy of run.enemies) {
    if (enemy.hp <= 0) continue
    const dx = enemy.x - run.x
    const dy = enemy.y - run.y
    const dist = Math.hypot(dx, dy)
    if (dist > move.range || dist < 1) continue
    let diff = Math.atan2(dy, dx) - run.slashAngle
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    if (Math.abs(diff) > move.arc / 2) continue
    if (segmentBlocked(run.world, run.x, run.y, enemy.x, enemy.y)) continue
    hits += 1
    enemy.hp -= amount
    const next = moveActor(run, enemy.x + (dx / dist) * move.knock, enemy.y + (dy / dist) * move.knock, 14)
    enemy.x = next.x
    enemy.y = next.y
    run.popups.push({ x: enemy.x, y: enemy.y - 16, text: String(amount), life: 0.45 })
    if (move.id === 'heavy' || move.id === 'light-3') {
      enemy.state = 'recover'
      enemy.timer = Math.max(enemy.timer, 0.35)
    }
    if (enemy.hp <= 0) {
      enemy.hp = 0
      cue(run, 'kill')
      run.popups.push({ x: enemy.x, y: enemy.y, text: 'rubuh', life: 0.5 })
    }
    if (run.sparks.length < 20) {
      run.sparks.push({ x: enemy.x, y: enemy.y, vx: dx / dist * 30, vy: dy / dist * 30, life: 0.18 })
    }
  }
  return hits
}

function advanceSwing(run: RunState, h: number): void {
  if (run.swingT < 0) return
  const prev = run.swingT
  run.swingT += h
  const impact = run.windup + run.active * 0.5
  if (!run.hitResolved && prev < impact && run.swingT >= impact) {
    const move = swingMove(run.lastSwing)
    const hits = move ? resolveSwing(run, move) : 0
    run.hitResolved = true
    run.didHit = hits > 0
    cue(run, hits > 0 ? 'hit' : 'whiff')
    if (hits > 0 && !run.reduced) {
      const heavy = run.slashKind === 'heavy' || run.lastSwing === 'light-3'
      run.hitStop = heavy ? 0.04 : 0.016
      run.kick = run.slashKind === 'heavy' ? 5 : heavy ? 3 : 1.4
      run.shake = heavy ? 0.2 : 0.08
    }
  }
  if (run.swingT > run.windup + run.active + run.follow) run.swingT = -1
}

function swingMove(id: string): { id: string; damage: number; range: number; arc: number; knock: number } | null {
  if (id === HEAVY.id) return HEAVY
  if (id === DASH_CUT.id) return DASH_CUT
  return LIGHT.find((move) => move.id === id) ?? null
}

function handleSword(run: RunState, h: number, input: Input): void {
  if (input.attack && !run.attackDown) {
    run.attackDown = true
    run.attackHold = 0
    run.swingOnRelease = true
    if (run.dodgeLeft > 0 && run.attackCd <= 0) {
      beginSwing(run, DASH_CUT, 'dash')
      run.swingOnRelease = false
      run.comboStage = 0
      run.buffered = false
    } else if (run.attackCd > 0 && run.comboStage > 0 && run.comboStage < 3 && run.slashKind === 'light') {
      run.buffered = true
      run.bufferUntil = run.comboUntil
    }
  }
  if (input.attack && run.attackDown) {
    const before = run.attackHold
    run.attackHold += h
    if (before < HEAVY_CHARGE && run.attackHold >= HEAVY_CHARGE) cue(run, 'charge')
  }
  if (!input.attack && run.attackDown) {
    run.attackDown = false
    if (run.swingOnRelease && run.attackCd <= 0) {
      if (run.attackHold >= HEAVY_CHARGE) {
        if (run.stamina >= 16) {
          run.stamina -= 16
          beginSwing(run, HEAVY, 'heavy')
          run.comboStage = 0
          run.buffered = false
        } else popup(run, 'napas kurang')
      } else {
        const stage = run.time <= run.comboUntil ? Math.min(3, run.comboStage + 1) : 1
        beginSwing(run, LIGHT[stage - 1] ?? LIGHT[0], 'light')
        run.comboStage = stage === 3 ? 0 : stage
        run.comboUntil = run.time + (stage === 3 ? 0 : COMBO_WINDOW)
        run.buffered = false
      }
    }
    run.attackHold = 0
    run.swingOnRelease = false
  }
}

export function openCrate(run: RunState): boolean {
  const loot = run.loots.find((item) => item.id === run.nearId && !item.taken && item.extra.length > 0)
  if (!loot) return false
  const bundle = [loot.kind, ...loot.extra]
  if (run.bag.length + bundle.length > run.bagSize) {
    popup(run, 'tas penuh')
    return false
  }
  loot.taken = true
  for (const item of bundle) run.bag.push(item)
  popup(run, 'peti')
  cue(run, 'loot-rare')
  run.nearId = -1
  return true
}

export function useCarried(run: RunState, kind: 'bandage' | 'tonic'): boolean {
  const index = run.bag.indexOf(kind)
  if (index < 0) return false
  if (kind === 'bandage' && run.hp >= run.maxHp) return false
  if (kind === 'tonic' && run.stamina >= STAMINA_MAX) return false
  run.bag.splice(index, 1)
  if (kind === 'bandage') run.hp = Math.min(run.maxHp, run.hp + HEAL_AMOUNT)
  else run.stamina = Math.min(STAMINA_MAX, run.stamina + TONIC_AMOUNT)
  popup(run, ITEM_NAME[kind])
  cue(run, 'heal')
  return true
}

export function useBanked(meta: Meta, run: RunState, kind: 'bandage' | 'tonic'): boolean {
  if (run.y >= run.world.safeY) return false
  if (meta.bank[kind] <= 0) return false
  if (kind === 'bandage' && run.hp >= run.maxHp) return false
  if (kind === 'tonic' && run.stamina >= STAMINA_MAX) return false
  meta.bank[kind] -= 1
  if (kind === 'bandage') run.hp = Math.min(run.maxHp, run.hp + HEAL_AMOUNT)
  else run.stamina = Math.min(STAMINA_MAX, run.stamina + TONIC_AMOUNT)
  return true
}

function patrolPoint(world: World, x: number, y: number): { x: number; y: number } {
  const options = [
    [42, 0],
    [-42, 0],
    [0, 36],
    [0, -36],
    [28, 28],
    [-28, 28],
  ]
  for (const [dx, dy] of options) {
    const nx = x + (dx ?? 0)
    const ny = y + (dy ?? 0)
    if (!blocked(world, nx, ny, 14)) return { x: nx, y: ny }
  }
  return { x, y }
}

function moveActor(run: RunState, x: number, y: number, radius: number): { x: number; y: number } {
  return resolve(run.world, x, y, radius)
}

function sightRange(run: RunState, enemy: Enemy): number {
  const base = enemy.kind === 'spitter' ? 230 : enemy.kind === 'guard' ? 200 : 150
  const moving = Math.hypot(run.slideX, run.slideY)
  const sprinting = moving > PLAYER_SPEED * 1.15
  const scale = run.stance === 'crouch' ? 0.55 : sprinting ? 1.35 : 1
  return base * scale
}

function enemySees(run: RunState, enemy: Enemy, dist: number): boolean {
  if (run.y < run.world.safeY || dist > sightRange(run, enemy)) return false
  return !segmentBlocked(run.world, enemy.x, enemy.y, run.x, run.y)
}

function enemyHears(run: RunState, enemy: Enemy, dist: number): boolean {
  const moving = Math.hypot(run.slideX, run.slideY)
  const foot = run.stance === 'crouch' ? 0 : moving > PLAYER_SPEED * 1.15 ? 84 : moving > 20 ? 30 : 0
  const gun = run.noiseT > 0 ? Math.hypot(enemy.x - run.noiseX, enemy.y - run.noiseY) < run.noise : false
  return gun || dist < foot
}

function stepToward(run: RunState, enemy: Enemy, tx: number, ty: number, speed: number, h: number): void {
  const dx = tx - enemy.x
  const dy = ty - enemy.y
  const dist = Math.hypot(dx, dy) || 1
  const vx = (dx / dist) * speed
  const vy = (dy / dist) * speed
  const attempt = (sx: number, sy: number) => {
    const next = moveActor(run, enemy.x + sx * h, enemy.y + sy * h, 14)
    const moved = Math.hypot(next.x - enemy.x, next.y - enemy.y)
    return { next, moved }
  }
  let chosen = attempt(vx, vy)
  if (chosen.moved < speed * h * 0.3) {
    enemy.stuck += h
    if (enemy.stuck > 0.4) {
      enemy.steer = enemy.steer > 0 ? -1 : 1
      enemy.stuck = 0
      if (enemy.mind === 'patrol' || enemy.mind === 'idle') enemy.route = enemy.route === 0 ? 1 : 0
    }
    const side = enemy.steer || 1
    const slid = attempt(-vy * side, vx * side)
    if (slid.moved > chosen.moved) chosen = slid
    else {
      const other = attempt(vy * side, -vx * side)
      if (other.moved > chosen.moved) chosen = other
    }
  } else enemy.stuck = 0
  if (chosen.next.y < run.world.safeY - 6) return
  enemy.x = chosen.next.x
  enemy.y = chosen.next.y
  if (Math.hypot(vx, vy) > 1) enemy.face = Math.atan2(vx, -vy)
}

function beginAlert(run: RunState, enemy: Enemy): void {
  enemy.mind = 'alert'
  enemy.timer = 0.32
  enemy.alarm = 1
  enemy.state = 'idle'
  cue(run, 'alert')
  run.popups.push({ x: enemy.x, y: enemy.y - 20, text: '!', life: 0.7 })
}

function tryStrike(run: RunState, enemy: Enemy, dist: number, see: boolean): boolean {
  if (!see) return false
  if (enemy.kind === 'spitter') {
    if (dist > 78 && dist < 280) {
      enemy.state = 'windup'
      enemy.timer = 0.62
      enemy.telegraph = 0
      enemy.aimX = run.x
      enemy.aimY = run.y
      enemy.mind = 'chase'
      return true
    }
    return false
  }
  const reach = enemy.kind === 'guard' ? 40 : 44
  if (dist < reach) {
    enemy.state = 'windup'
    enemy.timer = enemy.kind === 'guard' ? 0.58 : 0.52
    enemy.telegraph = 0
    enemy.mind = 'chase'
    return true
  }
  return false
}

function tickEnemy(run: RunState, enemy: Enemy, h: number): void {
  if (enemy.hp <= 0) {
    if (!enemy.dropped) {
      enemy.dropped = true
      enemy.mind = 'dead'
      const kind = enemy.kind === 'spitter' ? 'gear' : enemy.kind === 'guard' ? 'ore' : 'scrap'
      const id = run.loots.reduce((max, loot) => Math.max(max, loot.id), 0) + 1
      run.loots.push({ id, kind, x: enemy.x, y: enemy.y, taken: false, extra: [] })
      cue(run, 'loot')
    }
    return
  }
  const dx = run.x - enemy.x
  const dy = run.y - enemy.y
  const dist = Math.hypot(dx, dy) || 0.0001
  enemy.alarm = Math.max(0, enemy.alarm - h)
  const see = enemySees(run, enemy, dist)
  const hear = enemyHears(run, enemy, dist)
  if (see) {
    enemy.lastX = run.x
    enemy.lastY = run.y
    enemy.seen = 0
    enemy.face = Math.atan2(dx, -dy)
  } else enemy.seen += h

  if (enemy.state === 'windup') {
    enemy.timer -= h
    const wind = enemy.kind === 'spitter' ? 0.62 : enemy.kind === 'guard' ? 0.58 : 0.52
    enemy.telegraph = Math.max(0, Math.min(1, 1 - enemy.timer / wind))
    if (enemy.timer > 0) return
    enemy.telegraph = 0
    enemy.state = 'recover'
    enemy.timer = enemy.kind === 'spitter' ? 1.05 : 0.7
    if (enemy.kind !== 'spitter') {
      if (dist < 54) hurtPlayer(run, enemy.touch)
      return
    }
    const aimDx = enemy.aimX - enemy.x
    const aimDy = enemy.aimY - enemy.y
    const aim = Math.hypot(aimDx, aimDy) || 1
    if (!segmentBlocked(run.world, enemy.x, enemy.y, enemy.aimX, enemy.aimY)) {
      run.shots.push({
        x: enemy.x,
        y: enemy.y,
        vx: (aimDx / aim) * 210,
        vy: (aimDy / aim) * 210,
        life: 1.35,
        damage: enemy.touch,
      })
    }
    return
  }
  if (enemy.state === 'recover') {
    enemy.timer -= h
    if (enemy.timer <= 0) {
      enemy.state = 'idle'
      enemy.mind = see ? 'chase' : 'search'
      if (!see) enemy.timer = 2.2
    }
    return
  }

  const calm = enemy.mind === 'patrol' || enemy.mind === 'idle' || enemy.mind === 'return' || enemy.mind === 'search'
  if (see && calm) {
    if (tryStrike(run, enemy, dist, true)) return
    beginAlert(run, enemy)
    return
  }
  if (!see && hear && (enemy.mind === 'patrol' || enemy.mind === 'idle' || enemy.mind === 'return')) {
    enemy.mind = 'investigate'
    enemy.lastX = run.noiseT > 0 ? run.noiseX : run.x
    enemy.lastY = run.noiseT > 0 ? run.noiseY : run.y
    enemy.timer = 2.6
    enemy.alarm = 0.55
    return
  }

  if (enemy.mind === 'alert') {
    enemy.timer -= h
    enemy.face = Math.atan2(dx, -dy)
    if (enemy.timer <= 0) enemy.mind = see || dist < sightRange(run, enemy) ? 'chase' : 'search'
    return
  }
  if (enemy.mind === 'chase') {
    if (tryStrike(run, enemy, dist, see)) return
    const speed = enemy.kind === 'spitter' ? 70 : enemy.kind === 'guard' ? 76 : 98
    if (see) stepToward(run, enemy, run.x, run.y, speed, h)
    else stepToward(run, enemy, enemy.lastX, enemy.lastY, speed * 0.85, h)
    if (enemy.seen > 1.15) {
      enemy.mind = 'search'
      enemy.timer = 2.4
    }
    return
  }
  if (enemy.mind === 'investigate') {
    stepToward(run, enemy, enemy.lastX, enemy.lastY, 64, h)
    if (Math.hypot(enemy.lastX - enemy.x, enemy.lastY - enemy.y) < 18) {
      enemy.mind = 'search'
      enemy.timer = 2.2
    }
    return
  }
  if (enemy.mind === 'search') {
    enemy.timer -= h
    const ox = enemy.lastX + Math.cos(run.time * 1.3 + enemy.id) * 22
    const oy = enemy.lastY + Math.sin(run.time + enemy.id) * 22
    stepToward(run, enemy, ox, oy, 48, h)
    if (enemy.timer <= 0) enemy.mind = 'return'
    return
  }
  if (enemy.mind === 'return') {
    stepToward(run, enemy, enemy.homeX, enemy.homeY, 52, h)
    if (Math.hypot(enemy.homeX - enemy.x, enemy.homeY - enemy.y) < 14) enemy.mind = 'patrol'
    return
  }
  const goalX = enemy.route === 0 ? enemy.homeX : enemy.wx
  const goalY = enemy.route === 0 ? enemy.homeY : enemy.wy
  stepToward(run, enemy, goalX, goalY, enemy.kind === 'guard' ? 34 : 42, h)
  if (Math.hypot(goalX - enemy.x, goalY - enemy.y) < 12) enemy.route = enemy.route === 0 ? 1 : 0
}

function ended(run: RunState): boolean {
  return run.phase === 'dead' || run.phase === 'extracted'
}

function tick(run: RunState, h: number, input: Input): void {
  if (ended(run)) return
  run.time += h
  run.hitFlash = Math.max(0, run.hitFlash - h)
  run.shake = Math.max(0, run.shake - h)
  run.swing = Math.max(0, run.swing - h)
  run.fullNotice = Math.max(0, run.fullNotice - h)
  run.dodgeCd = Math.max(0, run.dodgeCd - h)
  run.attackCd = Math.max(0, run.attackCd - h)
  run.iframes = Math.max(0, run.iframes - h)
  run.stamina = Math.min(STAMINA_MAX, run.stamina + STAMINA_REGEN * h)
  run.noiseT = Math.max(0, run.noiseT - h)
  run.stepCd = Math.max(0, run.stepCd - h)
  run.lowCd = Math.max(0, run.lowCd - h)
  if (input.mode === 'tactical' && run.grounded && Math.hypot(run.slideX, run.slideY) > 24 && run.stepCd <= 0) {
    const rushing = Math.hypot(run.slideX, run.slideY) > PLAYER_SPEED * 1.15
    cue(run, run.stance === 'crouch' ? 'step-soft' : rushing ? 'step-fast' : 'step')
    run.stepCd = run.stance === 'crouch' ? 0.56 : rushing ? 0.24 : 0.42
  }
  if (run.hp > 0 && run.hp < run.maxHp * 0.4 && run.lowCd <= 0) {
    cue(run, 'low')
    run.lowCd = 1.5
  }
  run.popups = run.popups.filter((item) => {
    item.life -= h
    item.y -= 18 * h
    return item.life > 0
  })

  const followThrough = run.swingT > run.windup + run.active
  const cancellable =
    run.swingT < 0 || (followThrough && run.slashKind === 'light' && (run.lastSwing === 'light-1' || run.lastSwing === 'light-2'))
  if (input.dodge && !run.dodgeHeld && cancellable) {
    if (run.swingT >= 0) {
      run.swingT = -1
      run.attackCd = Math.min(run.attackCd, 0.06)
    }
    tryDodge(run, input)
  }
  run.dodgeHeld = input.dodge
  if (input.boost && !run.boostHeld) trySpendBonus(run, 'boost')
  run.boostHeld = input.boost
  if (input.shield && !run.shieldHeld) trySpendBonus(run, 'shield')
  run.shieldHeld = input.shield
  run.slashLife = Math.max(0, run.slashLife - h)
  run.kick = Math.max(0, run.kick - h * 18)
  run.sparks = run.sparks.filter((spark) => {
    spark.life -= h
    spark.x += spark.vx * h
    spark.y += spark.vy * h
    return spark.life > 0
  })
  const frozen = run.hitStop > 0
  if (run.hitStop > 0) run.hitStop = Math.max(0, run.hitStop - h)
  if (!frozen) handleSword(run, h, input)
  if (!frozen && run.buffered && !run.attackDown && run.attackCd <= 0 && run.time <= run.bufferUntil && run.comboStage > 0 && run.comboStage < 3) {
    const stage = Math.min(3, run.comboStage + 1)
    beginSwing(run, LIGHT[stage - 1] ?? LIGHT[0], 'light')
    run.comboStage = stage === 3 ? 0 : stage
    run.comboUntil = run.time + (stage === 3 ? 0 : COMBO_WINDOW)
    run.buffered = false
  }

  if (input.mode === 'tactical') {
    if (typeof input.yaw === 'number') run.yaw = input.yaw
    if (typeof input.pitch === 'number') run.pitch = Math.max(-1.1, Math.min(0.8, input.pitch))
    run.facingX = Math.sin(run.yaw)
    run.facingY = -Math.cos(run.yaw)
    run.stance = input.crouch ? 'crouch' : 'stand'
    run.grounded = run.z <= 0.05
    if (input.jump && !run.jumpHeld && run.grounded) run.vz = 98
    run.vz -= 320 * h
    run.z += run.vz * h
    if (run.z <= 0) {
      run.z = 0
      run.vz = 0
    }
  }
  run.jumpHeld = input.mode === 'tactical' ? Boolean(input.jump) : run.jumpHeld

  let mx = input.moveX
  let my = input.moveY
  const moveLen = Math.hypot(mx, my)
  if (moveLen > 1) {
    mx /= moveLen
    my /= moveLen
  }
  if (input.mode !== 'tactical' && moveLen > 0.15) {
    run.facingX = mx / Math.max(moveLen, 0.0001)
    run.facingY = my / Math.max(moveLen, 0.0001)
    if (moveLen > 1) {
      run.facingX = mx
      run.facingY = my
    }
  }
  let speed = PLAYER_SPEED
  if (input.mode === 'tactical') {
    if (input.crouch) speed *= 0.55
    else if (input.sprint && !input.aim && run.stamina > 6) {
      speed *= 1.62
      run.stamina = Math.max(0, run.stamina - 32 * h)
    }
    if (input.aim) speed *= 0.6
  }
  const prevX = run.x
  const prevY = run.y
  if (run.dodgeLeft > 0) {
    run.dodgeLeft = Math.max(0, run.dodgeLeft - h)
    run.iframes = Math.max(run.iframes, run.dodgeLeft)
    run.slideX = 0
    run.slideY = 0
    const next = moveActor(run, run.x + run.dodgeX * DODGE_SPEED * h, run.y + run.dodgeY * DODGE_SPEED * h, PLAYER_RADIUS)
    run.x = next.x
    run.y = next.y
  } else if (input.mode === 'tactical') {
    const tx = moveLen > 0.05 ? mx * speed : 0
    const ty = moveLen > 0.05 ? my * speed : 0
    const rate = input.crouch ? 9 : input.sprint ? 7 : 8
    const blend = Math.min(1, rate * h)
    run.slideX += (tx - run.slideX) * blend
    run.slideY += (ty - run.slideY) * blend
    if (Math.hypot(run.slideX, run.slideY) < 4) {
      run.slideX = 0
      run.slideY = 0
    }
    const next = moveActor(run, run.x + run.slideX * h, run.y + run.slideY * h, PLAYER_RADIUS)
    if (Math.abs(next.x - run.x) < 0.05) run.slideX = 0
    if (Math.abs(next.y - run.y) < 0.05) run.slideY = 0
    run.x = next.x
    run.y = next.y
  } else if (moveLen > 0.05) {
    const next = moveActor(run, run.x + mx * speed * h, run.y + my * speed * h, PLAYER_RADIUS)
    run.x = next.x
    run.y = next.y
  }
  run.travel += Math.hypot(run.x - prevX, run.y - prevY)
  if (input.mode === 'tactical') {
    for (const enemy of run.enemies) {
      if (enemy.hp <= 0) continue
      const dx = run.x - enemy.x
      const dy = run.y - enemy.y
      if (dx * dx + dy * dy > 1) enemy.face = Math.atan2(dx, -dy)
    }
    stepGuns(run, h, { ...input, frozen }, (x, y, radius) => blocked(run.world, x, y, radius))
  }
  advanceSwing(run, h)

  if (run.phase !== 'dead') {
    for (const enemy of run.enemies) tickEnemy(run, enemy, h)
    run.shots = run.shots.filter((shot) => {
      shot.x += shot.vx * h
      shot.y += shot.vy * h
      shot.life -= h
      if (shot.y < run.world.safeY) return false
      if (Math.hypot(shot.x - run.x, shot.y - run.y) < PLAYER_RADIUS + 4) {
        hurtPlayer(run, shot.damage)
        return false
      }
      return shot.life > 0 && shot.x > 0 && shot.y > 0 && shot.x < run.world.w && shot.y < run.world.h
    })
    if (run.shots.length > 12) run.shots.splice(0, run.shots.length - 12)
  }
  if (run.phase === 'dead') return

  run.nearId = -1
  for (const loot of run.loots) {
    if (loot.taken) continue
    if (Math.hypot(loot.x - run.x, loot.y - run.y) > 22) continue
    if (loot.extra.length > 0) {
      run.nearId = loot.id
      continue
    }
    const bundle = [loot.kind, ...loot.extra]
    if (run.bag.length + bundle.length > run.bagSize) {
      if (run.fullNotice <= 0) {
        popup(run, 'tas penuh')
        run.fullNotice = 1.3
      }
      continue
    }
    loot.taken = true
    for (const item of bundle) run.bag.push(item)
    popup(run, bundle.length > 1 ? 'peti' : ITEM_NAME[loot.kind])
    cue(run, loot.kind === 'core' || loot.kind === 'relic' || bundle.length > 1 ? 'loot-rare' : 'loot')
  }

  const zone = run.world.extract
  const inside = Math.hypot(run.x - zone.x, run.y - zone.y) <= zone.r
  if (inside) {
    if (run.phase !== 'extracting') {
      run.phase = 'extracting'
      run.extractLeft = EXTRACT_TIME
      cue(run, 'extract')
    }
    run.extractLeft -= h
    if (run.extractLeft <= 0) {
      run.phase = 'extracted'
      cue(run, 'extract-done')
      run.payload = [...run.bag]
      run.bag = []
      run.extractLeft = 0
    }
  } else if (run.phase === 'extracting') {
    run.phase = 'explore'
    run.extractLeft = 0
  }
}

export function step(run: RunState, dt: number, input: Input = IDLE_INPUT): RunState {
  if (!Number.isFinite(dt) || dt <= 0) return run
  let left = dt
  while (left > 0 && run.phase !== 'dead' && run.phase !== 'extracted') {
    const h = Math.min(STEP_CAP, left)
    tick(run, h, input)
    left -= h
  }
  return run
}

/** Banks carried loot that already extracted. A second call does nothing. */
export function takeBank(meta: Meta, run: RunState): ItemKind[] | null {
  if (run.phase !== 'extracted' || run.didBank) return null
  run.didBank = true
  for (const item of run.payload) meta.bank[item] += 1
  return [...run.payload]
}

export function addBonus(run: RunState, amount: number): number {
  if (amount <= 0) return 0
  const room = BONUS_MAX - run.bonus
  const gained = Math.max(0, Math.min(room, amount))
  run.bonus += gained
  return gained
}
