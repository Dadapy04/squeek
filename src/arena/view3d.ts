import {
  BoxGeometry,
  CanvasTexture,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  DoubleSide,
  OrthographicCamera,
  PCFSoftShadowMap,
  PlaneGeometry,
  RepeatWrapping,
  RingGeometry,
  Scene,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  WebGLRenderer,
  type Material,
} from 'three'
import { COURTYARD } from './courtyard.ts'
import { heroPose, type EnemyKind, type RunState } from './sim.ts'
import { simToWorld, stageFrame, type StageInset } from './stageFrame.ts'

/**
 * Original modeled fighter based on the public yellow mascot silhouette:
 * paired rounded ears, broad cheeks, dark eyes and muzzle, dotted gold surface.
 * Not an official model, not an endorsement, and not an NFT.
 * Positions, swings, telegraphs, and the shock ring come from the arena sim.
 */

const GOLD = 0xf5c21a
const INK = 0x24180f
const STEEL = 0xd9dde6
const WOOD = 0x8a5a32

export interface ArenaStage {
  render: (state: RunState, width: number, height: number, inset: StageInset) => void
  setHeroClose: (value: boolean) => void
  info: () => { calls: number; triangles: number }
  dispose: () => void
}

export function createArenaStage(canvas: HTMLCanvasElement): ArenaStage | null {
  try {
    const renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
    })
    const gl = renderer.getContext()
    if (!gl) return null
    renderer.outputColorSpace = SRGBColorSpace
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = PCFSoftShadowMap
    return new Stage(renderer)
  } catch {
    return null
  }
}

class Stage implements ArenaStage {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new OrthographicCamera(-100, 100, 100, -100, 0.5, 1800)
  private readonly hero = buildHero()
  private readonly enemies = new Map<number, Group>()
  private readonly circles: Mesh[]
  private readonly lines: Mesh[]
  private readonly puffs: Mesh[]
  private readonly floatSprites: Sprite[]
  private readonly shock: Mesh
  private readonly shockInner: Mesh
  private readonly shield: Mesh
  private readonly ghosts: Mesh[]
  private readonly slash: Mesh
  private readonly textures = new Map<string, CanvasTexture>()
  private readonly shared = sharedGeos()
  private heroClose = false

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer
    this.scene.background = new Color('#b7c3c6')
    const sky = new HemisphereLight('#d5e2e4', '#5c564c', 0.55)
    const sun = new DirectionalLight('#fff6e4', 1.7)
    sun.position.set(140, 260, 80)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.near = 20
    sun.shadow.camera.far = 700
    sun.shadow.camera.left = -320
    sun.shadow.camera.right = 320
    sun.shadow.camera.top = 320
    sun.shadow.camera.bottom = -320
    sun.shadow.bias = -0.0008
    this.scene.add(sky, sun)

    buildFortress(this.scene)

