import { describe, expect, it } from 'vitest'
import { clampCourtyard, courtyardContains, courtyardRim } from '../src/arena/courtyard.ts'
import { simToWorld, stageFrame } from '../src/arena/stageFrame.ts'
import { addReserve, armAngle, armShield, attackGap, chooseUpgrade, createRun, critChance, damageOf, dodgeGap, enemyScale, heroPose, HIT_RADIUS, reachOf, RESERVE_MAX, scriptedStep, SHIELD_COST, speedOf, step, STORM_BOOST_COST, stormFillNeed, stormHit, stormRadius, SWING, takenOf, UPGRADES, upgradePreview, type Input, type RunState } from '../src/arena/sim.ts'
import { ARENA_SAVE_KEY, EXTRACTION_SAVE_KEY, LIVE_SAVE_KEY, loadArena, loadLiveBest, PIXEL_VIEW_KEY, RPG_SAVE_KEY, VIEW_SAVE_KEY, writeArena, writeLiveBest } from '../src/arena/save.ts'

const quiet: Input = { moveX: 0, moveY: 0, dodge: false, storm: false }

function memory(): Storage {
  const bag = new Map<string, string>()
  return {
    get length() { return bag.size },
    clear: () => bag.clear(),
    getItem: (key) => bag.get(key) ?? null,
    key: (index) => [...bag.keys()][index] ?? null,
    removeItem: (key) => { bag.delete(key) },
    setItem: (key, value) => { bag.set(key, value) },
  }
}

function wipe(state: RunState): void {
  for (const enemy of state.enemies) enemy.hp = 0
  step(state, quiet, 0.05)
}

