/** Blend weights for the hamster rig. The view damps toward these targets. */

export interface Pose {
  gait: number
  crouch: number
  aim: number
  fire: number
  reload: number
  dodge: number
  hurt: number
  dead: number
  swing: number
}

export function poseTarget(input: {
  moving: number
  sprint: boolean
  crouch: boolean
  aim: boolean
  muzzle: number
  reloading: boolean
  dodge: boolean
  hurt: boolean
  dead: boolean
  swinging: boolean
}): Pose {
  const dead = input.dead ? 1 : 0
  const hurt = input.dead ? 0 : input.hurt ? 1 : 0
  const dodge = input.dead ? 0 : input.dodge ? 1 : 0
  const crouch = input.dead ? 0 : input.crouch ? 1 : 0
  const aim = input.dead ? 0 : input.aim ? 1 : 0
  const moving = input.dead ? 0 : Math.max(0, Math.min(1, input.moving))
  const gait = input.sprint && !input.crouch && !input.aim ? Math.max(moving, 0.85) : moving * (crouch ? 0.55 : aim ? 0.5 : 1)
  return {
    gait,
    crouch,
    aim,
    fire: input.dead ? 0 : Math.max(0, Math.min(1, input.muzzle > 0 ? 1 : 0)),
    reload: input.dead ? 0 : input.reloading ? 1 : 0,
    dodge,
    hurt,
    dead,
    swing: input.dead ? 0 : input.swinging ? 1 : 0,
  }
}

export type ArmMode = 'dead' | 'reload' | 'swing' | 'fire' | 'aim' | 'ready'

/** One arm action wins. Death, reload, and the sword beat aim and fire. */
export function armMode(pose: Pose): ArmMode {
  if (pose.dead > 0.55) return 'dead'
  if (pose.reload > 0.45) return 'reload'
  if (pose.swing > 0.2) return 'swing'
  if (pose.fire > 0.35) return 'fire'
  if (pose.aim > 0.35) return 'aim'
  return 'ready'
}

/** 0 at the start, 1 at the hit, back to 0 at the end of recovery. */
export function swingArc(t: number, windup: number, active: number, follow: number): number {
  if (t < 0) return 0
  const hit = Math.max(0.02, windup + active * 0.5)
  const end = Math.max(hit + 0.02, windup + active + follow)
  if (t >= end) return 0
  if (t <= hit) return Math.sin((t / hit) * Math.PI * 0.5)
  return Math.cos(((t - hit) / (end - hit)) * Math.PI * 0.5)
}

/** Steps drop out while the body is busy or down. */
export function strideScale(pose: Pose): number {
  if (pose.dead > 0.5 || pose.reload > 0.45 || pose.swing > 0.2) return 0
  return pose.gait * (1 - Math.min(1, pose.dodge) * 0.85)
}
