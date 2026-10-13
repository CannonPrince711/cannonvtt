/**
 * Scenes: a battlemap image with a square grid, tokens and fog of war,
 * stored as a "type: scene" note in the campaign's Scenes folder. Positions
 * are in image pixels (token x/y is the token's top-left corner), so a scene
 * keeps working when it's shown at any zoom.
 */
import type { VaultPath } from './types'

export const SCENES_FOLDER = 'Scenes'

export const DISPOSITIONS = ['friendly', 'neutral', 'hostile', 'secret'] as const
export type Disposition = (typeof DISPOSITIONS)[number]

export const DISPOSITION_INFO: Record<Disposition, { label: string; color: string }> = {
  friendly: { label: 'Friendly', color: '#3fb27f' },
  neutral: { label: 'Neutral', color: '#d4a843' },
  hostile: { label: 'Hostile', color: '#e5484d' },
  secret: { label: 'Secret', color: '#a78bfa' }
}

export interface SceneGrid {
  /** Pixels per square, in image pixels. */
  size: number
  /** World distance per square (5 for 5 ft). */
  distance: number
  units: string
  /** Where the first full square starts, in image pixels. */
  offsetX: number
  offsetY: number
  /** Show grid lines. */
  visible: boolean
}

export interface Token {
  id: string
  name: string
  /** Top-left corner, in image pixels. */
  x: number
  y: number
  /** Squares per side (1 = Medium, 2 = Large…). */
  size: number
  /** A character or NPC note this token stands for; its sheet holds HP. */
  actor?: VaultPath
  /** Portrait (vault path); otherwise the actor's avatar or initials. */
  img?: string
  disposition: Disposition
  /** Only the DM sees it. */
  hidden?: boolean
  /** Hit points for tokens without an actor sheet (monsters). */
  hp?: { value: number; max: number }
  ac?: number
}

/** A revealed (or, with `hide`, re-hidden) rectangle, in image pixels. */
export interface FogRect {
  x: number
  y: number
  w: number
  h: number
  hide?: boolean
}

export interface Scene {
  path: VaultPath
  name: string
  /** Vault path of the battlemap image, or '' for a blank grid. */
  image: string
  /** Natural image size in pixels (or the blank grid's size). */
  width: number
  height: number
  grid: SceneGrid
  tokens: Token[]
  fog: { enabled: boolean; rects: FogRect[] }
  /** The scene the players see. */
  active: boolean
}

export interface SceneSummary {
  path: VaultPath
  name: string
  image: string
  active: boolean
}

export const DEFAULT_GRID: SceneGrid = { size: 70, distance: 5, units: 'ft', offsetX: 0, offsetY: 0, visible: true }

/** A blank scene is 30 × 20 squares. */
export const BLANK_SIZE = { width: 30 * DEFAULT_GRID.size, height: 20 * DEFAULT_GRID.size }

const num = (v: unknown, d: number): number => {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : d
}
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

export function normalizeGrid(raw: unknown): SceneGrid {
  const g = obj(raw)
  return {
    size: clamp(Math.round(num(g.size, DEFAULT_GRID.size)), 10, 1000),
    distance: clamp(num(g.distance, DEFAULT_GRID.distance), 0.1, 10000),
    units: typeof g.units === 'string' && g.units.trim() ? g.units.trim().slice(0, 12) : DEFAULT_GRID.units,
    offsetX: Math.round(num(g.offsetX, 0)),
    offsetY: Math.round(num(g.offsetY, 0)),
    visible: g.visible !== false
  }
}

export function normalizeTokens(raw: unknown): Token[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: Token[] = []
  raw.forEach((v, i) => {
    const t = obj(v)
    const name = typeof t.name === 'string' ? t.name.trim() : ''
    if (!name) return
    let id = typeof t.id === 'string' && t.id ? t.id : `t${i + 1}`
    while (seen.has(id)) id = `${id}_`
    seen.add(id)
    const hp = obj(t.hp)
    const token: Token = {
      id,
      name,
      x: Math.round(num(t.x, 0)),
      y: Math.round(num(t.y, 0)),
      size: clamp(num(t.size, 1), 0.5, 10),
      disposition: (DISPOSITIONS as readonly string[]).includes(t.disposition as string) ? (t.disposition as Disposition) : 'neutral'
    }
    if (typeof t.actor === 'string' && t.actor.trim()) token.actor = t.actor.trim()
    if (typeof t.img === 'string' && t.img.trim()) token.img = t.img.trim()
    if (t.hidden === true) token.hidden = true
    if (hp.max !== undefined) {
      const max = Math.max(1, Math.round(num(hp.max, 1)))
      token.hp = { value: clamp(Math.round(num(hp.value, max)), 0, max), max }
    }
    if (t.ac !== undefined) token.ac = Math.round(num(t.ac, 10))
    out.push(token)
  })
  return out
}

export function normalizeFog(raw: unknown): Scene['fog'] {
  const f = obj(raw)
  const rects = (Array.isArray(f.rects) ? f.rects : [])
    .map((r) => obj(r))
    .map((r) => ({ x: Math.round(num(r.x, 0)), y: Math.round(num(r.y, 0)), w: Math.round(num(r.w, 0)), h: Math.round(num(r.h, 0)), ...(r.hide === true ? { hide: true } : {}) }))
    .filter((r) => r.w > 0 && r.h > 0)
  return { enabled: f.enabled === true, rects }
}