    this.circles = pool(16, () => ringMesh(0xe23b3b))
    this.lines = pool(6, () => new Mesh(new BoxGeometry(1, 0.6, 1), new MeshBasicMaterial({ color: 0xe23b3b, transparent: true, opacity: 0.7 })))
    this.puffs = pool(32, () => new Mesh(new SphereGeometry(1, 8, 6), new MeshBasicMaterial({ color: 0xf4efe2, transparent: true, opacity: 0.7 })))
    this.floatSprites = pool(12, () => {
      const sprite = new Sprite(new SpriteMaterial({ transparent: true, depthWrite: false }))
      sprite.scale.set(28, 14, 1)
      return sprite
    })
    this.shock = ringMesh(0xf7fbff)
    this.shockInner = ringMesh(0x7ec8ff)
    this.shield = torus(18, 1.4, 0x1f8a62)
    this.shield.material = new MeshBasicMaterial({ color: 0x1f8a62, transparent: true, opacity: 0.85 })
    this.ghosts = [0, 1].map(() => new Mesh(new SphereGeometry(10, 10, 8), new MeshStandardMaterial({ color: GOLD, transparent: true, opacity: 0.28, depthWrite: false })))
    this.slash = new Mesh(new BoxGeometry(1, 0.4, 1.2), new MeshBasicMaterial({ color: 0xfff8e8, transparent: true, opacity: 0.75 }))
    for (const mesh of [...this.circles, ...this.lines, ...this.puffs, this.shock, this.shockInner, this.shield, ...this.ghosts, this.slash]) {
      mesh.visible = false
      this.scene.add(mesh)
    }
    for (const sprite of this.floatSprites) {
      sprite.visible = false
      this.scene.add(sprite)
    }
    this.scene.add(this.hero.root)
    this.hero.root.scale.setScalar(2.75)
    this.camera.up.set(0, 0, -1)
    this.camera.position.set(0, 900, 0)
    this.camera.lookAt(0, 0, 0)
  }

  setHeroClose(value: boolean): void {
    this.heroClose = value
  }

  render(state: RunState, width: number, height: number, inset: StageInset): void {
    const frame = stageFrame(width, height, inset, this.heroClose ? 230 : undefined)
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1))
    this.renderer.setSize(width, height, false)
    const units = frame.units
    this.camera.left = -(units * width) / 2
    this.camera.right = (units * width) / 2
    this.camera.top = (units * height) / 2
    this.camera.bottom = -(units * height) / 2
    this.camera.clearViewOffset()
    const dx = inset.left + frame.viewW / 2 - width / 2
    const dy = inset.top + frame.viewH / 2 - height / 2
    const focusX = this.heroClose ? state.x : 0
    const focusZ = this.heroClose ? state.y : 0
    const lookX = focusX - dx * units
    const lookZ = focusZ - dy * units
    this.camera.up.set(0, 0, -1)
    this.camera.position.set(lookX + 18, 900, lookZ + 64)
    this.camera.lookAt(lookX, 0, lookZ)
    this.camera.updateProjectionMatrix()
    this.syncHero(state)
    this.syncEnemies(state)
    this.syncMarks(state)
    this.syncPuffs(state)
    this.syncShock(state)
    this.syncFloats(state)
    this.renderer.render(this.scene, this.camera)
  }

  info(): { calls: number; triangles: number } {
    return { calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles }
  }

  dispose(): void {
    this.renderer.dispose()
    for (const texture of this.textures.values()) texture.dispose()
  }

  private syncHero(state: RunState): void {
    const pose = heroPose(state)
    const at = simToWorld(state.x, state.y, 0)
    this.hero.root.position.set(at.x, 0, at.z)
    this.hero.root.rotation.y = -pose.facing
    this.hero.root.rotation.z = state.dodgeLeft > 0 ? -0.4 : 0
    this.hero.body.position.y = 12 + Math.sin(state.gait) * 0.6
    this.hero.arm.rotation.y = pose.facing - pose.arm
    this.hero.arm.rotation.z = pose.phase === 'windup' ? 1.15 : pose.phase === 'active' ? -1.05 : pose.phase === 'recover' ? 0.4 : Math.sin(state.gait) * 0.22
    const reach = Math.max(8, pose.length)
    this.hero.sword.visible = pose.weapon === 'pedang'
    this.hero.spear.visible = pose.weapon === 'tombak'
    this.hero.sword.scale.set(reach, 7, 12)
    this.hero.sword.position.x = 15 + reach / 2
    this.hero.swordTip.position.x = 16 + reach
    this.hero.swordTip.visible = pose.weapon === 'pedang'
    this.hero.shaft.scale.set(reach, 1.3, 1.3)
    this.hero.shaft.position.x = 15 + reach / 2
    this.hero.tip.position.x = 15 + reach
    this.hero.legL.rotation.z = Math.sin(state.gait) * 0.55
    this.hero.legR.rotation.z = -Math.sin(state.gait) * 0.55
    const flash = state.flash > 0
    setEmissive(this.hero.root, flash)
    this.shield.visible = state.shieldLeft > 0
    this.shield.position.set(at.x, 16, at.z)
    this.ghosts.forEach((ghost, index) => {
      ghost.visible = state.dodgeLeft > 0
      const back = simToWorld(state.x - state.dashX * (18 + index * 16), state.y - state.dashY * (18 + index * 16), 12)
      ghost.position.set(back.x, back.y, back.z)
    })
    this.slash.visible = pose.phase === 'active'
    if (pose.phase === 'active') {
      const mid = simToWorld((pose.handX + pose.tipX) / 2, (pose.handY + pose.tipY) / 2, 16)
      this.slash.position.set(mid.x, mid.y, mid.z)
      this.slash.rotation.y = -pose.arm
      this.slash.scale.set(Math.max(8, pose.length), 1, 1)
    }
  }

  private syncEnemies(state: RunState): void {
    const live = new Set<number>()
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0 || enemy.speed === 0) continue
      live.add(enemy.id)
      let group = this.enemies.get(enemy.id)
      if (!group || group.userData.kind !== enemy.kind) {
        group?.removeFromParent()
        group = buildEnemy(enemy.kind, this.shared)
        group.userData.kind = enemy.kind
        this.enemies.set(enemy.id, group)
        this.scene.add(group)
      }
      const bob = enemy.kind === 'bat' ? 14 + Math.sin(state.time * 8 + enemy.id) * 3 : enemy.kind === 'ghost' ? 7 : enemy.kind === 'mage' ? 2 : 0
      const at = simToWorld(enemy.x, enemy.y, bob)
      group.position.set(at.x, at.y, at.z)
      const face = Math.atan2(state.y - enemy.y, state.x - enemy.x)
      group.rotation.y = -face
      const body = (enemy.r / 16) * 2.05
      group.scale.set(body, body, body)
      poseMonster(group, enemy.kind, state.time, enemy.id)
      setEmissive(group, enemy.flash > 0)
      const wind = group.getObjectByName('wind')
      if (wind) wind.visible = enemy.state === 'windup'
      const fill = group.getObjectByName('hp')
      if (fill) fill.scale.x = Math.max(0.04, enemy.hp / enemy.maxHp)
    }
    for (const [id, group] of this.enemies) {
      if (live.has(id)) continue
      group.removeFromParent()
      this.enemies.delete(id)
    }
  }

  private syncMarks(state: RunState): void {
    let circle = 0
    let line = 0
    for (const enemy of state.enemies) {
      const mark = enemy.mark
      if (!mark) continue
      const fade = 0.35 + 0.45 * (1 - mark.life / mark.max)
      if (mark.kind === 'line') {
        const mesh = this.lines[line++]
        if (!mesh) continue
        const dx = mark.x2 - mark.x
        const dy = mark.y2 - mark.y
        const len = Math.max(4, Math.hypot(dx, dy))
        const at = simToWorld((mark.x + mark.x2) / 2, (mark.y + mark.y2) / 2, 0.8)
        mesh.visible = true
        mesh.position.set(at.x, at.y, at.z)
        mesh.rotation.y = -Math.atan2(dy, dx)
        mesh.scale.set(len, 1, Math.max(6, mark.r * 2))
        const mat = mesh.material
        if (mat instanceof MeshBasicMaterial) mat.opacity = fade
      } else {
        const mesh = this.circles[circle++]
        if (!mesh) continue
        const at = simToWorld(mark.x, mark.y, 0.6)
        mesh.visible = true
        mesh.position.set(at.x, at.y, at.z)
        mesh.scale.set(mark.r, mark.r, mark.r)
        const mat = mesh.material
        if (mat instanceof MeshBasicMaterial) mat.opacity = fade
      }
    }
    for (let i = circle; i < this.circles.length; i++) this.circles[i]!.visible = false
    for (let i = line; i < this.lines.length; i++) this.lines[i]!.visible = false
  }

  private syncPuffs(state: RunState): void {
    for (let i = 0; i < this.puffs.length; i++) {
      const mesh = this.puffs[i]!
      const puff = state.puffs[i]
      if (!puff) {
        mesh.visible = false
        continue
      }
      const at = simToWorld(puff.x, puff.y, 3)
      mesh.visible = true
      mesh.position.set(at.x, at.y, at.z)
      const u = puff.life / puff.max
      mesh.scale.setScalar(4 + (1 - u) * 7)
      const mat = mesh.material
      if (mat instanceof MeshBasicMaterial) mat.opacity = 0.45 * u
    }
  }

  private syncShock(state: RunState): void {
    const shock = state.shock
    this.shock.visible = Boolean(shock && shock.radius > 1)
    this.shockInner.visible = this.shock.visible
    if (!shock) return
    const at = simToWorld(shock.x, shock.y, 1.4)
    const u = shock.life / shock.maxLife
    this.shock.position.set(at.x, at.y, at.z)
    this.shock.scale.set(shock.radius, shock.radius, shock.radius)
    this.shockInner.position.set(at.x, at.y + 0.2, at.z)
    this.shockInner.scale.set(Math.max(2, shock.radius - 10), Math.max(2, shock.radius - 10), Math.max(2, shock.radius - 10))
    const outer = this.shock.material
    const inner = this.shockInner.material
    if (outer instanceof MeshBasicMaterial) outer.opacity = 0.35 + 0.5 * u
    if (inner instanceof MeshBasicMaterial) inner.opacity = 0.3 + 0.4 * u
  }

  private syncFloats(state: RunState): void {
    for (let i = 0; i < this.floatSprites.length; i++) {
      const sprite = this.floatSprites[i]!
      const item = state.floats[i]
      if (!item) {
        sprite.visible = false
        continue
      }
      const at = simToWorld(item.x, item.y, 28)
      sprite.visible = true
      sprite.position.set(at.x, at.y, at.z)
      const mat = sprite.material
      if (mat instanceof SpriteMaterial) {
        mat.map = this.floatTexture(item.text, item.kind)
        mat.opacity = Math.max(0, item.life / item.max)
      }
    }
  }

  private floatTexture(text: string, kind: string): CanvasTexture {
    const key = `${kind}:${text}`
    const cached = this.textures.get(key)
    if (cached) return cached
    const canvas = document.createElement('canvas')
    canvas.width = 160
    canvas.height = 72
    const pen = canvas.getContext('2d')
    if (!pen) return new CanvasTexture(canvas)
    pen.font = '700 40px sans-serif'
    pen.textAlign = 'center'
    pen.lineWidth = 8
    pen.strokeStyle = '#24180f'
    pen.strokeText(text, 80, 50)
    pen.fillStyle = kind === 'hit' ? '#fff6d0' : kind === 'shield' ? '#b7f0cf' : kind === 'dodge' ? '#d7ecff' : '#ffe1c4'
    pen.fillText(text, 80, 50)
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    this.textures.set(key, texture)
    return texture
  }
}

