/** Original arena. Mechanics follow the public battle guide in broad strokes only. */

import { clampCourtyard, courtyardClearance, courtyardRim } from './courtyard.ts'

export const ARENA_R = 250
export const PLAYER_R = 14
export const MAX_WAVE = 10

export type UpgradeId = 'blade' | 'wrist' | 'boots' | 'handle' | 'apron' | 'storm' | 'wind' | 'crit'

export interface UpgradeSpec {
  id: UpgradeId
  name: string
  detail: string
  max: number
}

export const UPGRADES: UpgradeSpec[] = [
  { id: 'blade', name: 'Tebasan Baja', detail: 'Kerusakan +15%', max: 4 },
  { id: 'wrist', name: 'Ayunan Ksatria', detail: 'Serang 10% lebih sering', max: 3 },
  { id: 'boots', name: 'Derap Perkasa', detail: 'Gerak +10%', max: 3 },
  { id: 'handle', name: 'Jangkauan Baja', detail: 'Jangkauan +12%', max: 3 },
  { id: 'apron', name: 'Zirah Dada', detail: 'Luka masuk −8%', max: 2 },
  { id: 'storm', name: 'Badai Pelindung', detail: 'Radius +28, isi lebih cepat, luka badai +4. Bukan perisai.', max: 3 },
  { id: 'wind', name: 'Elakan Angin', detail: 'Hindar siap 15% lebih cepat', max: 2 },
  { id: 'crit', name: 'Titik Maut', detail: 'Kritik +7% (luka 2×)', max: 3 },
]

export type EnemyKind = 'slime' | 'slimeBlue' | 'baby' | 'bat' | 'melee' | 'archer' | 'bomber' | 'armor' | 'ghost' | 'mage' | 'bolt' | 'bossRing' | 'bossMortar' | 'pup'

export interface Telegraph {
  kind: 'ring' | 'circle' | 'line'
  x: number
  y: number
  x2: number
  y2: number
  r: number
  life: number
  max: number
  damage: number
}

export interface Enemy {
  id: number
  kind: EnemyKind
  x: number
  y: number
  hp: number
  maxHp: number
  r: number
  speed: number
  state: 'move' | 'windup' | 'fade'
  timer: number
  hitCd: number
  split: boolean
  armor: boolean
  flash: number
  aimX: number
  aimY: number
  knockX: number
  knockY: number
  mark: Telegraph | null
}

export interface Loot {
  x: number
  y: number
  value: number
}

export interface Input {
  moveX: number
  moveY: number
  dodge: boolean
  storm: boolean
}

export type WeaponLook = 'pedang' | 'tombak'
export type SwingPhase = 'idle' | 'windup' | 'active' | 'recover'
export type FloatKind = 'hit' | 'miss' | 'dodge' | 'shield'
export type BonusMode = 'storm' | 'shield'
export const RESERVE_MAX = 100
export const STORM_BOOST_COST = 24
export const SHIELD_COST = 20
export const SHIELD_TIME = 2.2

export interface FloatText {
  x: number
  y: number
  text: string
  life: number
  max: number
  kind: FloatKind
}

export interface RunState {
  x: number
  y: number
  hp: number
  maxHp: number
  wave: number
  cleared: number
  phase: 'fight' | 'pick' | 'dead' | 'victory' | 'pause'
  enemies: Enemy[]
  loots: Loot[]
  coins: number
  kills: number
  storm: number
  stormMax: number
  reserve: number
  bonusMode: BonusMode
  shieldLeft: number
  liveAssisted: boolean
  attackCd: number
  dodgeCd: number
  dodgeLeft: number
  swing: number
  swingPhase: SwingPhase
  swingT: number
  facing: number
  gait: number
  hitStop: number
  flash: number
  weapon: WeaponLook
  floats: FloatText[]
  stacks: Record<UpgradeId, number>
  offers: UpgradeId[]
  time: number
  dodgeHeld: boolean
  stormHeld: boolean
  message: string
  nextId: number
  rng: number
  bossMarks: number
  dashX: number
  dashY: number
  puffs: Puff[]
  shock: Shock | null
}

export interface Puff {
  x: number
  y: number
  life: number
  max: number
}

export interface Shock {
  x: number
  y: number
  radius: number
  maxRadius: number
  life: number
  maxLife: number
  damage: number
  hit: number[]
}

/** Drawn danger matches these radii. */
export const HIT_RADIUS = { melee: 40, bat: 28, bomber: 50, line: 16, ghost: 26 } as const
export const SWING = { windup: 0.05, active: 0.08, recover: 0.12 } as const

const BASE_REACH = 78
const HAND = 28
const BASE_DAMAGE = 9
const BASE_ATTACK = 0.42
const BASE_SPEED = 156
const DODGE_TIME = 0.28
const DODGE_CD = 1.15
const DASH_SPEED = 440
const SHOCK_TIME = 0.24

export function createRun(): RunState {
  const state: RunState = {
    x: 0,
    y: 0,
    hp: 120,
    maxHp: 120,
    wave: 1,
    cleared: 0,
    phase: 'fight',
    enemies: [],
    loots: [],
    coins: 0,
    kills: 0,
    storm: 0,
    stormMax: 5,
    reserve: 0,
    bonusMode: 'storm',
    shieldLeft: 0,
    liveAssisted: false,
    attackCd: 0.2,
    dodgeCd: 0,
    dodgeLeft: 0,
    swing: 0,
    swingPhase: 'idle',
    swingT: 0,
    facing: 0,
    gait: 0,
    hitStop: 0,
    flash: 0,
    weapon: 'pedang',
    floats: [],
    stacks: { blade: 0, wrist: 0, boots: 0, handle: 0, apron: 0, storm: 0, wind: 0, crit: 0 },
    offers: [],
    time: 0,
    dodgeHeld: false,
    stormHeld: false,
    message: 'Gelombang 1. Mendekat, pedang bekerja sendiri.',
    nextId: 1,
    rng: 17,
    bossMarks: 0,
    dashX: 1,
    dashY: 0,
    puffs: [],
    shock: null,
  }
  spawnWave(state)
  return state
}

