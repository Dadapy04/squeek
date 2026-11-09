import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  Quaternion,
  RingGeometry,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { chaseDistance, LIMBS } from './guns.ts'
import { armMode, poseTarget, strideScale, swingArc, type Pose } from './pose.ts'
import { LAB_ROW, MINE_DOOR_ROW, ROWS, RUIN_DOOR_ROW, TILE } from './world.ts'
import type { RunState } from './run.ts'
import { blocked } from './run.ts'

export interface TacticalView {
  sync: (run: RunState, aim: boolean, view?: { fov: number; dt: number }) => void
  resize: () => void
  stats: () => { calls: number; triangles: number; cameraDist: number; stride: number; armX: number; armY: number; hipsY: number; lean: number }
  lost: () => boolean
  dispose: () => void
  setQuality: (quality: 'low' | 'med') => void
  quality: () => 'low' | 'med'
  lose: () => void
  restore: () => void
  gpu: () => string
}

const _pos = new Vector3()
const _quat = new Quaternion()
const _scale = new Vector3()
const _matrix = new Matrix4()

export function createTacticalView(canvas: HTMLCanvasElement, reduced: boolean): TacticalView | null {
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  renderer.setClearColor(0x3a2c22, 1)
  renderer.shadowMap.enabled = false
  const scene = new Scene()
  scene.background = new Color(0x3a2c22)
  scene.fog = new Fog(0x4a382c, 160, 560)
  scene.add(new AmbientLight(0xfff2dc, 1.15))
  const sun = new DirectionalLight(0xffe0b0, 1.15)
  sun.position.set(40, 90, 20)
  scene.add(sun)
  const fill = new DirectionalLight(0xd7e4ff, 0.7)
  fill.position.set(-50, 30, 40)
  scene.add(fill)
  const props = new Group()
  scene.add(props)
  let quality: 'low' | 'med' = 'med'
  let sizedW = 0
  let sizedH = 0
  let sizedRatio = -1
  let gpu = 'unknown'
  try {
    const gl = renderer.getContext()
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER))
  } catch {
    gpu = 'unavailable'
  }
  const camera = new PerspectiveCamera(58, 1, 0.8, 800)
  const wallGeo = new BoxGeometry(1, 1, 1)
  const wallMat = new MeshLambertMaterial({ color: 0x8d7260 })
  let walls: InstancedMesh | null = null
  const floorMat = new MeshLambertMaterial({ color: 0x6b5344 })
  const floor = new Mesh(new BoxGeometry(1, 1, 1), floorMat)
  scene.add(floor)
  const bodyMat = new MeshLambertMaterial({ color: 0xc48a62 })
  const clothMat = new MeshLambertMaterial({ color: 0xa56b45 })
  const faceMat = new MeshLambertMaterial({ color: 0xf2c7b0 })
  const metalMat = new MeshLambertMaterial({ color: 0xc5ccd1 })
  const packMat = new MeshLambertMaterial({ color: 0x6a5044 })
  const player = new Group()
  const hips = new Group()
  const torso = new Mesh(new BoxGeometry(10, 10, 7), clothMat)
  torso.position.y = 7
  const head = new Mesh(new BoxGeometry(8, 7, 7), faceMat)
  head.position.y = 15
  const earL = new Mesh(new BoxGeometry(2, 3, 2), bodyMat)
  earL.position.set(-3, 19, 0)
  const earR = earL.clone()
  earR.position.x = 3
  const snout = new Mesh(new BoxGeometry(4, 3, 4), faceMat)
  snout.position.set(0, 14, 4)
  const pack = new Mesh(new BoxGeometry(7, 8, 4), packMat)
  pack.position.set(0, 8, -5)
  const armL = new Group()
  armL.position.set(-6, 10, 1)
  const armR = new Group()
  armR.position.set(6, 10, 1)
  const foreL = new Mesh(new BoxGeometry(3, 8, 3), clothMat)
  foreL.position.y = -4
  const foreR = foreL.clone()
  armL.add(foreL)
  armR.add(foreR)
  const barrel = new Mesh(new BoxGeometry(2.4, 2.2, 16), metalMat)
  barrel.position.set(0, -6, 8)
  const flash = new Mesh(new BoxGeometry(2, 2, 3), new MeshLambertMaterial({ color: 0xfff1a8 }))
  flash.position.set(0, -6, 16)
  flash.visible = false
  const blade = new Mesh(new BoxGeometry(1.4, 1.4, 16), new MeshLambertMaterial({ color: 0xf4f7fb }))
  blade.position.set(1, -6, 8)
  armR.add(barrel, blade, flash)
  const legL = new Group()
  legL.position.set(-3, 2, 0)
  const legR = new Group()
  legR.position.set(3, 2, 0)
  const shinL = new Mesh(new BoxGeometry(3, 8, 3), clothMat)
  shinL.position.y = -4
  const shinR = shinL.clone()
  legL.add(shinL)
  legR.add(shinR)
  hips.add(torso, head, earL, earR, snout, pack, armL, armR, legL, legR)
  player.add(hips)
  const shadow = new Mesh(new BoxGeometry(12, 0.4, 8), new MeshLambertMaterial({ color: 0x1a120e }))
  shadow.position.y = 0.3
  scene.add(shadow)
  const impactGeo = new BoxGeometry(1.6, 1.6, 1.6)
  const impactPool: Mesh[] = []
  for (let i = 0; i < 8; i++) {
    const mark = new Mesh(impactGeo, new MeshLambertMaterial({ color: 0xffe08a }))
    mark.visible = false
    scene.add(mark)
    impactPool.push(mark)
  }
  const tracerGeo = new BoxGeometry(0.35, 0.35, 1)
  const tracerMat = new MeshLambertMaterial({ color: 0xfff1a8 })
  const tracerPool: Mesh[] = []
  for (let i = 0; i < 8; i++) {
    const bolt = new Mesh(tracerGeo, tracerMat)
    bolt.visible = false
    scene.add(bolt)
    tracerPool.push(bolt)
  }
  scene.add(player)
  const enemyRoot = new Group()
  const lootRoot = new Group()
  scene.add(enemyRoot, lootRoot)
  const extract = new Mesh(
    new RingGeometry(16, 22, 24),
    new MeshLambertMaterial({ color: 0xe6b15a }),
  )
  extract.rotation.x = -Math.PI / 2
  scene.add(extract)
  let worldBuilt = false
  let lost = false
  let mobile = true
  let camYaw = 0
  let camReady = false
  let shoulder = 0
  let shownFov = 62
  let gaitPhase = 0
  let blend: Pose = poseTarget({
    moving: 0,
    sprint: false,
    crouch: false,
    aim: false,
    muzzle: 0,
    reloading: false,
    dodge: false,
    hurt: false,
    dead: false,
    swinging: false,
  })

  function wipeWorld(): void {
    if (walls) {
      scene.remove(walls)
      walls = null
    }
    for (const child of [...props.children]) {
      props.remove(child)
      const mesh = child as InstancedMesh
      mesh.geometry?.dispose()
    }
    enemyRoot.clear()
    lootRoot.clear()
    worldBuilt = false
    sizedW = 0
  }
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault()
    lost = true
  })
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false
    wipeWorld()
    resize()
  })

  function resize(): void {
    const w = Math.max(1, canvas.clientWidth)
    const h = Math.max(1, canvas.clientHeight)
    mobile = w < 900
    const ratio = Math.min(quality === 'low' || mobile ? 1 : 1.5, window.devicePixelRatio || 1)
    const near = quality === 'low' ? 70 : mobile ? 110 : 180
    const far = quality === 'low' ? 280 : mobile ? 380 : 560
    scene.fog = new Fog(0x4a382c, near, far)
    fill.visible = quality !== 'low'
    if (w === sizedW && h === sizedH && ratio === sizedRatio) return
    sizedW = w
    sizedH = h
    sizedRatio = ratio
    renderer.setPixelRatio(ratio)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.fov = mobile ? 62 : 54
    camera.updateProjectionMatrix()
  }

  function build(run: RunState): void {
    const boxes = run.world.obstacles
    if (walls) scene.remove(walls)
    const mesh = new InstancedMesh(wallGeo, wallMat, Math.max(1, boxes.length))
    boxes.forEach((box, index) => {
      _pos.set(box.x + box.w / 2, 16, box.y + box.h / 2)
      _scale.set(box.w, 32, box.h)
      _matrix.compose(_pos, _quat, _scale)
      mesh.setMatrixAt(index, _matrix)
    })
    mesh.count = boxes.length
    mesh.instanceMatrix.needsUpdate = true
    walls = mesh
    scene.add(mesh)
    floor.scale.set(run.world.w, 2, run.world.h)
    floor.position.set(run.world.w / 2, -1, run.world.h / 2)
    const bands: Array<[number, number, number]> = [
      [0, run.world.safeY, 0x8a6244],
      [run.world.safeY, MINE_DOOR_ROW * TILE, 0x6a5344],
      [MINE_DOOR_ROW * TILE, RUIN_DOOR_ROW * TILE, 0x5d6454],
      [RUIN_DOOR_ROW * TILE, LAB_ROW * TILE, 0x4d5c68],
      [LAB_ROW * TILE, run.world.h, 0x3f5c62],
    ]
    const slabGeo = new BoxGeometry(1, 1, 1)
    for (const [y0, y1, color] of bands) {
      const slab = new Mesh(slabGeo, new MeshLambertMaterial({ color }))
      slab.scale.set(run.world.w, 0.35, Math.max(1, y1 - y0))
      slab.position.set(run.world.w / 2, 0.2, y0 + (y1 - y0) / 2)
      props.add(slab)
    }
    const lamps: Array<[number, number]> = []
    const rails: Array<[number, number, number]> = []
    for (let row = 0; row < ROWS.length; row++) {
      const line = ROWS[row] ?? ''
      for (let col = 0; col < line.length; col++) {
        const cell = line[col]
        const x = col * TILE + TILE / 2
        const z = row * TILE + TILE / 2
        if (cell === 'l') lamps.push([x, z])
        if (cell === '=' || cell === 'i') rails.push([x, z, cell === 'i' ? 1 : 0])
      }
    }
    if (lamps.length) {
      const posts = new InstancedMesh(new BoxGeometry(8, 22, 8), new MeshLambertMaterial({ color: 0xf0d080 }), lamps.length)
      lamps.forEach(([x, z], index) => {
        _pos.set(x, 11, z)
        _scale.set(1, 1, 1)
        _matrix.compose(_pos, _quat, _scale)
        posts.setMatrixAt(index, _matrix)
      })
      posts.instanceMatrix.needsUpdate = true
      props.add(posts)
    }
    const railMat = new MeshLambertMaterial({ color: 0xc5ccd1 })
    const pipeMat = new MeshLambertMaterial({ color: 0x8aa0a8 })
    for (const kind of [0, 1]) {
      const group = rails.filter((item) => item[2] === kind)
      if (!group.length) continue
      const mesh = new InstancedMesh(new BoxGeometry(14, 2, 4), kind === 1 ? pipeMat : railMat, group.length)
      group.forEach(([x, z], index) => {
        _pos.set(x, 1.2, z)
        _scale.set(1, 1, 1)
        _matrix.compose(_pos, _quat, _scale)
        mesh.setMatrixAt(index, _matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
      props.add(mesh)
    }
    extract.position.set(run.world.extract.x, 0.4, run.world.extract.y)
    enemyRoot.clear()
    const limbGeo = new Map<string, BoxGeometry>()
    const limbMat = new Map<string, MeshLambertMaterial>([
      ['torso:biter', new MeshLambertMaterial({ color: 0xff5a3c })],
      ['torso:spitter', new MeshLambertMaterial({ color: 0xffd15a })],
      ['torso:guard', new MeshLambertMaterial({ color: 0x8fb4d8 })],
      ['arm', new MeshLambertMaterial({ color: 0xc46a45 })],
      ['leg', new MeshLambertMaterial({ color: 0x6a3a32 })],
    ])
    for (const enemy of run.enemies) {
      const bug = new Group()
      const headMat = new MeshLambertMaterial({ color: 0xffe2b0 })
      for (const limb of LIMBS) {
        let geo = limbGeo.get(limb.part)
        if (!geo) {
          geo = new BoxGeometry(limb.hx * 2, limb.hz * 2, limb.hy * 2)
          limbGeo.set(limb.part, geo)
        }
        const material = limb.part === 'head' ? headMat : limb.part === 'torso' ? limbMat.get(`torso:${enemy.kind}`) : limbMat.get(limb.part)
        const mesh = new Mesh(geo, material ?? headMat)
        mesh.position.set(limb.x, limb.z, limb.y)
        mesh.name = limb.part
        bug.add(mesh)
      }
      bug.userData.id = enemy.id
      enemyRoot.add(bug)
    }
    lootRoot.clear()
    const chestGeo = new BoxGeometry(10, 8, 8)
    const chestMat = new MeshLambertMaterial({ color: 0x8d5a32 })
    const rareMat = new MeshLambertMaterial({ color: 0x7ec8ff })
    for (const loot of run.loots) {
      const chest = new Mesh(chestGeo, loot.kind === 'core' || loot.kind === 'relic' ? rareMat : chestMat)
      chest.position.set(loot.x, loot.extra.length > 0 ? 6 : 4, loot.y)
      if (loot.extra.length > 0) chest.scale.set(1.35, 1.7, 1.35)
      chest.userData.id = loot.id
      lootRoot.add(chest)
    }
    worldBuilt = true
  }

  function damp(current: number, target: number, dt: number, seconds: number): number {
    if (dt <= 0 || dt > 0.25) return target
    const gain = 1 - Math.exp(-dt / seconds)
    return current + (target - current) * gain
  }

  function sync(run: RunState, aim: boolean, view?: { fov: number; dt: number }): void {
    if (lost) return
    if (!worldBuilt) build(run)
    const yaw = run.yaw
    const dt = view?.dt ?? 0.016
    if (!camReady) {
      camYaw = yaw
      camReady = true
    }
    let turn = yaw - camYaw
    while (turn > Math.PI) turn -= Math.PI * 2
    while (turn < -Math.PI) turn += Math.PI * 2
    camYaw = damp(camYaw, camYaw + turn, dt, 0.07)
    const fwdX = Math.sin(camYaw)
    const fwdZ = -Math.cos(camYaw)
    const eye = (run.stance === 'crouch' ? 11 : 18) + run.z
    const bodyX = Math.sin(yaw)
    const bodyZ = -Math.cos(yaw)
    player.position.set(run.x, run.z, run.y)
    player.rotation.set(0, Math.atan2(bodyX, bodyZ), 0)
    const speed = Math.hypot(run.slideX, run.slideY)
    const goal = poseTarget({
      moving: Math.min(1, speed / 140),
      sprint: speed > 200,
      crouch: run.stance === 'crouch',
      aim,
      muzzle: run.muzzle,
      reloading: run.reloadLeft > 0,
      dodge: run.dodgeLeft > 0,
      hurt: run.hitFlash > 0.05,
      dead: run.phase === 'dead',
      swinging: run.swingT >= 0,
    })
    const k = dt <= 0 || dt > 0.25 ? 1 : 1 - Math.exp(-dt / 0.12)
    blend = {
      gait: blend.gait + (goal.gait - blend.gait) * k,
      crouch: blend.crouch + (goal.crouch - blend.crouch) * k,
      aim: blend.aim + (goal.aim - blend.aim) * k,
      fire: goal.fire,
      reload: blend.reload + (goal.reload - blend.reload) * k,
      dodge: blend.dodge + (goal.dodge - blend.dodge) * k,
      hurt: blend.hurt + (goal.hurt - blend.hurt) * k,
      dead: blend.dead + (goal.dead - blend.dead) * k,
      swing: blend.swing + (goal.swing - blend.swing) * k,
    }
    if (!reduced && run.grounded && speed > 24) gaitPhase += Math.max(3.4, speed * 0.028) * dt
    const stepSwing = Math.sin(gaitPhase) * strideScale(blend)
    shinL.position.set(0, -4 + Math.max(0, stepSwing) * 3.2, stepSwing * 8)
    shinR.position.set(0, -4 + Math.max(0, -stepSwing) * 3.2, -stepSwing * 8)
    legL.rotation.x = stepSwing * 1.05 + blend.crouch * 0.9
    legR.rotation.x = -stepSwing * 1.05 + blend.crouch * 0.9
    hips.position.set(blend.dodge * 3.4, 6 - blend.crouch * 5.5 + Math.abs(stepSwing) * 1.15, 0)
    const air = Math.min(1, Math.max(0, run.z) / 16)
    shadow.position.set(run.x, 0.3, run.y)
    shadow.scale.set(1.15 - air * 0.55 + blend.crouch * 0.1, 1, 0.9 - air * 0.4)
    hips.rotation.z = blend.dodge * 0.75 + blend.hurt * 0.6
    hips.rotation.x = blend.dead * 1.4 + blend.crouch * 0.28
    clothMat.color.setHex(blend.dead > 0.6 ? 0x6a4038 : blend.hurt > 0.35 ? 0xd46048 : 0xa56b45)
    const arc = swingArc(run.swingT, run.windup, run.active, run.follow)
    const arms = armMode(blend)
    if (arms === 'dead') {
      armR.rotation.set(0.7, 0.2, 1.15)
      armL.rotation.set(0.45, -0.1, -0.95)
      barrel.rotation.set(0.9, 0, 0)
      blade.rotation.set(0.8, 0.4, 0)
    } else if (arms === 'reload') {
      armR.rotation.set(2.2, 0.2, -0.5)
      armL.rotation.set(0.55, 0.45, 0.25)
      barrel.rotation.set(-0.15, 0, 0)
      blade.rotation.set(0, 0, 0)
    } else if (arms === 'swing') {
      armR.rotation.set(-0.25, arc * (run.slashKind === 'heavy' ? 1.7 : 1.35), 0.05)
      armL.rotation.set(0.15, -0.25, 0)
      barrel.rotation.set(0, 0, 0)
      blade.rotation.set(0, 0, 0)
    } else if (arms === 'fire' || arms === 'aim') {
      armR.rotation.set(-1.25 - (arms === 'fire' ? 0.4 : 0), -0.5, -0.2)
      armL.rotation.set(-0.75, 0.4, 0.25)
      barrel.rotation.set(1.25, 0, 0)
      blade.rotation.set(0, 0, 0)
    } else {
      armR.rotation.set(-0.1 - stepSwing * 0.2, 0.04, 0.18)
      armL.rotation.set(-0.12 + stepSwing * 0.45, 0, -0.08)
      barrel.rotation.set(0, 0, 0)
      blade.rotation.set(0, 1.2, 0.15)
    }
    barrel.visible = run.weapon !== 'sword'
    blade.visible = run.weapon === 'sword'
    const gunScale = run.weapon === 'marksman' ? 1.6 : run.weapon === 'shotgun' ? 1.15 : run.weapon === 'pistol' ? 0.7 : 1
    barrel.scale.set(run.weapon === 'shotgun' ? 1.5 : 1, 1, gunScale)
    flash.visible = run.muzzle > 0
    for (let i = 0; i < impactPool.length; i++) {
      const mark = impactPool[i]
      const impact = run.impacts[i]
      if (!mark || !impact) {
        if (mark) mark.visible = false
        continue
      }
      mark.visible = true
      mark.position.set(impact.x, impact.z, impact.y)
      const tint = impact.part === 'head' ? 0xfff6d0 : impact.part === 'wall' ? 0xd7c4a4 : 0xffb15a
      ;(mark.material as MeshLambertMaterial).color.setHex(tint)
    }
    for (let i = 0; i < tracerPool.length; i++) {
      const bolt = tracerPool[i]
      const tracer = run.tracers[i]
      if (!bolt || !tracer) {
        if (bolt) bolt.visible = false
        continue
      }
      bolt.visible = true
      const dx = tracer.x2 - tracer.x
      const dy = tracer.y2 - tracer.y
      const dz = tracer.z2 - tracer.z
      const length = Math.max(0.4, Math.hypot(dx, dy, dz))
      bolt.position.set((tracer.x + tracer.x2) / 2, (tracer.z + tracer.z2) / 2, (tracer.y + tracer.y2) / 2)
      bolt.scale.set(1, 1, length)
      bolt.lookAt(tracer.x2, tracer.z2, tracer.y2)
    }
    for (const child of enemyRoot.children) {
      const bug = child as Group
      const enemy = run.enemies.find((item) => item.id === bug.userData.id)
      if (!enemy) continue
      bug.visible = enemy.hp > 0
      bug.position.set(enemy.x, enemy.hp > 0 ? 0 : 2, enemy.y)
      bug.rotation.set(0, Math.atan2(Math.sin(enemy.face), -Math.cos(enemy.face)), enemy.hp > 0 ? 0 : 1.1)
      const hot = enemy.mind === 'alert' || enemy.mind === 'chase' || enemy.state === 'windup'
      for (const limb of bug.children) {
        limb.rotation.set(0, 0, 0)
        if (limb.name !== 'head') continue
        const mesh = limb as Mesh
        ;(mesh.material as MeshLambertMaterial).color.setHex(hot ? 0xfff2a8 : 0xffe2b0)
      }
    }
    for (const child of lootRoot.children) {
      const mesh = child as Mesh
      const loot = run.loots.find((item) => item.id === mesh.userData.id)
      mesh.visible = Boolean(loot && !loot.taken)
    }
    const desired = aim ? 34 : run.stance === 'crouch' ? 44 : 58
    const dist = chaseDistance(run.x, run.y, camYaw, desired, 22, (px, py) => blocked(run.world, px, py, 2))
    shoulder = damp(shoulder, aim ? 9 : 0, dt, 0.1)
    const rightX = Math.cos(camYaw)
    const rightZ = Math.sin(camYaw)
    const lookY = eye + 2 - run.pitch * 10
    camera.position.set(run.x - fwdX * dist + rightX * shoulder, lookY + 16 + run.recoil * 10, run.y - fwdZ * dist + rightZ * shoulder)
    camera.lookAt(run.x + fwdX * 22 + rightX * shoulder, lookY - run.recoil * 8, run.y + fwdZ * 22 + rightZ * shoulder)
    const baseFov = view?.fov ?? (mobile ? 62 : 54)
    shownFov = damp(shownFov, aim ? Math.max(42, baseFov - 12) : baseFov, dt, 0.12)
    camera.fov = shownFov
    camera.updateProjectionMatrix()
    renderer.render(scene, camera)
  }

  function limbDrift(): number {
    let max = 0
    for (const bug of enemyRoot.children) {
      for (const limb of bug.children) {
        max = Math.max(max, Math.abs(limb.rotation.x), Math.abs(limb.rotation.y), Math.abs(limb.rotation.z))
      }
    }
    return max
  }

  resize()
  return {
    sync,
    resize,
    stats: () => ({
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      cameraDist: camera.position.distanceTo(player.position),
      stride: shinL.position.z,
      armX: armR.rotation.x,
      armY: armR.rotation.y,
      hipsY: hips.position.y,
      lean: hips.rotation.z,
      deadTilt: hips.rotation.x,
      impacts: impactPool.filter((mark) => mark.visible).length,
      tracers: tracerPool.filter((bolt) => bolt.visible).length,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      limbDrift: limbDrift(),
    }),
    lost: () => lost,
    dispose: () => renderer.dispose(),
    setQuality(next) {
      quality = next
      sizedW = 0
      resize()
    },
    quality: () => quality,
    lose: () => renderer.forceContextLoss(),
    restore: () => renderer.forceContextRestore(),
    gpu: () => gpu,
  }
}