function torus(radius: number, tube: number, color: number): Mesh {
  const mesh = new Mesh(new TorusGeometry(radius, tube, 8, 40), new MeshStandardMaterial({ color, roughness: 0.7 }))
  mesh.rotation.x = Math.PI / 2
  mesh.receiveShadow = true
  return mesh
}

function ringMesh(color: number): Mesh {
  const mesh = new Mesh(new RingGeometry(0.78, 1, 48), new MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: DoubleSide }))
  mesh.rotation.x = -Math.PI / 2
  return mesh
}

function pool<T>(count: number, make: () => T): T[] {
  return Array.from({ length: count }, make)
}

function sharedGeos(): { sphere: SphereGeometry; cap: CapsuleGeometry; box: BoxGeometry; cone: ConeGeometry } {
  return {
    sphere: new SphereGeometry(1, 14, 10),
    cap: new CapsuleGeometry(1, 1.2, 4, 8),
    box: new BoxGeometry(1, 1, 1),
    cone: new ConeGeometry(1, 1.6, 10),
  }
}

function lit(color: number, opacity = 1): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.05,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  })
}

function addMesh(parent: Group, geo: SphereGeometry | CapsuleGeometry | BoxGeometry | ConeGeometry | CylinderGeometry, material: Material, x: number, y: number, z: number, sx: number, sy: number, sz: number): Mesh {
  const mesh = new Mesh(geo, material)
  mesh.position.set(x, y, z)
  mesh.scale.set(sx, sy, sz)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function buildHero(): { root: Group; body: Mesh; arm: Group; sword: Mesh; swordTip: Mesh; spear: Group; shaft: Mesh; tip: Mesh; legL: Group; legR: Group } {
  const root = new Group()
  const fur = mascotFur()
  const plate = lit(0x8d97a6)
  plate.metalness = 0.45
  plate.roughness = 0.38
  const dark = lit(0x1c140e)
  dark.roughness = 0.35
  const body = addMesh(root, new BoxGeometry(1, 1, 1), plate, 1, 13, 0, 12, 10, 11)
  addMesh(root, new BoxGeometry(1, 1, 1), lit(0xc9a24a), 4, 14, 0, 6, 7, 8)
  addMesh(root, new CylinderGeometry(1, 1, 1, 8), plate, 0, 18, -12, 6.5, 2.4, 6.5)
  addMesh(root, new CylinderGeometry(1, 1, 1, 8), plate, 0, 18, 12, 6.5, 2.4, 6.5)
  addMesh(root, new SphereGeometry(1, 14, 12), fur, 7, 23, 0, 8.2, 7.4, 8.2)
  addMesh(root, new SphereGeometry(1, 12, 10), fur, 9, 21, -7, 4.4, 3.4, 4)
  addMesh(root, new SphereGeometry(1, 12, 10), fur, 9, 21, 7, 4.4, 3.4, 4)
  addMesh(root, new SphereGeometry(1, 12, 10), lit(0xd9920c), 5, 32, -9.5, 3.8, 5.8, 3.6)
  addMesh(root, new SphereGeometry(1, 12, 10), lit(0xd9920c), 5, 32, 9.5, 3.8, 5.8, 3.6)
  const helm = new Mesh(new TorusGeometry(9.2, 1.15, 6, 16), plate)
  helm.rotation.x = Math.PI / 2
  helm.position.set(7, 24, 0)
  helm.castShadow = true
  root.add(helm)
  addMesh(root, new BoxGeometry(1, 1, 1), plate, 8, 22, -8.5, 3, 5, 2)
  addMesh(root, new BoxGeometry(1, 1, 1), plate, 8, 22, 8.5, 3, 5, 2)
  addMesh(root, new SphereGeometry(1, 10, 8), dark, 11, 28.6, -2.5, 1.8, 1.5, 1.5)
  addMesh(root, new SphereGeometry(1, 10, 8), dark, 11, 28.6, 2.5, 1.8, 1.5, 1.5)
  addMesh(root, new SphereGeometry(1, 10, 8), dark, 15, 26.2, 0, 2.4, 1.4, 2.2)
  const legL = limb(root, -5)
  const legR = limb(root, 5)
  const arm = new Group()
  arm.position.set(2, 16, 9)
  root.add(arm)
  const armMesh = addMesh(arm, new CapsuleGeometry(1, 1.2, 3, 6), plate, 7, 0, 0, 2.4, 6, 2.4)
  armMesh.rotation.z = -Math.PI / 2
  addMesh(arm, new BoxGeometry(1, 1, 1), lit(0x6a5338), 13, 0, 0, 4, 3.2, 3.4)
  const sword = addMesh(arm, new BoxGeometry(1, 0.18, 0.42), bladeMaterial(), 20, 0.4, 0, 24, 7, 12)
  const swordTip = addMesh(arm, new ConeGeometry(3.2, 9, 5), bladeMaterial(), 36, 0.4, 0, 1, 1, 1)
  swordTip.rotation.z = -Math.PI / 2
  addMesh(arm, new BoxGeometry(1, 1, 1), lit(0x5c4128), 12, 0, 0, 3, 2, 10)
  const spear = new Group()
  arm.add(spear)
  const shaft = addMesh(spear, new BoxGeometry(1, 0.18, 0.18), lit(WOOD), 20, 0, 0, 20, 4, 4)
  const tip = addMesh(spear, new ConeGeometry(2.4, 9, 6), lit(STEEL), 32, 0, 0, 1, 1, 1)
  tip.rotation.z = -Math.PI / 2
  spear.visible = false
  return { root, body, arm, sword, swordTip, spear, shaft, tip, legL, legR }
}

function limb(parent: Group, z: number): Group {
  const pivot = new Group()
  pivot.position.set(-1, 7, z)
  parent.add(pivot)
  addMesh(pivot, new CapsuleGeometry(1, 1.1, 2, 6), lit(0x8d97a6), 0, -3, 0, 2.2, 3.2, 2.2)
  addMesh(pivot, new BoxGeometry(1, 1, 1), lit(0x3e3530), 1, -7.5, 0, 4.2, 3.2, 3.4)
  return pivot
}

function mascotFur(): MeshStandardMaterial {
  const map = goldDotMap()
  return new MeshStandardMaterial({
    color: GOLD,
    map,
    bumpMap: map,
    bumpScale: 0.45,
    roughness: 0.48,
    metalness: 0.18,
  })
}

function bladeMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: 0xf7f8ff, roughness: 0.28, metalness: 0.62 })
}