export function reachOf(state: RunState): number {
  return BASE_REACH * (1 + 0.12 * state.stacks.handle)
}

export function damageOf(state: RunState): number {
  return BASE_DAMAGE * (1 + 0.15 * state.stacks.blade)
}

export function speedOf(state: RunState): number {
  return BASE_SPEED * (1 + 0.1 * state.stacks.boots)
}

export function attackGap(state: RunState): number {
  return BASE_ATTACK / (1 + 0.1 * state.stacks.wrist)
}

export function dodgeGap(state: RunState): number {
  return DODGE_CD * (1 - 0.15 * state.stacks.wind)
}

export function stormRadius(state: RunState): number {
  return 118 + 28 * state.stacks.storm
}

export function stormHit(state: RunState): number {
  return 16 + 4 * state.stacks.storm
}

export function stormFillNeed(stacks: number): number {
  return Math.max(2, 5 - stacks)
}

export function enemyScale(wave: number): number {
  if (wave <= 1) return 1
  return 1 + (wave - 1) * 0.12
}

export function upgradePreview(state: RunState, id: UpgradeId): string {
  const next = previewState(state, id)
  switch (id) {
    case 'blade':
      return `Tebas ${num(damageOf(state))} → ${num(damageOf(next))}`
    case 'wrist':
      return `Jeda ${num(attackGap(state))}s → ${num(attackGap(next))}s`
    case 'boots':
      return `Gerak ${num(speedOf(state))} → ${num(speedOf(next))}`
    case 'handle':
      return `Capai ${num(reachOf(state))} → ${num(reachOf(next))}`
    case 'apron':
      return `Luka masuk ${num(takenOf(state) * 100)}% → ${num(takenOf(next) * 100)}%`
    case 'wind':
      return `Hindar ${num(dodgeGap(state))}s → ${num(dodgeGap(next))}s`
    case 'crit':
      return `Kritik ${num(critChance(state) * 100)}% → ${num(critChance(next) * 100)}% (2×)`
    case 'storm':
      return `Radius ${num(stormRadius(state))} → ${num(stormRadius(next))}, isi ${state.stormMax} → ${next.stormMax}, luka ${num(stormHit(state))} → ${num(stormHit(next))}. Bukan perisai.`
  }
}

function previewState(state: RunState, id: UpgradeId): RunState {
  const stacks = { ...state.stacks, [id]: state.stacks[id] + 1 }
  return { ...state, stacks, stormMax: id === 'storm' ? stormFillNeed(stacks.storm) : state.stormMax }
}

export function takenOf(state: RunState): number {
  return 1 - 0.08 * state.stacks.apron
}

export function critChance(state: RunState): number {
  return 0.07 * state.stacks.crit
}

function num(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0$/, '').replace(/\.0$/, '')
}

export function step(state: RunState, input: Input, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0 || state.phase === 'pick' || state.phase === 'pause') return
  if (state.phase === 'dead' || state.phase === 'victory') return
  let left = Math.min(dt, 0.4)
  while (left > 0 && state.phase === 'fight') {
    const h = Math.min(0.05, left)
    tick(state, input, h)
    left -= h
  }
}

export function chooseUpgrade(state: RunState, id: UpgradeId): boolean {
  if (state.phase !== 'pick') return false
  const spec = UPGRADES.find((item) => item.id === id)
  if (!spec || !state.offers.includes(id) || state.stacks[id] >= spec.max) return false
  const gained = upgradePreview(state, id)
  state.stacks[id] += 1
  if (id === 'storm') {
    state.stormMax = stormFillNeed(state.stacks.storm)
    if (state.storm > state.stormMax) state.storm = state.stormMax
  }
  state.offers = []
  state.wave += 1
  state.phase = 'fight'
  state.message = `${spec.name} terpasang. ${gained}`
  if (state.wave > MAX_WAVE) {
    state.phase = 'victory'
    state.cleared = MAX_WAVE
    state.message = 'Sepuluh gelombang beres. Rekor lokal, bukan papan online.'
    return true
  }
  spawnWave(state)
  return true
}

