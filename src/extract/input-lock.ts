/** How long one tap may wait out the swing cooldown. */
export const ATTACK_BUFFER_MS = 180

export interface AttackBuffer {
  armed: boolean
  at: number
}

/** Remember a single tap. A newer tap replaces it; it never stacks. */
export function armAttack(now: number): AttackBuffer {
  return { armed: true, at: now }
}

export function attackLive(buffer: AttackBuffer | null, now: number, windowMs = ATTACK_BUFFER_MS): boolean {
  if (!buffer?.armed) return false
  return now - buffer.at <= windowMs
}

export function disarmAttack(buffer: AttackBuffer | null, started: boolean, now: number, windowMs = ATTACK_BUFFER_MS): AttackBuffer | null {
  if (!buffer?.armed) return buffer
  if (started || now - buffer.at > windowMs) return { armed: false, at: buffer.at }
  return buffer
}

/** A hold such as Tangkis ends on any of these. */
export function holdReleased(kind: string): boolean {
  return kind === 'pointerup'
    || kind === 'pointercancel'
    || kind === 'lostpointercapture'
    || kind === 'touchend'
    || kind === 'touchcancel'
    || kind === 'blur'
    || kind === 'visibilitychange'
}

/** Second touchend inside 350ms should not zoom, except in a scrolling modal or a field. */
export function blockSecondTap(deltaMs: number, inScrollable: boolean): boolean {
  if (!Number.isFinite(deltaMs) || deltaMs < 0 || deltaMs > 350) return false
  return !inScrollable
}