function goldDotMap(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const pen = canvas.getContext('2d')
  const texture = new CanvasTexture(canvas)
  if (!pen) return texture
  pen.fillStyle = '#e39b0c'
  pen.fillRect(0, 0, 64, 64)
  pen.fillStyle = '#ffe07a'
  for (let y = 8; y < 64; y += 16) {
    for (let x = 8; x < 64; x += 16) {
      pen.beginPath()
      pen.arc(x, y, 5, 0, Math.PI * 2)
      pen.fill()
    }
  }
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(2, 2)
  return texture
}

function buildEnemy(kind: EnemyKind, geo: ReturnType<typeof sharedGeos>): Group {
  const root = new Group()
  const color = kindColor(kind)
  const legs: Group[] = []
  if (kind === 'bat') wingedEye(root, geo)
  else if (kind === 'melee' || kind === 'pup') burrowCrawler(root, geo, legs, kind === 'pup')
  else if (kind === 'armor') armoredBrute(root, geo)
  else if (kind === 'archer') fungalCannon(root, geo, color)
  else if (kind === 'mage') fungalShaman(root, geo)
  else if (kind === 'bomber') cystBomber(root, geo, color)
  else if (kind === 'ghost') eyeWisp(root, geo)
  else if (kind === 'bolt') addMesh(root, geo.cone, new MeshBasicMaterial({ color: 0xffb15a }), 0, 6, 0, 3, 8, 3).rotation.z = -Math.PI / 2
  else if (kind === 'bossRing') ringBoss(root)
  else if (kind === 'bossMortar') mortarBoss(root, geo, legs)
  else mawSlime(root, geo, color, kind === 'baby')
  root.userData.legs = legs
  const back = addMesh(root, new BoxGeometry(16, 1.6, 1.2), new MeshBasicMaterial({ color: INK }), 0, 30, 0, 1, 1, 1)
  back.castShadow = false
  const fill = addMesh(root, new BoxGeometry(16, 1.6, 1.3), new MeshBasicMaterial({ color: 0xe23b3b }), 0, 30, 0.2, 1, 1, 1)
  fill.name = 'hp'
  fill.castShadow = false
  const wind = new Mesh(new TorusGeometry(13, 0.7, 6, 18), new MeshBasicMaterial({ color: 0xfff1a8 }))
  wind.name = 'wind'
  wind.visible = false
  wind.rotation.x = Math.PI / 2
  wind.position.y = 8
  root.add(wind)
  return root
}

