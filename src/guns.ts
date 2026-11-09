/** Hitscan weapons for the third-person layer. Sword stays melee in run.ts. */

export const WEAPON_ORDER = ['sword', 'pistol', 'smg', 'assault', 'shotgun', 'marksman'] as const
export type WeaponId = (typeof WEAPON_ORDER)[number]

export interface WeaponSpec {
  id: WeaponId
  label: string
  kind: 'melee' | 'pistol' | 'smg' | 'assault' | 'shotgun' | 'marksman'
  damage: number
  pellets: number
  rpm: number
  mag: number
  reserve: number
  reload: number
  recoil: number
  spread: number
  range: number
  auto: boolean
}

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  sword: { id: 'sword', label: 'Pedang', kind: 'melee', damage: 0, pellets: 0, rpm: 0, mag: 0, reserve: 0, reload: 0, recoil: 0, spread: 0, range: 0, auto: false },
  pistol: { id: 'pistol', label: 'Pistol', kind: 'pistol', damage: 18, pellets: 1, rpm: 280, mag: 8, reserve: 24, reload: 1.05, recoil: 0.05, spread: 0.012, range: 280, auto: false },
  smg: { id: 'smg', label: 'SMG', kind: 'smg', damage: 9, pellets: 1, rpm: 740, mag: 26, reserve: 52, reload: 1.45, recoil: 0.028, spread: 0.045, range: 210, auto: true },
  assault: { id: 'assault', label: 'Serbu', kind: 'assault', damage: 14, pellets: 1, rpm: 520, mag: 30, reserve: 60, reload: 1.85, recoil: 0.036, spread: 0.02, range: 340, auto: true },
  shotgun: { id: 'shotgun', label: 'Shotgun', kind: 'shotgun', damage: 7, pellets: 6, rpm: 68, mag: 5, reserve: 15, reload: 2.15, recoil: 0.1, spread: 0.16, range: 130, auto: false },
  marksman: { id: 'marksman', label: 'Jitu', kind: 'marksman', damage: 44, pellets: 1, rpm: 48, mag: 5, reserve: 15, reload: 2.35, recoil: 0.12, spread: 0.004, range: 480, auto: false },
}

export type BodyPart = 'head' | 'torso' | 'arm' | 'leg'

export interface Limb {
  part: BodyPart
  x: number
  y: number
  z: number
  hx: number
  hy: number
  hz: number
}

/** Local boxes. x is right, y is forward, z is up. The 3D view uses these exact sizes. */
export const LIMBS: Limb[] = [
  { part: 'leg', x: -3.2, y: 0, z: 4, hx: 2.4, hy: 2.2, hz: 4 },
  { part: 'leg', x: 3.2, y: 0, z: 4, hx: 2.4, hy: 2.2, hz: 4 },
  { part: 'torso', x: 0, y: 0.4, z: 14, hx: 5, hy: 3.5, hz: 6 },
  { part: 'arm', x: -8, y: 1, z: 14, hx: 1.8, hy: 1.8, hz: 3.5 },
  { part: 'arm', x: 8, y: 1, z: 14, hx: 1.8, hy: 1.8, hz: 3.5 },
  { part: 'head', x: 0, y: 1.4, z: 23.2, hx: 3, hy: 3, hz: 3 },
]

export const PART_NAME: Record<BodyPart, string> = {
  head: 'kepala',
  torso: 'badan',
  arm: 'lengan',
  leg: 'kaki',
}

const PART_SCALE: Record<BodyPart, number> = {
  head: 1.6,
  torso: 0.85,
  arm: 0.7,
  leg: 0.72,
}

export interface BallisticEnemy {
  x: number
  y: number
  hp: number
  state: string
  timer: number
  face: number
}

export interface Tracer {
  x: number
  y: number
  z: number
  x2: number
  y2: number
  z2: number
  life: number
}

export interface Impact {
  x: number
  y: number
  z: number
  life: number
  part: BodyPart | 'wall'
}