function tick(state: RunState, input: Input, h: number): void {
  state.time += h
  decayFloats(state, h)
  state.shieldLeft = Math.max(0, state.shieldLeft - h)
  state.dodgeCd = Math.max(0, state.dodgeCd - h)
  state.dodgeLeft = Math.max(0, state.dodgeLeft - h)
  const dodgeEdge = input.dodge && !state.dodgeHeld
  const stormEdge = input.storm && !state.stormHeld
  state.dodgeHeld = input.dodge
  state.stormHeld = input.storm
  if (dodgeEdge && state.dodgeCd <= 0) {
    state.dodgeLeft = DODGE_TIME
    state.dodgeCd = dodgeGap(state)
    const len = Math.hypot(input.moveX, input.moveY)
    if (len > 0.08) {
      state.dashX = input.moveX / len
      state.dashY = input.moveY / len
      state.facing = Math.atan2(state.dashY, state.dashX)
    } else {
      state.dashX = Math.cos(state.facing)
      state.dashY = Math.sin(state.facing)
    }
    for (let i = 0; i < 5; i++) puff(state, state.x - state.dashX * (8 + i * 6), state.y - state.dashY * (8 + i * 6))
  }
  if (stormEdge && state.storm >= state.stormMax) castStorm(state)
  tickShock(state, h)
  tickPuffs(state, h)
  if (state.hitStop > 0) {
    state.hitStop = Math.max(0, state.hitStop - h)
    return
  }
  state.attackCd = Math.max(0, state.attackCd - h)
  if (state.attackCd < 0.001) state.attackCd = 0
  state.swing = Math.max(0, state.swing - h)
  state.flash = Math.max(0, state.flash - h)

  const len = Math.hypot(input.moveX, input.moveY)
  if (state.dodgeLeft <= 0 && state.swingPhase === 'idle' && len > 0.08) state.facing = Math.atan2(input.moveY, input.moveX)
  state.gait += len > 0.08 ? h * 12 : 0
  if (state.dodgeLeft > 0) {
    slide(state, state.dashX * DASH_SPEED * h, state.dashY * DASH_SPEED * h)
    puff(state, state.x - state.dashX * 14, state.y - state.dashY * 14)
  } else if (len > 0.08) {
    const scale = Math.min(1, len)
    slide(state, (input.moveX / len) * speedOf(state) * scale * h, (input.moveY / len) * speedOf(state) * scale * h)
  }

  updateSwing(state, h)
  for (const enemy of state.enemies) tickEnemy(state, enemy, h)
  resolveMarks(state, h)
  pullLoot(state, h)
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0)
  if (state.hp <= 0) {
    state.hp = 0
    state.phase = 'dead'
    state.message = `Jatuh di gelombang ${state.wave}. Rekor lokal tetap.`
    return
  }
  if (state.enemies.length === 0 && state.phase === 'fight') {
    state.cleared = state.wave
    if (state.wave >= MAX_WAVE) {
      state.phase = 'victory'
      state.message = 'Penjaga terakhir runtuh.'
      return
    }
    state.phase = 'pick'
    state.offers = rollOffers(state)
    state.message = 'Pilih satu. Berlaku sampai lari ini habis. Nyawa tidak pulih.'
  }
}

function updateSwing(state: RunState, h: number): void {
  if (state.swingPhase === 'idle') {
    if (state.attackCd > 0) return
    const target = nearestInReach(state)
    if (!target) return
    state.facing = Math.atan2(target.y - state.y, target.x - state.x)
    state.swingPhase = 'windup'
    state.swingT = 0
    state.attackCd = attackGap(state)
    state.swing = SWING.windup
    return
  }
  state.swingT += h
  state.swing = Math.max(state.swing, 0.08)
  if (state.swingPhase === 'windup' && state.swingT >= SWING.windup) {
    state.swingPhase = 'active'
    state.swingT = 0
    resolveSwing(state)
    return
  }
  if (state.swingPhase === 'active' && state.swingT >= SWING.active) {
    state.swingPhase = 'recover'
    state.swingT = 0
    return
  }
  if (state.swingPhase === 'recover' && state.swingT >= SWING.recover) {
    state.swingPhase = 'idle'
    state.swingT = 0
  }
}

function nearestInReach(state: RunState): Enemy | null {
  const reach = reachOf(state)
  let best: Enemy | null = null
  let bestDist = reach
  for (const enemy of state.enemies) {
    if (enemy.state === 'fade' || enemy.speed === 0 || enemy.hp <= 0) continue
    const dist = Math.hypot(enemy.x - state.x, enemy.y - state.y)
    if (dist < bestDist) {
      best = enemy
      bestDist = dist
    }
  }
  return best
}

function resolveSwing(state: RunState): void {
  const reach = reachOf(state)
  let hits = 0
  const targets = state.enemies.filter((enemy) => enemy.hp > 0 && enemy.speed > 0 && enemy.state !== 'fade')
  for (const enemy of targets) {
    const dx = enemy.x - state.x
    const dy = enemy.y - state.y
    const dist = Math.hypot(dx, dy)
    const angle = wrapAngle(Math.atan2(dy, dx) - state.facing)
    const close = dist < 24
    const aimed = dist <= reach + enemy.r * 0.2 && Math.abs(angle) < 0.9
    if (!close && !aimed) continue
    hits += 1
    const crit = rand(state) < critChance(state)
    hurtEnemy(state, enemy, damageOf(state) * (crit ? 2 : 1))
  }
  if (hits === 0) {
    cue(state, 'Meleset', 'miss', state.x + Math.cos(state.facing) * 36, state.y + Math.sin(state.facing) * 36)
  }
}

export function armAngle(state: RunState): number {
  const facing = state.facing
  if (state.dodgeLeft > 0) return facing + 2.4
  if (state.swingPhase === 'windup') {
    const u = Math.min(1, state.swingT / SWING.windup)
    return facing - 1.2 * u
  }
  if (state.swingPhase === 'active') {
    const u = Math.min(1, state.swingT / SWING.active)
    return facing - 0.15 + 1.1 * u
  }
  if (state.swingPhase === 'recover') {
    const u = Math.min(1, state.swingT / SWING.recover)
    return facing + 0.95 * (1 - u)
  }
  return facing + Math.sin(state.gait) * 0.35
}

export interface HeroPose {
  facing: number
  arm: number
  handX: number
  handY: number
  tipX: number
  tipY: number
  length: number
  width: number
  phase: SwingPhase
  weapon: WeaponLook
}