function mawSlime(root: Group, geo: ReturnType<typeof sharedGeos>, color: number, small: boolean): void {
  const body = lit(color)
  addMesh(root, geo.sphere, body, -3, 7, 0, small ? 8 : 10, small ? 6 : 7, small ? 9 : 11)
  const jaw = new Group()
  jaw.name = 'jaw'
  jaw.position.set(4, 6, 0)
  root.add(jaw)
  addMesh(jaw, geo.box, lit(0x2a241c), 7, -1.5, 0, 12, 3.2, 10)
  addMesh(jaw, geo.box, body, 7, 2.4, 0, 12, 2.6, 10)
  for (const side of [-2.2, 0, 2.2]) addMesh(jaw, geo.cone, lit(0xf4efe4), 7, 0.2, side, 1.1, 2.4, 1.1)
  addMesh(root, geo.sphere, lit(INK), 2, 12, -2.4, 1.5, 1.6, 1.3)
  addMesh(root, geo.sphere, lit(INK), 2, 12, 2.4, 1.5, 1.6, 1.3)
}

function wingedEye(root: Group, geo: ReturnType<typeof sharedGeos>): void {
  addMesh(root, geo.sphere, lit(0xf4efe2), 0, 12, 0, 7, 7, 7)
  addMesh(root, geo.sphere, lit(0x1a120c), 2, 12, 0, 3.2, 3.2, 2.4)
  addMesh(root, geo.sphere, lit(0xc23b3b), 3.4, 12, 0, 1.2, 1.2, 1)
  const wingL = new Group()
  wingL.name = 'wingL'
  wingL.position.set(0, 12, -4)
  const wingR = new Group()
  wingR.name = 'wingR'
  wingR.position.set(0, 12, 4)
  addMesh(wingL, geo.box, lit(0x3a3158), -2, 0, -8, 12, 0.6, 10)
  addMesh(wingR, geo.box, lit(0x3a3158), -2, 0, 8, 12, 0.6, 10)
  root.add(wingL, wingR)
  addMesh(root, geo.cone, lit(0xf4efe4), 6, 9, -1.2, 0.7, 2, 0.7)
  addMesh(root, geo.cone, lit(0xf4efe4), 6, 9, 1.2, 0.7, 2, 0.7)
}

