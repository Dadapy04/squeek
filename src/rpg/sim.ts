import { BOSS, CHEST, CRAWLERS, SPAWN, move } from './world.ts'
import type { RpgSave } from './save.ts'

export interface Input {
  moveX: number
  moveY: number
  attack: boolean
  skill: boolean
  dodge: boolean
  interact: boolean
  yaw: number
}

export interface Enemy {
  id: number
  kind: 'crawler' | 'boss'
  x: number
  y: number
  hp: number
  maxHp: number
  state: 'idle' | 'chase' | 'windup' | 'recover' | 'dead'
  timer: number
  phase: 1 | 2
  telegraph: number
}

export interface RpgState {
  x: number
  y: number
  yaw: number
  hp: number
  maxHp: number
  focus: number
  stamina: number
  combo: number
  comboUntil: number
  attackCd: number
  swing: number
  skillCd: number
  skillLeft: number
  dodgeCd: number
  iframes: number
  phase: 'play' | 'dead' | 'victory'
  enemies: Enemy[]
  chestTaken: boolean
  nearChest: boolean
  fang: boolean
  edge: boolean
  checkpoint: 'shrine' | 'gate'
  message: string
  time: number
  attackHeld: boolean
  skillHeld: boolean
  dodgeHeld: boolean
  interactHeld: boolean
}

const PLAYER_R = 10
const SPEED = 118
const FOCUS_MAX = 100
const STAMINA_MAX = 100

export function createRpg(save: RpgSave): RpgState {
  const spawn = SPAWN[save.checkpoint]
  const maxHp = 100 + (save.fang ? 28 : 0)
  return {
    x: spawn.x,
    y: spawn.y,
    yaw: 0,
    hp: maxHp,
    maxHp,
    focus: FOCUS_MAX,
    stamina: STAMINA_MAX,
    combo: 0,
    comboUntil: 0,
    attackCd: 0,
    swing: 0,
    skillCd: 0,
    skillLeft: 0,
    dodgeCd: 0,
    iframes: 0,
    phase: save.bossDefeated ? 'victory' : 'play',
    enemies: save.bossDefeated ? [] : [
      crawler(1, CRAWLERS[0]!.x, CRAWLERS[0]!.y),
      crawler(2, CRAWLERS[1]!.x, CRAWLERS[1]!.y),
      boss(3),
    ],
    chestTaken: save.chestTaken,
    nearChest: false,
    fang: save.fang,
    edge: save.edge,
    checkpoint: save.checkpoint,
    message: save.checkpoint === 'gate' ? 'Api gerbang masih hidup.' : 'Kuil runtuh. Pedang di tangan.',
    time: 0,
    attackHeld: false,
    skillHeld: false,
    dodgeHeld: false,
    interactHeld: false,
  }
}

export function toSave(state: RpgState): RpgSave {
  return {
    fang: state.fang,
    edge: state.edge,
    chestTaken: state.chestTaken,
    checkpoint: state.checkpoint,
    bossDefeated: state.phase === 'victory' || state.enemies.every((enemy) => enemy.kind !== 'boss' || enemy.hp <= 0),
  }
}

export function swordDamage(state: RpgState, combo: number): number {
  const base = combo >= 3 ? 26 : combo === 2 ? 16 : 12
  return base + (state.edge ? 8 : 0)
}

export function step(state: RpgState, input: Input, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0 || state.phase !== 'play') return
  let left = Math.min(dt, 1)
  while (left > 0 && state.phase === 'play') {
    const h = Math.min(0.05, left)
    tick(state, input, h)
    left -= h
  }
}

