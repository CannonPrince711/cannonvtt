import { describe, expect, it } from 'vitest'
import { BLANK_SIZE, DEFAULT_GRID, gridDistance, isRevealed, normalizeFog, normalizeTokens, sceneFromFrontmatter, sizeSquares, snapRect, snapToken, tokenCenter } from '@shared/scene'

const grid = { ...DEFAULT_GRID, size: 50 }

describe('scene notes', () => {
  it('reads frontmatter with defaults', () => {
    const s = sceneFromFrontmatter('C/Scenes/Crypt.md', 'Crypt', { grid: { size: '100', units: 'm' }, active: true }, 'C/Images/crypt.png')
    expect(s).toMatchObject({ name: 'Crypt', width: 0, height: 0, active: true, tokens: [], fog: { enabled: false, rects: [] } })
    expect(s.grid).toEqual({ ...DEFAULT_GRID, size: 100, units: 'm' })
    expect(sceneFromFrontmatter('C/Scenes/B.md', 'B', {}, '')).toMatchObject(BLANK_SIZE)
  })

  it('cleans up hand-edited tokens', () => {
    const tokens = normalizeTokens([
      { id: 'a', name: 'Goblin', x: '100', y: 50.4, disposition: 'hostile', hp: { value: 99, max: 7 } },
      { id: 'a', name: 'Goblin 2', size: 50, disposition: 'evil', hidden: 'yes' },
      { name: '' },
      'junk'
    ])
    expect(tokens).toEqual([
      { id: 'a', name: 'Goblin', x: 100, y: 50, size: 1, disposition: 'hostile', hp: { value: 7, max: 7 } },
      { id: 'a_', name: 'Goblin 2', x: 0, y: 0, size: 10, disposition: 'neutral' }
    ])
  })

  it('drops empty fog rectangles', () => {
    expect(normalizeFog({ enabled: true, rects: [{ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 0, h: 3 }, { x: 1, y: 1, w: 2, h: 2, hide: true }] })).toEqual({
      enabled: true,
      rects: [{ x: 0, y: 0, w: 10, h: 10 }, { x: 1, y: 1, w: 2, h: 2, hide: true }]
    })
  })
})

describe('grid geometry', () => {
  it('snaps tokens to squares by their centre', () => {
    expect(snapToken(grid, 70, 30, 1)).toEqual({ x: 50, y: 50 })
    expect(snapToken(grid, 74, 24, 1)).toEqual({ x: 50, y: 0 })
    // A Large token covers a 2×2 block.
    expect(snapToken(grid, 60, 60, 2)).toEqual({ x: 50, y: 50 })
    expect(snapToken({ ...grid, offsetX: 10 }, 70, 0, 1)).toEqual({ x: 60, y: 0 })
    expect(tokenCenter(grid, { x: 50, y: 50, size: 2 })).toEqual({ x: 100, y: 100 })
  })

  it('measures 5e and 3.5 diagonals', () => {
    const a = { x: 25, y: 25 }
    const b = { x: 25 + 4 * 50, y: 25 + 3 * 50 }
    expect(gridDistance(grid, a, b)).toBe(20)
    expect(gridDistance(grid, a, b, 'alternating')).toBe(25)
    expect(gridDistance(grid, a, { x: 25, y: 25 + 6 * 50 })).toBe(30)
  })

  it('snaps fog rectangles outward and tracks reveals in order', () => {
    expect(snapRect(grid, { x: 60, y: 60 }, { x: 10, y: 140 })).toEqual({ x: 0, y: 50, w: 100, h: 100 })
    expect(snapRect(grid, { x: 60, y: 60 }, { x: 60, y: 60 })).toEqual({ x: 50, y: 50, w: 50, h: 50 })
    const fog = { enabled: true, rects: [{ x: 0, y: 0, w: 100, h: 100 }, { x: 50, y: 50, w: 50, h: 50, hide: true }] }
    expect(isRevealed(fog, 10, 10)).toBe(true)
    expect(isRevealed(fog, 60, 60)).toBe(false)
    expect(isRevealed(fog, 200, 10)).toBe(false)
    expect(isRevealed({ enabled: false, rects: [] }, 200, 10)).toBe(true)
  })

  it('maps creature sizes to squares', () => {
    expect(['Tiny', 'Medium', 'Large', 'Huge', 'Gargantuan'].map(sizeSquares)).toEqual([0.5, 1, 2, 3, 4])
  })
})

describe('placing tokens', () => {
  it('finds the nearest free square', async () => {
    const { freeSpot } = await import('@shared/scene')
    expect(freeSpot(grid, [], { x: 100, y: 100 })).toEqual({ x: 100, y: 100 })
    expect(freeSpot(grid, [{ x: 100, y: 100 }], { x: 100, y: 100 })).toEqual({ x: 50, y: 50 })
  })
})