function burrowCrawler(root: Group, geo: ReturnType<typeof sharedGeos>, legs: Group[], small: boolean): void {
  const hide = lit(0x6a4a32)
  addMesh(root, geo.cap, hide, -4, 5, 0, small ? 4 : 6, small ? 3 : 4, small ? 4 : 5)
  addMesh(root, geo.cap, hide, 2, 5, 0, small ? 4 : 5.5, small ? 3 : 4, small ? 4 : 5)
  addMesh(root, geo.cap, lit(0x4a3024), 8, 5, 0, small ? 3 : 4.5, small ? 3 : 4, small ? 3 : 4)
  addMesh(root, geo.cone, lit(0xd7c3a4), 12, 5, -1.5, 1, 3.5, 1).rotation.z = -Math.PI / 2
  addMesh(root, geo.cone, lit(0xd7c3a4), 12, 5, 1.5, 1, 3.5, 1).rotation.z = -Math.PI / 2
  for (let i = 0; i < (small ? 4 : 6); i += 1) {
    const leg = new Group()
    const side = i % 2 === 0 ? -1 : 1
    leg.position.set(-4 + i * 2.2, 4, side * 4)
    addMesh(leg, geo.box, lit(0x3a2418), 0, -1, side * 2, 1.2, 1.2, 4)
    root.add(leg)
    legs.push(leg)
  }
}

function armoredBrute(root: Group, geo: ReturnType<typeof sharedGeos>): void {
  const plate = lit(0x9aa3b0)
  plate.metalness = 0.5
  addMesh(root, geo.box, plate, 0, 12, 0, 12, 12, 10)
  addMesh(root, geo.box, lit(0x5c6570), 2, 20, 0, 8, 6, 8)
  addMesh(root, geo.box, lit(INK), 5, 20, 0, 1.2, 2, 5)
  addMesh(root, geo.box, plate, -2, 16, -8, 8, 3, 5)
  addMesh(root, geo.box, plate, -2, 16, 8, 8, 3, 5)
  addMesh(root, geo.box, lit(0x6a5338), 10, 10, 5, 8, 3, 3)
}

function fungalCannon(root: Group, geo: ReturnType<typeof sharedGeos>, color: number): void {
  addMesh(root, geo.cap, lit(0xd8c48a), 0, 8, 0, 4, 7, 4)
  addMesh(root, geo.sphere, lit(color), 0, 16, 0, 10, 4, 10)
  addMesh(root, geo.sphere, lit(0xf2efe4), -3, 18, 2, 1.6, 1, 1.6)
  addMesh(root, geo.sphere, lit(0xf2efe4), 3, 18, -3, 1.4, 1, 1.4)
  const cannon = addMesh(root, new CylinderGeometry(1.6, 2, 12, 6), lit(0x6a5a3a), 8, 10, 0, 1, 1, 1)
  cannon.rotation.z = Math.PI / 2
  cannon.name = 'cannon'
}

function fungalShaman(root: Group, geo: ReturnType<typeof sharedGeos>): void {
  addMesh(root, geo.cap, lit(0xcbb58a), 0, 8, 0, 3.2, 8, 3.2)
  addMesh(root, geo.sphere, lit(0x7a4ad0), 0, 16, 0, 7, 2.4, 7)
  addMesh(root, geo.sphere, lit(0x5a32a8), 0, 21, 0, 4.5, 1.8, 4.5)
  const orb = addMesh(root, geo.sphere, new MeshBasicMaterial({ color: 0xd7b4ff }), 0, 26, 0, 2.2, 2.2, 2.2)
  orb.castShadow = false
}

function cystBomber(root: Group, geo: ReturnType<typeof sharedGeos>, color: number): void {
  addMesh(root, geo.sphere, lit(color), 0, 9, 0, 9, 8, 9)
  addMesh(root, geo.box, lit(0x2a1810), 0, 10, 4, 1.2, 7, 1.2)
  addMesh(root, geo.box, lit(0x2a1810), 3, 8, -2, 6, 1.2, 1.2)
  addMesh(root, geo.cone, lit(0x5a3a28), 0, 16, 0, 1.2, 4, 1.2)
  for (const side of [-1, 1]) addMesh(root, geo.box, lit(0x6a4a28), 0, 3, side * 5, 2, 3, 2)
}