export function heroPose(state: RunState): HeroPose {
  const arm = armAngle(state)
  const full = Math.max(30, reachOf(state) - HAND)
  let length = full * 0.62
  if (state.swingPhase === 'windup') length = full * (0.42 + 0.12 * Math.min(1, state.swingT / SWING.windup))
  if (state.swingPhase === 'active') length = full
  if (state.swingPhase === 'recover') length = full * (1 - 0.2 * Math.min(1, state.swingT / SWING.recover))
  if (state.dodgeLeft > 0) length = full * 0.4
  const width = state.weapon === 'pedang' ? 8 : 3.2
  const handX = state.x + Math.cos(arm) * HAND
  const handY = state.y + Math.sin(arm) * HAND
  return {
    facing: state.facing,
    arm,
    handX,
    handY,
    tipX: handX + Math.cos(arm) * length,
    tipY: handY + Math.sin(arm) * length,
    length,
    width,
    phase: state.swingPhase,
    weapon: state.weapon,
  }
}

export function addReserve(state: RunState, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  const room = RESERVE_MAX - state.reserve
  const got = Math.max(0, Math.min(room, Math.floor(amount)))
  if (got <= 0) return 0
  state.reserve += got
  state.liveAssisted = true
  return got
}

export function armShield(state: RunState): boolean {
  if (state.phase !== 'fight' || state.bonusMode !== 'shield' || state.shieldLeft > 0) return false
  if (state.reserve < SHIELD_COST) return false
  state.reserve -= SHIELD_COST
  state.shieldLeft = SHIELD_TIME
  state.liveAssisted = true
  state.message = 'Perisai terpasang. Cadangan roda terpakai.'
  return true
}

function castStorm(state: RunState): void {
  state.storm = 0
  state.swing = 0.2
  let bonus = false
  if (state.bonusMode === 'storm' && state.reserve >= STORM_BOOST_COST) {
    state.reserve -= STORM_BOOST_COST
    state.liveAssisted = true
    bonus = true
  }
  const radius = stormRadius(state) + (bonus ? 50 : 0)
  const damage = stormHit(state) + (bonus ? 18 : 0)
  state.shock = { x: state.x, y: state.y, radius: 0, maxRadius: radius, life: SHOCK_TIME, maxLife: SHOCK_TIME, damage, hit: [] }
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    puff(state, state.x + Math.cos(angle) * 16, state.y + Math.sin(angle) * 16)
  }
  state.message = bonus ? 'Badai diperkuat dari cadangan roda.' : 'Badai.'
}

function tickShock(state: RunState, h: number): void {
  const shock = state.shock
  if (!shock) return
  shock.life -= h
  const grown = shock.maxRadius * (1 - Math.max(0, shock.life) / shock.maxLife)
  shock.radius = Math.min(shock.maxRadius, grown)
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 || enemy.speed === 0 || shock.hit.includes(enemy.id)) continue
    if (Math.hypot(enemy.x - shock.x, enemy.y - shock.y) <= shock.radius) {
      shock.hit.push(enemy.id)
      hurtEnemy(state, enemy, shock.damage)
    }
  }
  if (shock.life <= 0) state.shock = null
}

function tickPuffs(state: RunState, h: number): void {
  for (const item of state.puffs) item.life -= h
  state.puffs = state.puffs.filter((item) => item.life > 0).slice(-32)
}

function puff(state: RunState, x: number, y: number): void {
  state.puffs.push({ x, y, life: 0.38, max: 0.38 })
  if (state.puffs.length > 32) state.puffs.splice(0, state.puffs.length - 32)
}

function slide(state: RunState, dx: number, ny: number): void {
  const next = clampCourtyard(state.x + dx, state.y + ny, PLAYER_R)
  state.x = next.x
  state.y = next.y
}

function hurtEnemy(state: RunState, enemy: Enemy, amount: number): void {
  if (enemy.hp <= 0 || enemy.state === 'fade') return
  enemy.hp -= amount
  enemy.flash = 0.16
  const dist = Math.hypot(enemy.x - state.x, enemy.y - state.y) || 1
  const push = enemy.armor ? 0 : 22
  enemy.knockX = ((enemy.x - state.x) / dist) * push
  enemy.knockY = ((enemy.y - state.y) / dist) * push
  enemy.x += enemy.knockX
  enemy.y += enemy.knockY
  if (push > 0) clampEnemy(enemy)
  cue(state, String(Math.round(amount)), 'hit', enemy.x, enemy.y - enemy.r)
  state.hitStop = 0.045
  if (enemy.hp <= 0) killEnemy(state, enemy)
}

function killEnemy(state: RunState, enemy: Enemy): void {
  enemy.hp = 0
  state.kills += 1
  state.storm = Math.min(state.stormMax, state.storm + (enemy.kind === 'baby' || enemy.kind === 'pup' ? 0.45 : 1))
  state.loots.push({ x: enemy.x, y: enemy.y, value: enemy.kind.startsWith('boss') ? 8 : 1 })
  if (enemy.split) {
    spawnBaby(state, enemy, 12, -10)
    spawnBaby(state, enemy, -12, 8)
  }
}

function spawnBaby(state: RunState, parent: Enemy, ox: number, oy: number): void {
  const baby = makeEnemy(state, 'baby', parent.x + ox, parent.y + oy)
  const grown = Math.round((parent.kind === 'slimeBlue' ? 10 : 6) * enemyScale(state.wave))
  baby.hp = grown
  baby.maxHp = grown
  baby.split = false
  baby.r = 10
  state.enemies.push(baby)
}

