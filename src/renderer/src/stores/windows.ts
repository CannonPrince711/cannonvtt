/** Floating windows over the canvas (actor sheets), like Foundry's sheet windows. */
import { create } from 'zustand'

export interface FloatingWindow {
  id: string
  kind: 'actor'
  /** The character or NPC note. */
  path: string
  x: number
  y: number
  z: number
}

interface WindowStore {
  windows: FloatingWindow[]
  top: number
  open: (w: Omit<FloatingWindow, 'id' | 'x' | 'y' | 'z'>) => void
  close: (id: string) => void
  focus: (id: string) => void
  move: (id: string, x: number, y: number) => void
}

export const useWindows = create<WindowStore>((set, get) => ({
  windows: [],
  top: 10,
  open(w) {
    const existing = get().windows.find((x) => x.kind === w.kind && x.path === w.path)
    if (existing) return get().focus(existing.id)
    const n = get().windows.length
    const top = get().top + 1
    set({
      top,
      windows: [...get().windows, { ...w, id: `${w.kind}:${w.path}`, x: 120 + (n % 6) * 28, y: 80 + (n % 6) * 28, z: top }]
    })
  },
  close: (id) => set({ windows: get().windows.filter((w) => w.id !== id) }),
  focus(id) {
    const top = get().top + 1
    set({ top, windows: get().windows.map((w) => (w.id === id ? { ...w, z: top } : w)) })
  },
  move: (id, x, y) => set({ windows: get().windows.map((w) => (w.id === id ? { ...w, x, y } : w)) })
}))

export function openActorWindow(path: string): void {
  useWindows.getState().open({ kind: 'actor', path })
}