function eyeWisp(root: Group, geo: ReturnType<typeof sharedGeos>): void {
  const sheet = lit(0xd7e4ff, 0.45)
  addMesh(root, geo.box, sheet, 0, 12, 0, 4, 16, 8)
  addMesh(root, geo.box, sheet, 2, 14, 2, 3, 12, 5).rotation.z = 0.4
  for (const [x, y, z] of [[0, 16, 3], [-1, 11, 3], [1, 8, 2]] as const) {
    addMesh(root, geo.sphere, lit(INK), x, y, z, 1.3, 1.5, 1)
  }
}

function ringBoss(root: Group): void {
  const ring = new Mesh(new TorusGeometry(14, 3.2, 8, 18), lit(0x8a3038))
  ring.rotation.x = Math.PI / 2
  ring.position.y = 12
  ring.castShadow = true
  root.add(ring)
  addMesh(root, new SphereGeometry(1, 10, 8), lit(0x2a1418), 0, 12, 0, 6, 6, 6)
  addMesh(root, new SphereGeometry(1, 8, 6), lit(0xf4efe4), 4, 14, 0, 1.6, 1.8, 1.4)
  for (let i = 0; i < 4; i += 1) {
    const spike = addMesh(root, new ConeGeometry(1.4, 7, 5), lit(0xd7c3a4), Math.cos(i) * 14, 12, Math.sin(i) * 14, 1, 1, 1)
    spike.lookAt(0, 12, 0)
  }
}

function mortarBoss(root: Group, geo: ReturnType<typeof sharedGeos>, legs: Group[]): void {
  addMesh(root, geo.box, lit(0x6a3040), 0, 10, 0, 16, 8, 12)
  const tube = addMesh(root, new CylinderGeometry(2.4, 3, 14, 6), lit(0x3a242c), -4, 16, 0, 1, 1, 1)
  tube.rotation.z = Math.PI / 3
  for (let i = 0; i < 4; i += 1) {
    const leg = new Group()
    const side = i < 2 ? -1 : 1
    leg.position.set(i % 2 === 0 ? -5 : 5, 6, side * 6)
    addMesh(leg, geo.box, lit(0x4a2830), 0, -2, side * 2, 2.4, 4, 2.4)
    root.add(leg)
    legs.push(leg)
  }
}

function poseMonster(group: Group, kind: EnemyKind, time: number, id: number): void {
  const jaw = group.getObjectByName('jaw')
  if (jaw) jaw.rotation.z = Math.sin(time * 5 + id) * 0.4
  const wingL = group.getObjectByName('wingL')
  const wingR = group.getObjectByName('wingR')
  if (wingL && wingR) {
    const flap = Math.sin(time * 12 + id) * 0.65
    wingL.rotation.x = flap
    wingR.rotation.x = -flap
  }
  const cannon = group.getObjectByName('cannon')
  if (cannon) cannon.rotation.y = Math.sin(time * 2 + id) * 0.25
  const legs = group.userData.legs as Group[] | undefined
  legs?.forEach((leg, index) => {
    leg.rotation.x = Math.sin(time * (kind === 'armor' ? 4 : 10) + index) * 0.45
  })
}

function buildFortress(scene: Scene): void {
  const earth = new Mesh(new PlaneGeometry(4000, 4000), new MeshStandardMaterial({ color: 0x3c4336, roughness: 1 }))
  earth.rotation.x = -Math.PI / 2
  earth.position.y = -0.5
  earth.receiveShadow = true
  scene.add(earth)
  const shape = new Shape()
  COURTYARD.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, -y)
    else shape.lineTo(x, -y)
  })
  shape.closePath()
  const floor = new Mesh(new ShapeGeometry(shape), new MeshStandardMaterial({ color: 0x8d857a, roughness: 0.94 }))
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  const cracks: Array<[number, number, number, number]> = [[-55, 35, 55, 85], [25, -25, 95, -75], [-100, -35, -15, 35]]
  for (const [x1, y1, x2, y2] of cracks) {
    const len = Math.hypot(x2 - x1, y2 - y1)
    const crack = new Mesh(new BoxGeometry(len, 0.4, 3.4), new MeshStandardMaterial({ color: 0x2c2824 }))
    const at = simToWorld((x1 + x2) / 2, (y1 + y2) / 2, 0.25)
    crack.position.set(at.x, at.y, at.z)
    crack.rotation.y = -Math.atan2(y2 - y1, x2 - x1)
    scene.add(crack)
  }
  const stone = new MeshStandardMaterial({ color: 0xa3988c, roughness: 0.86 })
  const rubbleMat = new MeshStandardMaterial({ color: 0x4e4943, roughness: 0.95 })
  const iron = new MeshStandardMaterial({ color: 0x3e4450, roughness: 0.42, metalness: 0.45 })
  let gate = 0
  let gateScore = -Infinity
  COURTYARD.forEach((start, index) => {
    const end = COURTYARD[(index + 1) % COURTYARD.length] ?? start
    const score = start[1] + end[1]
    if (score > gateScore) {
      gateScore = score
      gate = index
    }
  })
  COURTYARD.forEach((start, index) => {
    const end = COURTYARD[(index + 1) % COURTYARD.length] ?? start
    if (index === gate) {
      const left = lerpPoint(start, end, 0.3)
      const right = lerpPoint(start, end, 0.7)
      placeWall(scene, start, left, 15, stone)
      placeWall(scene, right, end, 11, rubbleMat)
      placeGate(scene, lerpPoint(start, end, 0.5), Math.atan2(end[1] - start[1], end[0] - start[0]), stone, iron)
      return
    }
    placeWall(scene, start, end, index % 3 === 0 ? 8 : 20, index % 3 === 0 ? rubbleMat : stone)
  })
  COURTYARD.forEach(([x, y], index) => {
    const height = [32, 9, 24, 7, 28, 11, 20, 8][index] ?? 14
    const outward = vertexOutward(index)
    const pillar = new Mesh(new CylinderGeometry(7, 8, height, 6), index % 2 === 0 ? stone : rubbleMat)
    const at = simToWorld(x + outward.x * 8, y + outward.y * 8, height / 2)
    pillar.position.set(at.x, at.y, at.z)
    pillar.castShadow = true
    pillar.receiveShadow = true
    scene.add(pillar)
  })
}