function tickEnemy(state: RunState, enemy: Enemy, h: number): void {
  if (enemy.hp <= 0) return
  if (enemy.kind === 'bolt' || (enemy.speed === 0 && enemy.mark)) return
  enemy.flash = Math.max(0, enemy.flash - h)
  enemy.hitCd = Math.max(0, enemy.hitCd - h)
  const dx = state.x - enemy.x
  const dy = state.y - enemy.y
  const dist = Math.hypot(dx, dy) || 1
  if (enemy.kind === 'bossRing') return bossRing(state, enemy, h, dist)
  if (enemy.kind === 'bossMortar') return bossMortar(state, enemy, h, dist)
  if (enemy.kind === 'bat') return bat(state, enemy, h, dx, dy, dist)
  if (enemy.kind === 'melee' || enemy.kind === 'armor') return melee(state, enemy, h, dx, dy, dist)
  if (enemy.kind === 'archer') return archer(state, enemy, h, dx, dy, dist)
  if (enemy.kind === 'bomber') return bomber(state, enemy, h, dx, dy, dist)
  if (enemy.kind === 'ghost') return ghost(state, enemy, h, dist)
  if (enemy.kind === 'mage') return mage(state, enemy, h, dist)
  chase(enemy, dx, dy, dist, h)
  if (dist < enemy.r + PLAYER_R + 4 && enemy.hitCd <= 0) {
    enemy.hitCd = 0.85
    hurtPlayer(state, 6 + Math.floor(state.wave / 2))
  }
}

function bossRing(state: RunState, enemy: Enemy, h: number, dist: number): void {
  enemy.timer -= h
  if (enemy.state === 'windup') {
    if (enemy.mark) enemy.mark.life -= h
    if (enemy.timer <= 0) {
      if (enemy.mark && inside(state.x, state.y, enemy.mark.x, enemy.mark.y, enemy.mark.r)) hurtPlayer(state, enemy.mark.damage)
      enemy.mark = null
      enemy.state = 'move'
      enemy.timer = 1.15
    }
    return
  }
  chase(enemy, state.x - enemy.x, state.y - enemy.y, dist, h * 0.55)
  if (enemy.timer <= 0) {
    enemy.state = 'windup'
    enemy.timer = 0.7
    enemy.mark = { kind: 'ring', x: state.x, y: state.y, x2: state.x, y2: state.y, r: 64, life: 0.75, max: 0.75, damage: 14 + state.wave }
  }
}

function bossMortar(state: RunState, enemy: Enemy, h: number, dist: number): void {
  enemy.timer -= h
  if (dist > 70) chase(enemy, state.x - enemy.x, state.y - enemy.y, dist, h * 0.4)
  if (enemy.timer <= 0) {
    enemy.timer = 1.35
    state.enemies.push(markOnly(state, state.x, state.y, 36, 0.62, 14 + state.wave))
    state.enemies.push(markOnly(state, state.x + 40, state.y - 20, 28, 0.62, 12 + state.wave))
  }
  if (enemy.hp < enemy.maxHp * 0.7 && state.bossMarks < 1) {
    state.bossMarks = 1
    state.enemies.push(makeEnemy(state, 'pup', enemy.x + 20, enemy.y))
    state.enemies.push(makeEnemy(state, 'pup', enemy.x - 20, enemy.y))
  }
  if (enemy.hp < enemy.maxHp * 0.4 && state.bossMarks < 2) {
    state.bossMarks = 2
    state.enemies.push(makeEnemy(state, 'pup', enemy.x, enemy.y + 24))
  }
}

function markOnly(state: RunState, x: number, y: number, r: number, life: number, damage: number): Enemy {
  const enemy = makeEnemy(state, 'pup', x, y)
  enemy.hp = 1
  enemy.maxHp = 1
  enemy.r = 4
  enemy.speed = 0
  enemy.state = 'windup'
  enemy.timer = life
  enemy.mark = { kind: 'circle', x, y, x2: x, y2: y, r, life, max: life, damage }
  return enemy
}

function bat(state: RunState, enemy: Enemy, h: number, dx: number, dy: number, dist: number): void {
  if (enemy.state === 'windup') {
    enemy.timer -= h
    if (enemy.mark) enemy.mark.life = Math.max(enemy.timer, 0)
    if (enemy.timer <= 0) {
      enemy.state = 'move'
      if (dist < HIT_RADIUS.bat) hurtPlayer(state, 8 + state.wave)
      enemy.mark = null
    }
    return
  }
  const weave = Math.sin(state.time * 6 + enemy.id) * 30
  const px = -dy / dist
  const py = dx / dist
  enemy.x += ((dx / dist) * enemy.speed + px * weave) * h
  enemy.y += ((dy / dist) * enemy.speed + py * weave) * h
  clampEnemy(enemy)
  if (dist < HIT_RADIUS.bat - 2 && enemy.hitCd <= 0) {
    enemy.hitCd = 1.2
    enemy.state = 'windup'
    enemy.timer = 0.4
    enemy.mark = circleMark(enemy.x, enemy.y, HIT_RADIUS.bat, 0.4, 8 + state.wave)
  }
}