export interface GunCarrier {
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
  stance: 'stand' | 'crouch'
  weapon: WeaponId
  fireMode?: 'auto' | 'semi'
  mag: Record<WeaponId, number>
  reserve: Record<WeaponId, number>
  reloadLeft: number
  recoil: number
  fireCd: number
  triggerHeld: boolean
  switchHeld: boolean
  reloadHeld: boolean
  attackDamage: number
  time: number
  boostUntil: number
  cues: string[]
  tracers: Tracer[]
  impacts: Impact[]
  muzzle: number
  durability: Partial<Record<WeaponId, number>>
  noise: number
  noiseX: number
  noiseY: number
  noiseT: number
  popups: { x: number; y: number; text: string; life: number }[]
  enemies: BallisticEnemy[]
}

export interface GunInput {
  fire?: boolean
  reload?: boolean
  switchWeapon?: boolean
  frozen?: boolean
}

export function emptyMag(): Record<WeaponId, number> {
  return {
    sword: 0,
    pistol: WEAPONS.pistol.mag,
    smg: WEAPONS.smg.mag,
    assault: WEAPONS.assault.mag,
    shotgun: WEAPONS.shotgun.mag,
    marksman: WEAPONS.marksman.mag,
  }
}

export function emptyReserve(): Record<WeaponId, number> {
  return {
    sword: 0,
    pistol: WEAPONS.pistol.reserve,
    smg: WEAPONS.smg.reserve,
    assault: WEAPONS.assault.reserve,
    shotgun: WEAPONS.shotgun.reserve,
    marksman: WEAPONS.marksman.reserve,
  }
}

export function eyeHeight(run: Pick<GunCarrier, 'stance' | 'z'>): number {
  return (run.stance === 'crouch' ? 11 : 18) + run.z
}

/** Last clear distance behind the player. Never closer than minDist, never past a wall. */
export function chaseDistance(
  x: number,
  y: number,
  yaw: number,
  desired: number,
  minDist: number,
  blockedAt: (x: number, y: number) => boolean,
): number {
  const fwdX = Math.sin(yaw)
  const fwdZ = -Math.cos(yaw)
  let dist = minDist
  for (let probe = minDist; probe <= desired; probe += 4) {
    if (blockedAt(x - fwdX * probe, y - fwdZ * probe)) break
    dist = probe
  }
  return dist
}

function pushCue(run: GunCarrier, name: string): void {
  run.cues.push(name)
  if (run.cues.length > 12) run.cues.shift()
}

function aimDir(yaw: number, pitch: number): { x: number; y: number; z: number } {
  const cp = Math.cos(pitch)
  return { x: Math.sin(yaw) * cp, y: -Math.cos(yaw) * cp, z: Math.sin(pitch) }
}

export function falloff(kind: WeaponSpec['kind'], distance: number, range: number): number {
  const t = Math.min(1, Math.max(0, distance / Math.max(1, range)))
  if (kind === 'shotgun') return 1 - t * 0.75
  if (kind === 'marksman') return 1 - t * 0.12
  if (kind === 'pistol') return 1 - t * 0.45
  return 1 - t * 0.35
}

function rayLocal(face: number, dx: number, dy: number, dz: number): { x: number; y: number; z: number } {
  const rx = Math.cos(face)
  const rz = Math.sin(face)
  const fx = Math.sin(face)
  const fz = -Math.cos(face)
  return { x: dx * rx + dy * rz, y: dx * fx + dy * fz, z: dz }
}

function enterBox(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, limb: Limb): number | null {
  let tmin = 0
  let tmax = 1e9
  const axes: Array<[number, number, number, number]> = [
    [ox, dx, limb.x - limb.hx, limb.x + limb.hx],
    [oy, dy, limb.y - limb.hy, limb.y + limb.hy],
    [oz, dz, limb.z - limb.hz, limb.z + limb.hz],
  ]
  for (const [origin, dir, min, max] of axes) {
    if (Math.abs(dir) < 1e-8) {
      if (origin < min || origin > max) return null
      continue
    }
    let t1 = (min - origin) / dir
    let t2 = (max - origin) / dir
    if (t1 > t2) {
      const swap = t1
      t1 = t2
      t2 = swap
    }
    tmin = Math.max(tmin, t1)
    tmax = Math.min(tmax, t2)
    if (tmin > tmax) return null
  }
  if (tmax < 0) return null
  return tmin >= 0 ? tmin : tmax
}