describe('battle arena', () => {
  it('dodges with a short invulnerable window and then a cooldown', () => {
    const state = createRun()
    const foe = state.enemies[0]
    if (!foe) throw new Error('no foe')
    foe.x = state.x
    foe.y = state.y
    foe.hitCd = 0
    const hp = state.hp
    step(state, { ...quiet, dodge: true }, 0.05)
    expect(state.dodgeLeft).toBeGreaterThan(0)
    expect(state.hp).toBe(hp)
    step(state, quiet, 0.4)
    expect(state.dodgeLeft).toBe(0)
    expect(state.dodgeCd).toBeGreaterThan(0)
    foe.x = state.x
    foe.y = state.y
    foe.hitCd = 0
    step(state, { ...quiet, dodge: true }, 0.05)
    expect(state.hp).toBeLessThan(hp)
  })

  it('charges storm from a kill and spends it once in range', () => {
    const state = createRun()
    const foe = state.enemies[0]
    if (!foe) throw new Error('no foe')
    foe.x = 16
    foe.y = 0
    foe.hp = 1
    step(state, quiet, 0.3)
    expect(state.kills).toBeGreaterThan(0)
    expect(state.storm).toBeGreaterThan(0)
    const other = state.enemies.find((enemy) => enemy.hp > 0)
    if (!other) throw new Error('no other')
    other.x = 20
    other.y = 0
    const before = other.hp
    state.storm = state.stormMax
    state.attackCd = 5
    step(state, { ...quiet, storm: true }, 0.2)
    expect(other.hp).toBeLessThan(before)
    expect(state.storm).toBeLessThan(state.stormMax)
    const after = state.storm
    step(state, { ...quiet, storm: true }, 0.05)
    expect(state.storm).toBe(after)
  })

  it('splits a slime once, offers three upgrades, and does not heal', () => {
    const state = createRun()
    const slime = state.enemies.find((enemy) => enemy.kind === 'slime')
    if (!slime) throw new Error('no slime')
    slime.x = 12
    slime.y = 0
    slime.hp = 1
    const before = state.enemies.length
    step(state, quiet, 0.3)
    const babies = state.enemies.filter((enemy) => enemy.kind === 'baby')
    expect(babies.length).toBe(2)
    expect(babies.every((baby) => baby.split === false)).toBe(true)
    expect(state.enemies.length).toBe(before + 1)
    state.hp = 61
    wipe(state)
    while (state.phase === 'fight') wipe(state)
    expect(state.phase).toBe('pick')
    expect(state.offers).toHaveLength(3)
    const hp = state.hp
    const id = state.offers[0]
    if (!id) throw new Error('no offer')
    expect(chooseUpgrade(state, id)).toBe(true)
    expect(state.hp).toBe(hp)
    expect(state.stacks[id]).toBe(1)
    expect(state.wave).toBe(2)
  })

  it('refuses an upgrade that is already at its cap', () => {
    const state = createRun()
    wipe(state)
    state.stacks.blade = UPGRADES.find((item) => item.id === 'blade')?.max ?? 4
    state.offers = ['blade', 'boots', 'handle']
    expect(chooseUpgrade(state, 'blade')).toBe(false)
    expect(state.wave).toBe(1)
  })

  it('uses a red ring on wave 5 and ground marks plus pups on wave 10', () => {
    const ring = createRun()
    for (let wave = 1; wave < 5; wave++) {
      wipe(ring)
      const id = ring.offers[0]
      if (!id) throw new Error('no offer')
      chooseUpgrade(ring, id)
    }
    expect(ring.wave).toBe(5)
    expect(ring.enemies.map((enemy) => enemy.kind)).toEqual(['bossRing'])
    let sawRing = false
    for (let i = 0; i < 40 && !sawRing; i++) {
      step(ring, quiet, 0.05)
      sawRing = ring.enemies.some((enemy) => enemy.mark?.kind === 'ring')
    }
    expect(sawRing).toBe(true)

    const mortar = createRun()
    for (let wave = 1; wave < 10; wave++) {
      wipe(mortar)
      const id = mortar.offers[0]
      if (!id) throw new Error('no offer')
      chooseUpgrade(mortar, id)
    }
    expect(mortar.wave).toBe(10)
    expect(mortar.enemies[0]?.kind).toBe('bossMortar')
    mortar.enemies[0]!.hp = mortar.enemies[0]!.maxHp * 0.65
    let sawCircle = false
    for (let i = 0; i < 30 && !sawCircle; i++) {
      step(mortar, quiet, 0.05)
      sawCircle = mortar.enemies.some((enemy) => enemy.mark?.kind === 'circle')
    }
    expect(sawCircle).toBe(true)
    expect(mortar.enemies.some((enemy) => enemy.kind === 'pup' && enemy.speed > 0)).toBe(true)
  })

  it('keeps fighters inside the courtyard walls', () => {
    expect(courtyardContains(0, 0)).toBe(true)
    expect(courtyardContains(0, -160)).toBe(true)
    expect(courtyardContains(0, -150)).toBe(true)
    expect(courtyardContains(400, 0)).toBe(false)
    const stopped = clampCourtyard(400, 0, 14)
    expect(courtyardContains(stopped.x, stopped.y, 14)).toBe(true)
    expect(Math.hypot(stopped.x, stopped.y)).toBeLessThan(280)
    for (let i = 0; i < 8; i += 1) {
      const spot = courtyardRim((i / 8) * Math.PI * 2, 36)
      expect(courtyardContains(spot.x, spot.y, 14)).toBe(true)
    }
    const run = createRun()
    expect(run.enemies).toHaveLength(6)
    for (const enemy of run.enemies) expect(courtyardContains(enemy.x, enemy.y, enemy.r)).toBe(true)
  })

  it('keeps the 3D view preference off the score save', () => {
    expect(PIXEL_VIEW_KEY).not.toBe(VIEW_SAVE_KEY)
    expect(VIEW_SAVE_KEY).not.toBe(ARENA_SAVE_KEY)
    expect(VIEW_SAVE_KEY).not.toBe(RPG_SAVE_KEY)
    expect(VIEW_SAVE_KEY).not.toBe(EXTRACTION_SAVE_KEY)
    const point = simToWorld(12, -6, 4)
    expect(point).toEqual({ x: 12, y: 4, z: -6 })
    const frame = stageFrame(390, 844, { top: 220, right: 12, bottom: 140, left: 12 })
    expect(frame.viewW).toBeGreaterThan(80)
    expect(frame.viewH).toBeGreaterThan(80)
    expect(frame.units * Math.min(frame.viewW, frame.viewH)).toBeCloseTo(680)
    const wide = stageFrame(844, 390, { top: 160, right: 150, bottom: 16, left: 120 })
    expect(wide.units * Math.min(wide.viewW, wide.viewH)).toBeCloseTo(680)
  })

  it('records only the arena best and leaves the older save keys alone', () => {
    const store = memory()
    store.setItem(RPG_SAVE_KEY, '{"kept":true}')
    store.setItem(EXTRACTION_SAVE_KEY, '{"kept":true}')
    expect(writeArena(store, { bestWave: 12 })).toBe(true)
    expect(loadArena(store).bestWave).toBe(10)
    expect(store.getItem(RPG_SAVE_KEY)).toBe('{"kept":true}')
    expect(store.getItem(EXTRACTION_SAVE_KEY)).toBe('{"kept":true}')
    expect(store.getItem(ARENA_SAVE_KEY)).toContain('"bestWave":10')
  })

  it('lands a swung hit with damage, flash, and a push away from the fighter', () => {
    const state = createRun()
    const foe = state.enemies[0]
    if (!foe) throw new Error('no foe')
    for (const enemy of state.enemies) enemy.speed = 1
    foe.x = 40
    foe.y = 0
    foe.hp = 40
    const hp = foe.hp
    state.attackCd = 0
    step(state, quiet, 0.1)
    expect(foe.hp).toBeLessThan(hp)
    expect(foe.flash).toBeGreaterThan(0)
    expect(foe.knockX).toBeGreaterThan(0)
    expect(Math.abs(foe.knockY)).toBeLessThan(foe.knockX)
    expect(foe.x).toBeGreaterThan(40)
    expect(state.floats.some((item) => item.kind === 'hit')).toBe(true)
    expect(state.hitStop).toBeGreaterThan(0)
  })

  it('whiffs when the swing no longer meets anyone', () => {
    const state = createRun()
    const foe = state.enemies[0]
    if (!foe) throw new Error('no foe')
    for (const enemy of state.enemies) {
      enemy.x = 180
      enemy.y = 180
      enemy.speed = 1
    }
    foe.x = 36
    foe.y = 0
    foe.hp = 40
    state.attackCd = 0
    step(state, quiet, 0.05)
    expect(state.swingPhase).toBe('windup')
    foe.x = 12
    foe.y = 90
    const hp = foe.hp
    step(state, quiet, 0.1)
    expect(foe.hp).toBe(hp)
    expect(foe.flash).toBe(0)
    expect(state.floats.some((item) => item.text === 'Meleset' && item.kind === 'miss')).toBe(true)
    expect(state.floats.some((item) => item.kind === 'hit')).toBe(false)
  })

  it('says Elak only when a dodge actually negates a hit', () => {
    const state = createRun()
    const foe = state.enemies[0]
    if (!foe) throw new Error('no foe')
    foe.x = state.x
    foe.y = state.y
    foe.hitCd = 0
    const hp = state.hp
    step(state, { ...quiet, dodge: true }, 0.05)
    expect(state.hp).toBe(hp)
    expect(state.dodgeLeft).toBeGreaterThan(0)
    expect(state.floats.some((item) => item.text === 'Elak' && item.kind === 'dodge')).toBe(true)
    expect(Math.abs(armAngle(state) - state.facing)).toBeGreaterThan(1)
  })

  it('keeps the weapon in the hand while facing and changing silhouette', () => {
    const state = createRun()
    state.attackCd = 10
    step(state, { ...quiet, moveX: 1 }, 0.1)
    expect(state.facing).toBeGreaterThan(-0.2)
    expect(state.facing).toBeLessThan(0.2)
    let pose = heroPose(state)
    expect(pose.handX).toBeGreaterThan(state.x)
    expect(pose.tipX).toBeGreaterThan(pose.handX)
    step(state, { ...quiet, moveY: -1 }, 0.1)
    expect(state.facing).toBeLessThan(-1)
    pose = heroPose(state)
    expect(pose.handY).toBeLessThan(state.y)
    expect(pose.tipY).toBeLessThan(pose.handY)
    state.facing = 0
    state.swingPhase = 'windup'
    state.swingT = SWING.windup
    expect(armAngle(state)).toBeLessThan(-1)
    state.swingPhase = 'active'
    state.swingT = 0
    expect(armAngle(state)).toBeGreaterThan(-0.2)
    expect(armAngle(state)).toBeLessThan(0.2)
    state.weapon = 'pedang'
    const sword = heroPose(state)
    state.weapon = 'tombak'
    const spear = heroPose(state)
    expect(sword.handX).toBeCloseTo(spear.handX)
    expect(sword.width).toBeGreaterThan(spear.width)
    expect(spear.weapon).toBe('tombak')
  })

  it('hurts with the melee circle only while the fighter is inside it', () => {
    const state = createRun()
    for (let wave = 1; wave < 3; wave++) {
      wipe(state)
      const id = state.offers[0]
      if (!id) throw new Error('no offer')
      chooseUpgrade(state, id)
    }
    const melee = state.enemies.find((enemy) => enemy.kind === 'melee')
    if (!melee) throw new Error('no melee')
    for (const enemy of state.enemies) {
      if (enemy !== melee) enemy.hp = 0
    }
    step(state, quiet, 0.05)
    state.attackCd = 10
    state.swingPhase = 'idle'
    state.hitStop = 0
    melee.x = 0
    melee.y = 0
    melee.state = 'windup'
    melee.timer = 0.2
    melee.hitCd = 5
    melee.mark = { kind: 'circle', x: 0, y: 0, x2: 0, y2: 0, r: HIT_RADIUS.melee, life: 0.2, max: 0.5, damage: 10 }
    state.x = HIT_RADIUS.melee + 30
    state.y = 0
    state.dodgeLeft = 0
    const safe = state.hp
    melee.timer = 0.02
    step(state, quiet, 0.05)
    expect(state.hp).toBe(safe)
    melee.state = 'windup'
    melee.timer = 0.02
    melee.mark = { kind: 'circle', x: 0, y: 0, x2: 0, y2: 0, r: HIT_RADIUS.melee, life: 0.02, max: 0.5, damage: 10 }
    state.x = HIT_RADIUS.melee - 6
    state.y = 0
    step(state, quiet, 0.05)
    expect(state.hp).toBeLessThan(safe)
  })

  it('spends reserve to make one storm hit harder than the base cast', () => {
    const quietStorm = { ...quiet, storm: true }
    const base = createRun()
    const boost = createRun()
    for (const state of [base, boost]) {
      const foe = state.enemies[0]
      if (!foe) throw new Error('no foe')
      foe.x = 30
      foe.y = 0
      foe.hp = 200
      foe.maxHp = 200
      state.storm = state.stormMax
    }
    boost.bonusMode = 'storm'
    expect(addReserve(boost, 1000)).toBe(RESERVE_MAX)
    for (const state of [base, boost]) {
      state.attackCd = 5
      for (const enemy of state.enemies) {
        if (enemy.maxHp !== 200) {
          enemy.x = 220
          enemy.y = 220
        }
      }
    }
    step(base, quietStorm, 0.28)
    step(boost, quietStorm, 0.28)
    const baseFoe = base.enemies.find((enemy) => enemy.maxHp === 200)
    const boostFoe = boost.enemies.find((enemy) => enemy.maxHp === 200)
    if (!baseFoe || !boostFoe) throw new Error('foe missing')
    expect(boostFoe.hp).toBeLessThan(baseFoe.hp)
    expect(base.reserve).toBe(0)
    expect(boost.reserve).toBe(RESERVE_MAX - STORM_BOOST_COST)
    expect(boost.liveAssisted).toBe(true)
    expect(base.liveAssisted).toBe(false)
  })

  it('spends reserve on a shield that blocks one contact window', () => {
    const state = createRun()
    const foe = state.enemies[0]
    if (!foe) throw new Error('no foe')
    foe.x = state.x
    foe.y = state.y
    foe.hitCd = 0
    state.bonusMode = 'shield'
    state.reserve = SHIELD_COST
    const hp = state.hp
    expect(armShield(state)).toBe(true)
    expect(state.reserve).toBe(0)
    step(state, quiet, 0.05)
    expect(state.hp).toBe(hp)
    expect(state.floats.some((item) => item.text === 'Perisai')).toBe(true)
    state.shieldLeft = 0.01
    foe.hitCd = 0
    step(state, quiet, 0.05)
    expect(state.hp).toBeLessThan(hp)
  })

  it('keeps the practice best apart from the live-assisted best', () => {
    const store = memory()
    store.setItem(RPG_SAVE_KEY, '{"kept":true}')
    store.setItem(EXTRACTION_SAVE_KEY, '{"kept":true}')
    expect(writeArena(store, { bestWave: 2 })).toBe(true)
    expect(writeLiveBest(store, 6)).toBe(true)
    expect(loadArena(store).bestWave).toBe(2)
    expect(loadLiveBest(store)).toBe(6)
    expect(store.getItem(ARENA_SAVE_KEY)).not.toContain('live')
    expect(store.getItem(LIVE_SAVE_KEY)).toContain('"bestWave":6')
    expect(store.getItem(RPG_SAVE_KEY)).toBe('{"kept":true}')
    expect(store.getItem(EXTRACTION_SAVE_KEY)).toBe('{"kept":true}')
  })

  it('dodges during hitstop and does not spend an unfilled storm', () => {
    const state = createRun()
    state.hitStop = 0.05
    state.dodgeCd = 0
    state.dodgeHeld = false
    step(state, { ...quiet, dodge: true }, 0.05)
    expect(state.dodgeLeft).toBeGreaterThan(0)
    const foe = state.enemies[0]
    if (!foe) throw new Error('no foe')
    foe.x = 24
    foe.y = 0
    foe.hp = 80
    state.storm = 1
    state.stormHeld = false
    step(state, { ...quiet, storm: true }, 0.05)
    expect(state.storm).toBe(1)
    expect(foe.hp).toBe(80)
    state.storm = state.stormMax
    state.stormHeld = false
    state.attackCd = 5
    step(state, { ...quiet, storm: true }, 0.16)
    expect(foe.hp).toBeLessThan(80)
    expect(state.storm).toBeLessThan(state.stormMax)
  })

  it('dashes along the stick, including sideways, and along facing when the stick is neutral', () => {
    const east = createRun()
    east.dodgeCd = 0
    east.facing = 0
    const x0 = east.x
    step(east, { ...quiet, moveX: 1, dodge: true }, 0.08)
    expect(east.dodgeLeft).toBeGreaterThan(0)
    expect(east.x).toBeGreaterThan(x0 + 15)
    expect(Math.abs(east.y)).toBeLessThan(4)
    expect(east.puffs.length).toBeGreaterThan(0)

    const north = createRun()
    north.dodgeCd = 0
    const y0 = north.y
    step(north, { ...quiet, moveY: -1, dodge: true }, 0.08)
    expect(north.y).toBeLessThan(y0 - 15)

    const diagonal = createRun()
    diagonal.dodgeCd = 0
    step(diagonal, { ...quiet, moveX: 1, moveY: 1, dodge: true }, 0.08)
    expect(diagonal.x).toBeGreaterThan(8)
    expect(diagonal.y).toBeGreaterThan(8)

    const neutral = createRun()
    neutral.dodgeCd = 0
    neutral.facing = -Math.PI / 2
    step(neutral, { ...quiet, dodge: true }, 0.08)
    expect(neutral.y).toBeLessThan(-10)
    expect(Math.abs(neutral.x)).toBeLessThan(6)
  })

  it('needs three ordinary starting swings to fell a full wave-1 slime, and spawns six', () => {
    const state = createRun()
    const slimes = state.enemies.filter((enemy) => enemy.kind === 'slime')
    expect(slimes).toHaveLength(6)
    const slime = slimes[0]
    if (!slime) throw new Error('no slime')
    expect(slime.maxHp).toBe(22)
    expect(damageOf(state)).toBe(9)
    let hp = slime.maxHp
    let hits = 0
    while (hp > 0) {
      hp -= 9
      hits += 1
    }
    expect(hits).toBe(3)
    for (const other of state.enemies) {
      if (other !== slime) other.hp = 0
    }
    slime.x = 20
    slime.y = 0
    slime.hp = slime.maxHp
    state.attackCd = 0
    let swings = 0
    for (let i = 0; i < 40 && slime.hp > 0; i++) {
      const before = slime.hp
      step(state, quiet, 0.05)
      if (slime.hp < before) swings += 1
    }
    expect(swings).toBe(3)
    expect(slime.hp).toBe(0)
  })

  it('renames upgrades without changing their effects', () => {
    const byId = Object.fromEntries(UPGRADES.map((item) => [item.id, item]))
    expect(byId.wrist?.name).toBe('Ayunan Ksatria')
    expect(byId.wrist?.detail).toBe('Serang 10% lebih sering')
    expect(byId.storm?.name).toBe('Badai Pelindung')
    expect(byId.storm?.detail).toContain('Bukan perisai')
    expect(byId.storm?.detail).not.toMatch(/perisai terpasang|memberi perisai/i)
    expect(byId.blade?.detail).toBe('Kerusakan +15%')
    expect(byId.boots?.detail).toBe('Gerak +10%')
    expect(byId.handle?.detail).toBe('Jangkauan +12%')
    expect(byId.apron?.detail).toBe('Luka masuk −8%')
    expect(byId.wind?.detail).toBe('Hindar siap 15% lebih cepat')
    expect(byId.crit?.detail).toBe('Kritik +7% (luka 2×)')
  })

  it('applies each upgrade to the stat it names and does not scale enemies from those stacks', () => {
    const state = createRun()
    const before = {
      damage: damageOf(state),
      gap: attackGap(state),
      speed: speedOf(state),
      reach: reachOf(state),
      taken: takenOf(state),
      dodge: dodgeGap(state),
      crit: critChance(state),
      radius: stormRadius(state),
      fill: state.stormMax,
      hit: stormHit(state),
    }
    expect(before).toEqual({ damage: 9, gap: 0.42, speed: 156, reach: 78, taken: 1, dodge: 1.15, crit: 0, radius: 118, fill: 5, hit: 16 })
    state.stacks = { blade: 1, wrist: 1, boots: 1, handle: 1, apron: 1, storm: 1, wind: 1, crit: 1 }
    state.stormMax = stormFillNeed(1)
    expect(damageOf(state)).toBeCloseTo(10.35)
    expect(attackGap(state)).toBeCloseTo(0.42 / 1.1)
    expect(speedOf(state)).toBeCloseTo(171.6)
    expect(reachOf(state)).toBeCloseTo(87.36)
    expect(takenOf(state)).toBeCloseTo(0.92)
    expect(dodgeGap(state)).toBeCloseTo(1.15 * 0.85)
    expect(critChance(state)).toBeCloseTo(0.07)
    expect(stormRadius(state)).toBe(146)
    expect(stormFillNeed(2)).toBe(3)
    expect(stormFillNeed(3)).toBe(2)
    expect(stormHit(state)).toBe(20)
    expect(upgradePreview(createRun(), 'storm')).toContain('Bukan perisai')
    const bare = createRun()
    expect(enemyScale(1)).toBe(1)
    expect(bare.enemies[0]?.maxHp).toBe(22)
    expect(enemyScale(8)).toBeCloseTo(1.84)
    const climb = (order: Array<'blade' | 'wrist' | 'boots' | 'handle' | 'apron' | 'storm' | 'wind' | 'crit'>) => {
      const run = createRun()
      for (const id of order) {
        run.phase = 'pick'
        run.offers = [id]
        if (!chooseUpgrade(run, id)) throw new Error(id)
      }
      return run
    }
    const heavy = climb(['blade', 'blade', 'blade', 'blade', 'wrist', 'wrist', 'wrist'])
    const mobile = climb(['boots', 'boots', 'boots', 'handle', 'handle', 'handle', 'apron'])
    expect(heavy.wave).toBe(8)
    expect(mobile.wave).toBe(8)
    const heavySlime = heavy.enemies.find((enemy) => enemy.kind === 'slime')
    const mobileSlime = mobile.enemies.find((enemy) => enemy.kind === 'slime')
    expect(heavySlime?.maxHp).toBe(40)
    expect(mobileSlime?.maxHp).toBe(heavySlime?.maxHp)
    expect(heavy.enemies.filter((enemy) => enemy.kind === 'slime')).toHaveLength(2)
    const boss = climb(['wind', 'wind', 'crit', 'crit'])
    expect(boss.wave).toBe(5)
    expect(boss.enemies[0]?.kind).toBe('bossRing')
    expect(boss.enemies[0]?.maxHp).toBe(178)
  })

  it('hits a standing slime on the swing clock plus the short hit-stop', () => {
    const state = createRun()
    const foe = state.enemies[0]
    if (!foe) throw new Error('missing slime')
    state.enemies = [foe]
    foe.x = 40
    foe.y = 0
    foe.hp = 80
    foe.maxHp = 80
    foe.armor = true
    foe.speed = 1
    state.attackCd = 0
    const hits: number[] = []
    let prev = foe.hp
    const input = { moveX: 0, moveY: 0, dodge: false, storm: false }
    for (let i = 0; i < 240 && hits.length < 4; i++) {
      step(state, input, 1 / 60)
      if (foe.hp < prev - 0.1) {
        hits.push(Number(state.time.toFixed(4)))
        prev = foe.hp
      }
    }
    expect(hits.length).toBeGreaterThanOrEqual(3)
    const gaps = hits.slice(1).map((time, index) => Number((time - (hits[index] ?? 0)).toFixed(4)))
    for (const gap of gaps) {
      expect(gap).toBeGreaterThan(0.44)
      expect(gap).toBeLessThan(0.52)
    }
    state.stacks.wrist = 1
    state.attackCd = 0
    state.swingPhase = 'idle'
    state.swingT = 0
    state.hitStop = 0
    const faster: number[] = []
    prev = foe.hp
    for (let i = 0; i < 240 && faster.length < 3; i++) {
      step(state, input, 1 / 60)
      if (foe.hp < prev - 0.1) {
        faster.push(state.time)
        prev = foe.hp
      }
    }
    const fastGap = (faster[1] ?? 0) - (faster[0] ?? 0)
    expect(fastGap).toBeLessThan((gaps[0] ?? 1) - 0.02)
    expect(attackGap(state)).toBeCloseTo(0.42 / 1.1)
  })

  it('a real wave clear accepts one upgrade tap and ignores the repeat', () => {
    const state = createRun()
    for (const enemy of state.enemies) enemy.hp = 0
    step(state, quiet, 0.05)
    expect(state.phase).toBe('pick')
    expect(state.offers).toHaveLength(3)
    const id = state.offers[1] ?? state.offers[0]
    if (!id) throw new Error('no offer')
    const wave = state.wave
    const hp = state.hp
    expect(chooseUpgrade(state, id)).toBe(true)
    expect(state.phase).toBe('fight')
    expect(state.wave).toBe(wave + 1)
    expect(state.hp).toBe(hp)
    expect(state.stacks[id]).toBe(1)
    expect(chooseUpgrade(state, id)).toBe(false)
    expect(state.wave).toBe(wave + 1)
    expect(state.stacks[id]).toBe(1)
  })

  it('scripted 10-wave victory is a test helper, not a normal play session', () => {
    const state = createRun()
    for (let i = 0; i < 16000 && state.phase !== 'victory' && state.phase !== 'dead'; i++) {
      if (state.phase === 'pick') {
        const prefer: Array<(typeof state.offers)[number]> = ['apron', 'boots', 'wind', 'blade', 'handle', 'wrist', 'storm', 'crit']
        const id = prefer.find((item) => state.offers.includes(item)) ?? state.offers[0]
        if (!id) throw new Error('no offer')
        chooseUpgrade(state, id)
      } else {
        step(state, scriptedStep(state), 0.05)
      }
    }
    expect(state.phase).toBe('victory')
    expect(state.cleared).toBe(10)
  })
})