function lerpPoint(start: readonly [number, number], end: readonly [number, number], t: number): readonly [number, number] {
  return [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t]
}

function placeWall(scene: Scene, start: readonly [number, number], end: readonly [number, number], height: number, material: MeshStandardMaterial): void {
  const ex = end[0] - start[0]
  const ey = end[1] - start[1]
  const len = Math.hypot(ex, ey)
  if (len < 4) return
  const nx = -ey / len
  const ny = ex / len
  const wall = new Mesh(new BoxGeometry(len, height, 8), material)
  const at = simToWorld((start[0] + end[0]) / 2 - nx * 4, (start[1] + end[1]) / 2 - ny * 4, height / 2)
  wall.position.set(at.x, at.y, at.z)
  wall.rotation.y = -Math.atan2(ey, ex)
  wall.castShadow = true
  wall.receiveShadow = true
  scene.add(wall)
}

function placeGate(scene: Scene, mid: readonly [number, number], angle: number, stone: MeshStandardMaterial, iron: MeshStandardMaterial): void {
  const group = new Group()
  const at = simToWorld(mid[0], mid[1], 0)
  group.position.set(at.x, 0, at.z)
  group.rotation.y = -angle
  const left = new Mesh(new BoxGeometry(7, 28, 7), stone)
  left.position.set(-16, 14, -4)
  const right = new Mesh(new BoxGeometry(7, 28, 7), stone)
  right.position.set(16, 14, -4)
  const lintel = new Mesh(new BoxGeometry(40, 4, 7), stone)
  lintel.position.set(0, 26, -4)
  group.add(left, right, lintel)
  for (let i = -2; i <= 2; i += 1) {
    const bar = new Mesh(new BoxGeometry(1.3, 16, 1.3), iron)
    bar.position.set(i * 6, 10, -4)
    group.add(bar)
  }
  group.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
  })
  scene.add(group)
}

function vertexOutward(index: number): { x: number; y: number } {
  const curr = COURTYARD[index] ?? [0, 0]
  const prev = COURTYARD[(index + COURTYARD.length - 1) % COURTYARD.length] ?? curr
  const next = COURTYARD[(index + 1) % COURTYARD.length] ?? curr
  const inwardA = norm(-(curr[1] - prev[1]), curr[0] - prev[0])
  const inwardB = norm(-(next[1] - curr[1]), next[0] - curr[0])
  return norm(-(inwardA.x + inwardB.x), -(inwardA.y + inwardB.y))
}

function norm(x: number, y: number): { x: number; y: number } {
  const len = Math.hypot(x, y) || 1
  return { x: x / len, y: y / len }
}

function kindColor(kind: EnemyKind): number {
  switch (kind) {
    case 'slime': return 0x7dce4a
    case 'slimeBlue': return 0x4aa0e0
    case 'baby': return 0xb6e98a
    case 'bat': return 0x5c4a78
    case 'melee': return 0xd07a3a
    case 'archer': return 0xc45b8a
    case 'bomber': return 0xe0a030
    case 'armor': return 0x8d97a8
    case 'ghost': return 0xd7e4ff
    case 'mage': return 0x7a4ad0
    case 'bolt': return 0xffb15a
    case 'bossRing': return 0xb64040
    case 'bossMortar': return 0x8d3d55
    case 'pup': return 0xe7c07a
    default: return 0x888888
  }
}

function setEmissive(root: Group, on: boolean): void {
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    const mat = mesh.material
    if (mat instanceof MeshStandardMaterial) {
      mat.emissive.set(on ? 0xfff6d0 : 0x000000)
      mat.emissiveIntensity = on ? 0.85 : 0
    }
  })
}