function melee(state: RunState, enemy: Enemy, h: number, dx: number, dy: number, dist: number): void {
  if (enemy.state === 'windup') {
    enemy.timer -= h
    enemy.aimX = state.x
    enemy.aimY = state.y
    if (enemy.mark) {
      enemy.mark.x = enemy.x
      enemy.mark.y = enemy.y
      enemy.mark.life = Math.max(enemy.timer, 0)
    }
    if (enemy.timer <= 0) {
      const damage = enemy.mark?.damage ?? (enemy.armor ? 12 + state.wave : 10 + state.wave)
      enemy.state = 'move'
      if (dist < HIT_RADIUS.melee) hurtPlayer(state, damage)
      enemy.mark = null
    }
    return
  }
  chase(enemy, dx, dy, dist, h)
  if (dist < 34 && enemy.hitCd <= 0) {
    enemy.hitCd = 1.2
    enemy.state = 'windup'
    enemy.timer = 0.5
    enemy.mark = circleMark(enemy.x, enemy.y, HIT_RADIUS.melee, 0.5, enemy.armor ? 12 + state.wave : 10 + state.wave)
  }
}

function archer(state: RunState, enemy: Enemy, h: number, dx: number, dy: number, dist: number): void {
  if (enemy.state === 'windup') {
    enemy.timer -= h
    if (enemy.mark) enemy.mark.life -= h
    if (enemy.timer <= 0) {
      if (pointLine(state.x, state.y, enemy.x, enemy.y, enemy.aimX, enemy.aimY) < (enemy.mark?.r ?? HIT_RADIUS.line)) hurtPlayer(state, 11 + state.wave)
      enemy.mark = null
      enemy.state = 'move'
      enemy.hitCd = 0.9
    }
    return
  }
  if (dist < 90) chase(enemy, -dx, -dy, dist, h * 0.8)
  else if (dist > 160) chase(enemy, dx, dy, dist, h)
  enemy.hitCd -= h
  if (enemy.hitCd <= 0 && dist < 210) {
    enemy.state = 'windup'
    enemy.timer = 0.55
    enemy.aimX = state.x
    enemy.aimY = state.y
    enemy.mark = { kind: 'line', x: enemy.x, y: enemy.y, x2: state.x, y2: state.y, r: HIT_RADIUS.line, life: 0.55, max: 0.55, damage: 11 + state.wave }
  }
}

function bomber(state: RunState, enemy: Enemy, h: number, dx: number, dy: number, dist: number): void {
  if (enemy.state === 'windup') {
    enemy.timer -= h
    if (enemy.mark) {
      enemy.mark.x = enemy.x
      enemy.mark.y = enemy.y
      enemy.mark.life = Math.max(enemy.timer, 0)
    }
    if (enemy.timer <= 0) {
      const blast = enemy.mark?.r ?? HIT_RADIUS.bomber
      if (dist < blast) hurtPlayer(state, enemy.mark?.damage ?? 14 + state.wave)
      enemy.mark = null
      for (const other of state.enemies) {
        if (other.id !== enemy.id && other.hp > 0 && Math.hypot(other.x - enemy.x, other.y - enemy.y) < blast) hurtEnemy(state, other, 8)
      }
      killEnemy(state, enemy)
    }
    return
  }
  chase(enemy, dx, dy, dist, h)
  if (dist < 28) {
    enemy.state = 'windup'
    enemy.timer = 0.45
    enemy.mark = circleMark(enemy.x, enemy.y, HIT_RADIUS.bomber, 0.45, 14 + state.wave)
  }
}

function ghost(state: RunState, enemy: Enemy, h: number, dist: number): void {
  enemy.timer -= h
  if (enemy.state === 'fade') {
    if (enemy.timer <= 0) {
      enemy.state = 'move'
      enemy.x = state.x + 18
      enemy.y = state.y
      clampEnemy(enemy)
      enemy.timer = 0.28
      enemy.mark = circleMark(enemy.x, enemy.y, HIT_RADIUS.ghost, 0.28, 12)
    }
    return
  }
  if (enemy.mark) {
    enemy.mark.life = Math.max(enemy.timer, 0)
    if (enemy.timer <= 0) {
      if (inside(state.x, state.y, enemy.mark.x, enemy.mark.y, enemy.mark.r)) hurtPlayer(state, enemy.mark.damage)
      enemy.mark = null
    }
    return
  }
  if (rand(state) < h * 0.35) {
    enemy.state = 'fade'
    enemy.timer = 0.9
    return
  }
  chase(enemy, state.x - enemy.x, state.y - enemy.y, dist, h)
}

function mage(state: RunState, enemy: Enemy, h: number, dist: number): void {
  enemy.timer -= h
  if (dist < 100) chase(enemy, enemy.x - state.x, enemy.y - state.y, dist, h)
  else chase(enemy, state.x - enemy.x, state.y - enemy.y, dist, h * 0.5)
  if (enemy.timer <= 0) {
    enemy.timer = 1.5
    const shot = markOnly(state, state.x, state.y, 22, 0.7, 12 + Math.floor(state.wave / 2))
    shot.kind = 'bolt'
    shot.speed = 90
    shot.aimX = state.x
    shot.aimY = state.y
    shot.x = enemy.x
    shot.y = enemy.y
    shot.mark = { kind: 'circle', x: enemy.x, y: enemy.y, x2: state.x, y2: state.y, r: 12, life: 0.7, max: 0.7, damage: shot.mark?.damage ?? 12 }
    state.enemies.push(shot)
  }
}

