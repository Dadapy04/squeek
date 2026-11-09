import { AmbientLight, BoxGeometry, Color, Fog, Group, InstancedMesh, Mesh, MeshLambertMaterial, PerspectiveCamera, PointLight, Scene, WebGLRenderer } from 'three'
import type { RpgState } from './sim.ts'
import { CHEST, WALLS } from './world.ts'

export interface RuinView {
  sync: (state: RpgState, dt: number) => void
  resize: () => void
  dispose: () => void
}

export function createRuinView(canvas: HTMLCanvasElement): RuinView | null {
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  renderer.setClearColor(0x120910, 1)
  const scene = new Scene()
  scene.background = new Color(0x120910)
  scene.fog = new Fog(0x1a1024, 40, 280)
  scene.add(new AmbientLight(0xc9b8e8, 0.45))
  const moon = new PointLight(0xf0d8a8, 28, 220, 1.4)
  moon.position.set(80, 36, 40)
  scene.add(moon)
  const bossLight = new PointLight(0xc45cff, 18, 180, 1.6)
  bossLight.position.set(210, 28, 370)
  scene.add(bossLight)
  const camera = new PerspectiveCamera(58, 1, 0.4, 400)
  const stone = new MeshLambertMaterial({ color: 0x3a3348 })
  const floor = new Mesh(new BoxGeometry(420, 2, 460), new MeshLambertMaterial({ color: 0x241c2e }))
  floor.position.set(210, -1, 230)
  scene.add(floor)
  const walls = new InstancedMesh(new BoxGeometry(1, 1, 1), stone, WALLS.length)
  const dummy = new Mesh()
  WALLS.forEach((box, index) => {
    dummy.position.set(box.x + box.w / 2, 12, box.y + box.h / 2)
    dummy.scale.set(box.w, 24, box.h)
    dummy.updateMatrix()
    walls.setMatrixAt(index, dummy.matrix)
  })
  walls.instanceMatrix.needsUpdate = true
  scene.add(walls)
  const chest = new Mesh(new BoxGeometry(14, 10, 10), new MeshLambertMaterial({ color: 0xe6b15a }))
  chest.position.set(CHEST.x, 6, CHEST.y)
  scene.add(chest)
  const hero = makeHamster()
  const foes = new Map<number, Group>()
  scene.add(hero)
  let swing = 0

  function resize(): void {
    const w = Math.max(1, canvas.clientWidth)
    const h = Math.max(1, canvas.clientHeight)
    const narrow = w < 900
    renderer.setPixelRatio(Math.min(narrow ? 1 : 1.5, window.devicePixelRatio || 1))
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.fov = narrow ? 64 : 56
    camera.updateProjectionMatrix()
  }

  function sync(state: RpgState, dt: number): void {
    swing = state.swing > 0 ? Math.min(1, swing + dt * 6) : Math.max(0, swing - dt * 4)
    const blade = hero.getObjectByName('blade')
    if (blade) blade.rotation.y = state.skillLeft > 0 ? swing * 2.2 : Math.sin(swing * Math.PI) * (state.combo >= 2 ? 1.4 : 0.9)
    hero.position.set(state.x, 0, state.y)
    hero.rotation.y = state.yaw
    const cloak = hero.getObjectByName('cloak') as Mesh | undefined
    if (cloak && cloak.material instanceof MeshLambertMaterial) {
      cloak.material.color.setHex(state.iframes > 0.2 ? 0xd46048 : 0x5c3d6e)
    }
    chest.visible = !state.chestTaken
    const alive = new Set(state.enemies.map((enemy) => enemy.id))
    for (const [id, group] of foes) {
      if (!alive.has(id)) {
        scene.remove(group)
        foes.delete(id)
      }
    }
    for (const enemy of state.enemies) {
      let group = foes.get(enemy.id)
      if (!group) {
        group = enemy.kind === 'boss' ? makeBoss() : makeCrawler()
        foes.set(enemy.id, group)
        scene.add(group)
      }
      group.visible = enemy.hp > 0
      group.position.set(enemy.x, 0, enemy.y)
      group.scale.setScalar(enemy.state === 'windup' ? 1.08 : 1)
      const head = group.getObjectByName('head') as Mesh | undefined
      if (head && head.material instanceof MeshLambertMaterial) {
        head.material.color.setHex(enemy.telegraph > 0.2 ? 0xffe08a : enemy.kind === 'boss' ? 0xf0d8a8 : 0xf2c7b0)
      }
    }
    const fx = Math.sin(state.yaw)
    const fz = -Math.cos(state.yaw)
    const dist = state.phase === 'victory' ? 26 : 18
    camera.position.set(state.x - fx * dist, 16, state.y - fz * dist)
    camera.lookAt(state.x + fx * 8, 7, state.y + fz * 8)
    renderer.render(scene, camera)
  }

  resize()
  return { sync, resize, dispose: () => renderer.dispose() }
}

function makeHamster(): Group {
  const group = new Group()
  const cloth = new MeshLambertMaterial({ color: 0x5c3d6e })
  const face = new MeshLambertMaterial({ color: 0xf2c7b0 })
  const cloak = new Mesh(new BoxGeometry(8, 8, 5), cloth)
  cloak.name = 'cloak'
  cloak.position.y = 6
  const head = new Mesh(new BoxGeometry(6, 5, 5), face)
  head.position.y = 12
  const earL = new Mesh(new BoxGeometry(1.4, 2.4, 1.2), face)
  earL.position.set(-2, 15.2, 0)
  const earR = earL.clone()
  earR.position.x = 2
  const arm = new Group()
  arm.position.set(4, 8, 1)
  const blade = new Mesh(new BoxGeometry(1, 1, 12), new MeshLambertMaterial({ color: 0xf4f1ea }))
  blade.name = 'blade'
  blade.position.set(0, -1, 6)
  arm.add(blade)
  group.add(cloak, head, earL, earR, arm)
  return group
}

function makeCrawler(): Group {
  const group = new Group()
  const body = new Mesh(new BoxGeometry(12, 6, 8), new MeshLambertMaterial({ color: 0x8d2a3a }))
  body.position.y = 4
  const head = new Mesh(new BoxGeometry(5, 4, 4), new MeshLambertMaterial({ color: 0xf2c7b0 }))
  head.name = 'head'
  head.position.set(0, 8, 3)
  group.add(body, head)
  return group
}

function makeBoss(): Group {
  const group = new Group()
  const body = new Mesh(new BoxGeometry(18, 16, 12), new MeshLambertMaterial({ color: 0x4a1d4a }))
  body.position.y = 10
  const head = new Mesh(new BoxGeometry(8, 7, 7), new MeshLambertMaterial({ color: 0xf0d8a8 }))
  head.name = 'head'
  head.position.y = 21
  const crown = new Mesh(new BoxGeometry(10, 2, 3), new MeshLambertMaterial({ color: 0xe6b15a }))
  crown.position.y = 25
  group.add(body, head, crown)
  return group
}
