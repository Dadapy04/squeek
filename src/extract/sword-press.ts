/** Sword button. The whoosh and the swing pose start inside the press, never on a later step. */

export interface SwordPress {
  begin(): boolean
  whoosh(): void
  reject(): void
  show(): void
}

export function onSwordPress(press: SwordPress): 'whoosh' | 'drop' {
  if (!press.begin()) {
    press.reject()
    return 'drop'
  }
  press.whoosh()
  press.show()
  return 'whoosh'
}