function resolveMarks(state: RunState, h: number): void {
  for (const enemy of state.enemies) {
    if (enemy.kind === 'bolt' && enemy.mark) {
      const dx = enemy.aimX - enemy.x
      const dy = enemy.aimY - enemy.y
      const dist = Math.hypot(dx, dy) || 1
      enemy.x += (dx / dist) * enemy.speed * h
      enemy.y += (dy / dist) * enemy.speed * h
      enemy.mark.x = enemy.x
      enemy.mark.y = enemy.y
      enemy.mark.life -= h
      if (Math.hypot(state.x - enemy.x, state.y - enemy.y) < enemy.mark.r || enemy.mark.life <= 0) {
        if (Math.hypot(state.x - enemy.x, state.y - enemy.y) < enemy.mark.r) hurtPlayer(state, enemy.mark.damage)
        enemy.hp = 0
      }
    }
    if ((enemy.kind === 'pup' || enemy.kind === 'bossMortar') && enemy.mark && enemy.mark.kind === 'circle' && enemy.speed === 0) {
      enemy.mark.life -= h
      enemy.timer -= h
      if (enemy.mark.life <= 0) {
        if (inside(state.x, state.y, enemy.mark.x, enemy.mark.y, enemy.mark.r)) hurtPlayer(state, enemy.mark.damage)
        enemy.hp = 0
      }
    }
  }
}

function circleMark(x: number, y: number, r: number, life: number, damage: number): Telegraph {
  return { kind: 'circle', x, y, x2: x, y2: y, r, life, max: life, damage }
}

function chase(enemy: Enemy, dx: number, dy: number, dist: number, h: number): void {
  enemy.x += (dx / dist) * enemy.speed * h
  enemy.y += (dy / dist) * enemy.speed * h
  clampEnemy(enemy)
}

function hurtPlayer(state: RunState, amount: number): void {
  if (state.hp <= 0) return
  if (state.dodgeLeft > 0) {
    cue(state, 'Elak', 'dodge', state.x, state.y - 20)
    return
  }
  if (state.shieldLeft > 0) {
    cue(state, 'Perisai', 'shield', state.x, state.y - 20)
    return
  }
  const reduced = amount * takenOf(state)
  state.hp = Math.max(0, state.hp - reduced)
  state.flash = 0.16
}

function decayFloats(state: RunState, h: number): void {
  for (const item of state.floats) {
    item.life -= h
    item.y -= 22 * h
  }
  state.floats = state.floats.filter((item) => item.life > 0).slice(-6)
}

function cue(state: RunState, text: string, kind: FloatKind, x: number, y: number): void {
  if (kind !== 'hit' && state.floats.some((item) => item.kind === kind && item.life > 0.45)) return
  state.floats.push({ x, y, text, life: 0.75, max: 0.75, kind })
}

function wrapAngle(angle: number): number {
  let value = angle
  while (value > Math.PI) value -= Math.PI * 2
  while (value < -Math.PI) value += Math.PI * 2
  return value
}

function pullLoot(state: RunState, h: number): void {
  const magnet = 36
  state.loots = state.loots.filter((loot) => {
    const dx = state.x - loot.x
    const dy = state.y - loot.y
    const dist = Math.hypot(dx, dy) || 1
    if (dist < magnet) {
      loot.x += (dx / dist) * 160 * h
      loot.y += (dy / dist) * 160 * h
    }
    if (dist < PLAYER_R + 6) {
      state.coins += loot.value
      return false
    }
    return true
  })
}

function rollOffers(state: RunState): UpgradeId[] {
  const pool = UPGRADES.filter((item) => state.stacks[item.id] < item.max).map((item) => item.id)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand(state) * (i + 1))
    const swap = pool[i]!
    pool[i] = pool[j]!
    pool[j] = swap
  }
  return pool.slice(0, 3)
}

function spawnWave(state: RunState): void {
  state.bossMarks = 0
  const wave = state.wave
  if (wave === 5) {
    state.enemies = [makeEnemy(state, 'bossRing', 0, -160)]
    state.message = 'Gelombang 5. Cincin merah, lalu hantaman. Keluar dari lingkaran.'
    return
  }
  if (wave === 10) {
    state.enemies = [makeEnemy(state, 'bossMortar', 0, -150)]
    state.message = 'Gelombang 10. Tanda merah di tanah, lalu anak tikus.'
    return
  }
  const roster: Record<number, EnemyKind[]> = {
    1: ['slime', 'slime', 'slime', 'slime', 'slime', 'slime'],
    2: ['slime', 'slime', 'slime', 'bat', 'bat'],
    3: ['slime', 'slime', 'bat', 'melee'],
    4: ['slimeBlue', 'slime', 'slime', 'archer'],
    6: ['slime', 'slime', 'bomber', 'melee', 'bat'],
    7: ['armor', 'archer', 'slime', 'slime'],
    8: ['ghost', 'bat', 'bat', 'slime', 'slime'],
    9: ['mage', 'archer', 'bat', 'slime', 'slime'],
  }
  const spawns = roster[wave] ?? ['slime']
  state.enemies = spawns.map((kind, index) => {
    const angle = (index / spawns.length) * Math.PI * 2 + 0.4
    const spot = courtyardRim(angle, 36)
    return makeEnemy(state, kind, spot.x, spot.y)
  })
}