function march(
  run: GunCarrier,
  yaw: number,
  pitch: number,
  range: number,
  blocked: (x: number, y: number, radius: number) => boolean,
): { enemy: BallisticEnemy | null; part: BodyPart | 'wall' | 'miss'; x: number; y: number; z: number; distance: number } {
  const originZ = eyeHeight(run)
  const dir = aimDir(yaw, pitch)
  const len = Math.hypot(dir.x, dir.y, dir.z) || 1
  const dx = dir.x / len
  const dy = dir.y / len
  const dz = dir.z / len
  let bestT = range + 1
  let bestEnemy: BallisticEnemy | null = null
  let bestPart: BodyPart | null = null
  for (const enemy of run.enemies) {
    if (enemy.hp <= 0) continue
    const localOrigin = rayLocal(enemy.face, run.x - enemy.x, run.y - enemy.y, originZ)
    const localDir = rayLocal(enemy.face, dx, dy, dz)
    for (const limb of LIMBS) {
      const t = enterBox(localOrigin.x, localOrigin.y, localOrigin.z, localDir.x, localDir.y, localDir.z, limb)
      if (t == null || t < 0 || t > range || t >= bestT) continue
      bestT = t
      bestEnemy = enemy
      bestPart = limb.part
    }
  }
  const limit = bestEnemy ? bestT : range
  const steps = Math.max(1, Math.ceil(limit / 6))
  for (let i = 1; i <= steps; i++) {
    const t = Math.min(limit, i * 6)
    if (t <= 0.5) continue
    const x = run.x + dx * t
    const y = run.y + dy * t
    const z = originZ + dz * t
    if (z < 0 || z > 48 || blocked(x, y, 1)) {
      return { enemy: null, part: 'wall', x, y, z, distance: t }
    }
  }
  if (!bestEnemy || !bestPart) {
    return { enemy: null, part: 'miss', x: run.x + dx * range, y: run.y + dy * range, z: originZ + dz * range, distance: range }
  }
  return {
    enemy: bestEnemy,
    part: bestPart,
    x: run.x + dx * bestT,
    y: run.y + dy * bestT,
    z: originZ + dz * bestT,
    distance: bestT,
  }
}

function shoot(
  run: GunCarrier,
  spec: WeaponSpec,
  blocked: (x: number, y: number, radius: number) => boolean,
): void {
  const dur = run.durability[spec.id] ?? 100
  if (dur <= 0) {
    pushCue(run, 'dry')
    return
  }
  run.durability[spec.id] = dur - 1
  run.mag[spec.id] -= 1
  run.fireCd = spec.rpm > 0 ? 60 / spec.rpm : 0.4
  run.muzzle = 0.06
  const loud = spec.kind === 'shotgun' ? 240 : spec.kind === 'marksman' ? 300 : spec.kind === 'assault' ? 190 : spec.kind === 'smg' ? 150 : 170
  run.noise = loud
  run.noiseX = run.x
  run.noiseY = run.y
  run.noiseT = 0.55
  const wear = 0.7 + 0.3 * (dur / 100)
  const bonus = spec.pellets > 1 ? 0 : Math.max(0, run.attackDamage - 12)
  const boosted = run.time < run.boostUntil ? 1.7 : 1
  const width = spec.spread + run.recoil * 0.35
  const kick = spec.recoil
  const count = Math.max(1, spec.pellets)
  let hits = 0
  let walled = false
  const originZ = eyeHeight(run)
  const struck = new Set<string>()
  for (let i = 0; i < count; i++) {
    const offset = count === 1 ? 0 : -width / 2 + (width * i) / (count - 1)
    const aimPitch = run.pitch + run.recoil * 0.25
    const hit = march(run, run.yaw + offset, aimPitch, spec.range, blocked)
    run.tracers.push({ x: run.x, y: run.y, z: originZ, x2: hit.x, y2: hit.y, z2: hit.z, life: 0.07 })
    if (hit.part === 'wall' || hit.part === 'miss') {
      if (hit.part === 'wall') walled = true
      run.impacts.push({ x: hit.x, y: hit.y, z: hit.z, life: 0.18, part: 'wall' })
      continue
    }
    if (!hit.enemy) continue
    const key = `${hit.enemy.x}:${hit.part}:${i}`
    if (struck.has(key)) continue
    struck.add(key)
    const amount = Math.max(1, Math.round((spec.damage + (i === 0 ? bonus : 0)) * boosted * wear * PART_SCALE[hit.part] * falloff(spec.kind, hit.distance, spec.range)))
    hit.enemy.hp -= amount
    hits += 1
    run.impacts.push({ x: hit.x, y: hit.y, z: hit.z, life: 0.22, part: hit.part })
    run.popups.push({ x: hit.enemy.x, y: hit.enemy.y - 16, text: `${amount} ${PART_NAME[hit.part]}`, life: 0.45 })
    if (hit.part === 'head' || spec.kind === 'shotgun' || spec.kind === 'marksman') {
      hit.enemy.state = 'recover'
      hit.enemy.timer = Math.max(hit.enemy.timer, 0.28)
    }
    if (hit.enemy.hp <= 0) {
      hit.enemy.hp = 0
      pushCue(run, 'kill')
    }
  }
  run.recoil = Math.min(0.45, run.recoil + kick)
  if (run.tracers.length > 16) run.tracers.splice(0, run.tracers.length - 16)
  if (run.impacts.length > 16) run.impacts.splice(0, run.impacts.length - 16)
  pushCue(run, hits > 0 ? 'hit' : walled ? 'impact' : 'whiff')
  pushCue(run, `shot-${spec.id}`)
}