/** Builds a Scene from a note's frontmatter. */
export function sceneFromFrontmatter(path: VaultPath, name: string, data: Record<string, unknown>, image: string): Scene {
  const width = Math.round(num(data.width, 0))
  const height = Math.round(num(data.height, 0))
  return {
    path,
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : name,
    image,
    width: width > 0 ? width : image ? 0 : BLANK_SIZE.width,
    height: height > 0 ? height : image ? 0 : BLANK_SIZE.height,
    grid: normalizeGrid(data.grid),
    tokens: normalizeTokens(data.tokens),
    fog: normalizeFog(data.fog),
    active: data.active === true
  }
}

/** The frontmatter fields a scene owns. */
export function sceneToFrontmatter(s: Omit<Scene, 'path' | 'image'> & { image?: string }): Record<string, unknown> {
  return {
    width: s.width || undefined,
    height: s.height || undefined,
    grid: s.grid,
    tokens: s.tokens.map((t) => ({ ...t })),
    fog: s.fog.enabled || s.fog.rects.length ? s.fog : undefined,
    active: s.active || undefined
  }
}

export function newTokenId(): string {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

// ─── Grid geometry ───────────────────────────────────────────────────────────

/** The top-left corner of the square a point is in. */
export function cellAt(grid: SceneGrid, x: number, y: number): { col: number; row: number } {
  return { col: Math.floor((x - grid.offsetX) / grid.size), row: Math.floor((y - grid.offsetY) / grid.size) }
}

/**
 * Snaps a token's top-left corner to the grid. A token is dropped where its
 * centre is, so a Large token lands on the 2×2 block around that point.
 */
export function snapToken(grid: SceneGrid, x: number, y: number, size: number): { x: number; y: number } {
  const span = Math.max(1, Math.round(size))
  const cx = x + (size * grid.size) / 2
  const cy = y + (size * grid.size) / 2
  const col = Math.round((cx - grid.offsetX) / grid.size - span / 2)
  const row = Math.round((cy - grid.offsetY) / grid.size - span / 2)
  return { x: grid.offsetX + col * grid.size, y: grid.offsetY + row * grid.size }
}

/** A token's centre, in image pixels. */
export function tokenCenter(grid: SceneGrid, t: Pick<Token, 'x' | 'y' | 'size'>): { x: number; y: number } {
  return { x: t.x + (t.size * grid.size) / 2, y: t.y + (t.size * grid.size) / 2 }
}

export type DiagonalRule = 'equal' | 'alternating'

/**
 * Distance between two points in world units, counted in squares: 5e counts
 * every diagonal as one square ("equal"); 3.5 counts every second diagonal as
 * two ("alternating": 5, 10, 5…).
 */
export function gridDistance(grid: SceneGrid, a: { x: number; y: number }, b: { x: number; y: number }, rule: DiagonalRule = 'equal'): number {
  const dx = Math.abs(Math.round((b.x - a.x) / grid.size))
  const dy = Math.abs(Math.round((b.y - a.y) / grid.size))
  const diag = Math.min(dx, dy)
  const straight = Math.max(dx, dy) - diag
  const squares = rule === 'alternating' ? straight + diag + Math.floor(diag / 2) : straight + diag
  return squares * grid.distance
}

/** Whether a point is revealed: inside a revealed rectangle that no later hidden one covers. */
export function isRevealed(fog: Scene['fog'], x: number, y: number): boolean {
  if (!fog.enabled) return true
  let shown = false
  for (const r of fog.rects) if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) shown = !r.hide
  return shown
}

/** Rectangle from two corners, snapped outward to whole squares. */
export function snapRect(grid: SceneGrid, a: { x: number; y: number }, b: { x: number; y: number }): FogRect {
  const x0 = Math.min(a.x, b.x)
  const y0 = Math.min(a.y, b.y)
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const sx = grid.offsetX + Math.floor((x0 - grid.offsetX) / grid.size) * grid.size
  const sy = grid.offsetY + Math.floor((y0 - grid.offsetY) / grid.size) * grid.size
  const ex = grid.offsetX + Math.ceil((x1 - grid.offsetX) / grid.size) * grid.size
  const ey = grid.offsetY + Math.ceil((y1 - grid.offsetY) / grid.size) * grid.size
  return { x: sx, y: sy, w: Math.max(grid.size, ex - sx), h: Math.max(grid.size, ey - sy) }
}

/** Token size in squares for a 5e creature size name. */
export function sizeSquares(size: string): number {
  const s = size.trim().toLowerCase()
  if (s.startsWith('tiny')) return 0.5
  if (s.startsWith('large')) return 2
  if (s.startsWith('huge')) return 3
  if (s.startsWith('garg')) return 4
  return 1
}

/** The nearest spot to `pos` (searching outward ring by ring) where no token's top-left already sits. */
export function freeSpot(grid: SceneGrid, tokens: Pick<Token, 'x' | 'y'>[], pos: { x: number; y: number }): { x: number; y: number } {
  const taken = new Set(tokens.map((t) => `${t.x},${t.y}`))
  for (let ring = 0; ring < 50; ring++) {
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue
        const p = { x: pos.x + dx * grid.size, y: pos.y + dy * grid.size }
        if (!taken.has(`${p.x},${p.y}`)) return p
      }
    }
  }
  return pos
}