function makeEnemy(state: RunState, kind: EnemyKind, x: number, y: number): Enemy {
  const scale = enemyScale(state.wave)
  const table: Record<EnemyKind, { hp: number; r: number; speed: number; split: boolean; armor: boolean }> = {
    slime: { hp: 22, r: 16, speed: 48, split: true, armor: false },
    slimeBlue: { hp: 24, r: 18, speed: 42, split: true, armor: false },
    baby: { hp: 6, r: 10, speed: 62, split: false, armor: false },
    bat: { hp: 10, r: 12, speed: 78, split: false, armor: false },
    melee: { hp: 20, r: 14, speed: 58, split: false, armor: false },
    archer: { hp: 12, r: 13, speed: 46, split: false, armor: false },
    bomber: { hp: 16, r: 14, speed: 74, split: false, armor: false },
    armor: { hp: 28, r: 16, speed: 40, split: false, armor: true },
    ghost: { hp: 14, r: 13, speed: 54, split: false, armor: false },
    mage: { hp: 12, r: 13, speed: 44, split: false, armor: false },
    bolt: { hp: 1, r: 8, speed: 90, split: false, armor: false },
    bossRing: { hp: 120, r: 26, speed: 34, split: false, armor: true },
    bossMortar: { hp: 150, r: 24, speed: 30, split: false, armor: true },
    pup: { hp: 8, r: 10, speed: 100, split: false, armor: false },
  }
  const spec = table[kind]
  return {
    id: state.nextId++,
    kind,
    x,
    y,
    hp: Math.round(spec.hp * scale),
    maxHp: Math.round(spec.hp * scale),
    r: spec.r,
    speed: spec.speed,
    state: 'move',
    timer: kind === 'bossRing' ? 0.8 : kind === 'bossMortar' ? 0.6 : 0.4,
    hitCd: 0.3,
    split: spec.split,
    armor: spec.armor,
    flash: 0,
    aimX: x,
    aimY: y,
    knockX: 0,
    knockY: 0,
    mark: null,
  }
}

function clampEnemy(enemy: Enemy): void {
  const next = clampCourtyard(enemy.x, enemy.y, enemy.r)
  enemy.x = next.x
  enemy.y = next.y
}

function inside(x: number, y: number, cx: number, cy: number, r: number): boolean {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

function pointLine(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len))
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t))
}

function rand(state: RunState): number {
  state.rng = (state.rng * 1664525 + 1013904223) >>> 0
  return state.rng / 4294967296
}

/** A scripted fighter used only by the victory test. It is not a player session. */
export function scriptedStep(state: RunState): Input {
  let mx = 0
  let my = 0
  let dodge = false
  const danger = dangerPoint(state)
  if (danger) {
    const dx = state.x - danger.x
    const dy = state.y - danger.y
    const dist = Math.hypot(dx, dy)
    if (dist < 0.5) {
      const options = [
        { mx: 1, my: 0, room: courtyardClearance(state.x, state.y, 1, 0) },
        { mx: -1, my: 0, room: courtyardClearance(state.x, state.y, -1, 0) },
        { mx: 0, my: 1, room: courtyardClearance(state.x, state.y, 0, 1) },
        { mx: 0, my: -1, room: courtyardClearance(state.x, state.y, 0, -1) },
      ]
      options.sort((a, b) => b.room - a.room)
      mx = options[0]?.mx ?? 1
      my = options[0]?.my ?? 0
    } else {
      mx = dx / dist
      my = dy / dist
    }
    if (dist < danger.r + 8) dodge = true
  } else {
    const nearest = nearestEnemy(state)
    if (nearest) {
      const dx = nearest.x - state.x
      const dy = nearest.y - state.y
      const dist = Math.hypot(dx, dy) || 1
      const comfort = nearest.kind === 'archer' || nearest.kind === 'mage' ? reachOf(state) * 0.92 : Math.min(reachOf(state) * 0.82, 46)
      if (dist > comfort) {
        mx = dx / dist
        my = dy / dist
      } else {
        mx = -dx / dist
        my = -dy / dist
      }
      if (nearest.state === 'windup' || dist < nearest.r + 18) dodge = true
    }
  }
  return { moveX: mx, moveY: my, dodge, storm: state.storm >= state.stormMax }
}

function nearestEnemy(state: RunState): Enemy | null {
  let best: Enemy | null = null
  let bestDist = 1e9
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 || enemy.speed === 0) continue
    const dist = Math.hypot(enemy.x - state.x, enemy.y - state.y)
    if (dist < bestDist) {
      best = enemy
      bestDist = dist
    }
  }
  return best
}

function dangerPoint(state: RunState): { x: number; y: number; r: number } | null {
  let best: { x: number; y: number; r: number } | null = null
  let bestDist = 1e9
  for (const enemy of state.enemies) {
    if (enemy.state === 'windup' && enemy.speed > 0 && enemy.kind !== 'archer' && enemy.kind !== 'mage') {
      const dist = Math.hypot(state.x - enemy.x, state.y - enemy.y)
      const reach = enemy.kind === 'bomber' ? 72 : 56
      if (dist < reach && dist < bestDist) {
        best = { x: enemy.x, y: enemy.y, r: enemy.kind === 'bomber' ? 58 : 44 }
        bestDist = dist
      }
    }
    const mark = enemy.mark
    if (!mark) continue
    if (mark.kind === 'line') {
      const dist = pointLine(state.x, state.y, mark.x, mark.y, mark.x2, mark.y2)
      if (dist < 22 && dist < bestDist) {
        const dx = mark.x2 - mark.x
        const dy = mark.y2 - mark.y
        const len = Math.hypot(dx, dy) || 1
        best = { x: state.x + dy / len, y: state.y - dx / len, r: 20 }
        bestDist = dist
      }
      continue
    }
    const dist = Math.hypot(state.x - mark.x, state.y - mark.y)
    if (dist < mark.r + 20 && dist < bestDist) {
      best = { x: mark.x, y: mark.y, r: mark.r }
      bestDist = dist
    }
  }
  return best
}