function finishReload(run: GunCarrier, spec: WeaponSpec): void {
  const need = spec.mag - run.mag[spec.id]
  const take = Math.max(0, Math.min(need, run.reserve[spec.id]))
  run.mag[spec.id] += take
  run.reserve[spec.id] -= take
  run.reloadLeft = 0
}

export function stepGuns(
  run: GunCarrier,
  h: number,
  input: GunInput,
  blocked: (x: number, y: number, radius: number) => boolean,
): void {
  run.recoil = Math.max(0, run.recoil - h * 0.85)
  run.muzzle = Math.max(0, run.muzzle - h)
  run.fireCd = Math.max(0, run.fireCd - h)
  run.tracers = run.tracers.filter((tracer) => {
    tracer.life -= h
    return tracer.life > 0
  })
  run.impacts = run.impacts.filter((mark) => {
    mark.life -= h
    return mark.life > 0
  })
  if (input.switchWeapon && !run.switchHeld) {
    const index = WEAPON_ORDER.indexOf(run.weapon)
    run.weapon = WEAPON_ORDER[(index + 1) % WEAPON_ORDER.length] ?? 'sword'
    run.reloadLeft = 0
    pushCue(run, 'switch')
  }
  run.switchHeld = Boolean(input.switchWeapon)
  const spec = WEAPONS[run.weapon]
  if (spec.kind === 'melee') {
    run.triggerHeld = Boolean(input.fire)
    run.reloadHeld = Boolean(input.reload)
    return
  }
  const chambered = run.mag[spec.id] > 0
  if (run.reloadLeft > 0 && input.fire && !run.triggerHeld && chambered) run.reloadLeft = 0
  if (run.reloadLeft > 0) {
    run.reloadLeft -= h
    if (run.reloadLeft <= 0) finishReload(run, spec)
  } else if (input.reload && !run.reloadHeld && run.mag[spec.id] < spec.mag && run.reserve[spec.id] > 0) {
    run.reloadLeft = spec.reload
    pushCue(run, `reload-${spec.id}`)
  }
  run.reloadHeld = Boolean(input.reload)
  const want = Boolean(input.fire)
  const edge = want && !run.triggerHeld
  const automatic = spec.auto && run.fireMode !== 'semi'
  if (!input.frozen && run.reloadLeft <= 0 && (automatic ? want && run.fireCd <= 0 : edge)) {
    if (run.mag[spec.id] <= 0) {
      if (edge) pushCue(run, 'dry')
    } else shoot(run, spec, blocked)
  }
  run.triggerHeld = want
  const id = spec.id
  run.mag[id] = Math.max(0, Math.min(spec.mag, run.mag[id] ?? 0))
  run.reserve[id] = Math.max(0, run.reserve[id] ?? 0)
  run.durability[id] = Math.max(0, Math.min(100, run.durability[id] ?? 0))
}
