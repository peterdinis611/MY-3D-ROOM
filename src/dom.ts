/** Typed DOM helpers for UI controls. */

export function $(id: string): HTMLElement | null {
  return document.getElementById(id)
}

export function $el<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null
}

export function setSwitch(id: string, on: boolean): void {
  const b = $(id)
  if (!b) return
  b.classList.toggle('on', on)
  b.setAttribute('aria-pressed', on ? 'true' : 'false')
}