function tick(state: RpgState, input: Input, h: number): void {
  state.time += h
  state.yaw = input.yaw
  state.attackCd = Math.max(0, state.attackCd - h)
  state.skillCd = Math.max(0, state.skillCd - h)
  state.skillLeft = Math.max(0, state.skillLeft - h)
  state.dodgeCd = Math.max(0, state.dodgeCd - h)
  state.iframes = Math.max(0, state.iframes - h)
  state.swing = Math.max(0, state.swing - h)
  state.focus = Math.min(FOCUS_MAX, state.focus + 14 * h)
  state.stamina = Math.min(STAMINA_MAX, state.stamina + 22 * h)

  const attackEdge = input.attack && !state.attackHeld
  const skillEdge = input.skill && !state.skillHeld
  const dodgeEdge = input.dodge && !state.dodgeHeld
  const interactEdge = input.interact && !state.interactHeld
  state.attackHeld = input.attack
  state.skillHeld = input.skill
  state.dodgeHeld = input.dodge
  state.interactHeld = input.interact

  if (dodgeEdge && state.dodgeCd <= 0 && state.stamina >= 24) {
    state.stamina -= 24
    state.dodgeCd = 0.85
    state.iframes = 0.28
    const len = Math.hypot(input.moveX, input.moveY) || 1
    const dash = move(state.x, state.y, state.x + (input.moveX / len) * 36, state.y + (input.moveY / len) * 36, PLAYER_R)
    state.x = dash.x
    state.y = dash.y
  }

  if (skillEdge && state.skillCd <= 0 && state.focus >= 35) {
    state.focus -= 35
    state.skillCd = 5
    state.skillLeft = 0.22
    state.swing = 0.22
    hitRadius(state, 40, 34 + (state.edge ? 8 : 0))
    state.message = 'Cakar Bayangan.'
  } else if (attackEdge && state.attackCd <= 0 && state.skillLeft <= 0) {
    const next = state.time <= state.comboUntil ? Math.min(3, state.combo + 1) : 1
    state.combo = next === 3 ? 0 : next
    state.comboUntil = state.time + 0.7
    state.attackCd = next === 3 ? 0.48 : 0.28
    state.swing = 0.2
    hitRadius(state, 28 + next * 2, swordDamage(state, next))
    state.message = next === 3 ? 'Kombo ketiga.' : `Tebasan ${next}.`
  }

  const len = Math.hypot(input.moveX, input.moveY)
  if (len > 0.1 && state.iframes < 0.2) {
    const scale = Math.min(1, len)
    const nx = state.x + (input.moveX / len) * SPEED * scale * h
    const ny = state.y + (input.moveY / len) * SPEED * scale * h
    const next = move(state.x, state.y, nx, ny, PLAYER_R)
    state.x = next.x
    state.y = next.y
  }

  if (state.y > 280 && state.checkpoint === 'shrine') {
    state.checkpoint = 'gate'
    state.message = 'Gerbang dicatat. Kematian kembali ke sini.'
  }

  state.nearChest = !state.chestTaken && Math.hypot(state.x - CHEST.x, state.y - CHEST.y) < 22
  if (interactEdge && state.nearChest) {
    state.chestTaken = true
    state.fang = true
    state.edge = true
    state.maxHp = 128
    state.hp = Math.min(state.maxHp, state.hp + 28)
    state.message = 'Taring dan bilah runtuh. Keduanya terpasang.'
  }

  for (const enemy of state.enemies) tickEnemy(state, enemy, h)
  if (state.hp <= 0) {
    state.hp = 0
    state.phase = 'dead'
    state.message = 'Jatuh di runtuhan. Coba lagi dari catatan.'
  }
  const boss = state.enemies.find((enemy) => enemy.kind === 'boss')
  if (boss && boss.hp <= 0 && state.phase === 'play') {
    state.phase = 'victory'
    state.message = 'Penjaga runtuh. Gua diam.'
  }
}

function hitRadius(state: RpgState, range: number, damage: number): void {
  const fx = Math.sin(state.yaw)
  const fy = -Math.cos(state.yaw)
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue
    const dx = enemy.x - state.x
    const dy = enemy.y - state.y
    const dist = Math.hypot(dx, dy)
    if (dist > range) continue
    const dot = dist < 4 ? 1 : (dx * fx + dy * fy) / dist
    if (dot < 0.15) continue
    enemy.hp = Math.max(0, enemy.hp - damage)
    if (enemy.hp <= 0) {
      enemy.state = 'dead'
      enemy.telegraph = 0
    }
    if (enemy.kind === 'boss' && enemy.hp > 0 && enemy.hp <= enemy.maxHp * 0.5) enemy.phase = 2
  }
}

function tickEnemy(state: RpgState, enemy: Enemy, h: number): void {
  if (enemy.hp <= 0) {
    enemy.state = 'dead'
    return
  }
  const dist = Math.hypot(state.x - enemy.x, state.y - enemy.y)
  const reach = enemy.kind === 'boss' ? (enemy.phase === 2 ? 48 : 36) : 22
  const wind = enemy.kind === 'boss' ? (enemy.phase === 2 ? 0.42 : 0.85) : 0.55
  if (enemy.state === 'windup') {
    enemy.timer -= h
    enemy.telegraph = Math.max(0, Math.min(1, 1 - enemy.timer / wind))
    if (enemy.timer > 0) return
    enemy.state = 'recover'
    enemy.timer = enemy.kind === 'boss' && enemy.phase === 2 ? 0.35 : 0.55
    enemy.telegraph = 0
    if (dist < reach + 8 && state.iframes <= 0) hurt(state, enemy.kind === 'boss' ? (enemy.phase === 2 ? 22 : 16) : 10)
    return
  }
  if (enemy.state === 'recover') {
    enemy.timer -= h
    if (enemy.timer <= 0) enemy.state = 'chase'
    return
  }
  const sight = enemy.kind === 'boss' ? 220 : 130
  if (dist > sight) {
    enemy.state = 'idle'
    return
  }
  enemy.state = 'chase'
  if (dist < reach) {
    enemy.state = 'windup'
    enemy.timer = wind
    enemy.telegraph = 0
    return
  }
  const speed = enemy.kind === 'boss' ? (enemy.phase === 2 ? 78 : 52) : 64
  const nx = enemy.x + ((state.x - enemy.x) / dist) * speed * h
  const ny = enemy.y + ((state.y - enemy.y) / dist) * speed * h
  const radius = enemy.kind === 'boss' ? 16 : 12
  const next = move(enemy.x, enemy.y, nx, ny, radius)
  enemy.x = next.x
  enemy.y = next.y
}

function hurt(state: RpgState, amount: number): void {
  state.hp = Math.max(0, state.hp - amount)
  state.iframes = 0.45
  state.message = `Terkena ${amount}.`
}

function crawler(id: number, x: number, y: number): Enemy {
  return { id, kind: 'crawler', x, y, hp: 42, maxHp: 42, state: 'idle', timer: 0, phase: 1, telegraph: 0 }
}

function boss(id: number): Enemy {
  return { id, kind: 'boss', x: BOSS.x, y: BOSS.y, hp: 160, maxHp: 160, state: 'idle', timer: 0, phase: 1, telegraph: 0 }
}
