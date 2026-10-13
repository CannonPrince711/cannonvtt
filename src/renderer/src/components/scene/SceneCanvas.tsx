import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { DISPOSITION_INFO, gridDistance, snapRect, snapToken, tokenCenter, type FogRect, type Scene, type Token } from '@shared/scene'
import { hpColor } from '@/components/CharacterAvatar'
import { cn } from '@/lib/utils'
import { ACTOR_DRAG, actorOf, placeToken, type ActorDrag } from '@/lib/scene-actions'
import { useChat } from '@/stores/chat'
import { useScene } from '@/stores/scene'
import { useVault, vaultUrl } from '@/stores/vault'
import { openActorWindow } from '@/stores/windows'
import { TokenHud } from './TokenHud'

interface View {
  scale: number
  tx: number
  ty: number
}

type Drag =
  | { kind: 'pan'; sx: number; sy: number; tx: number; ty: number }
  | { kind: 'tokens'; start: { x: number; y: number }; to: { x: number; y: number }; ids: string[]; moved: boolean }
  | { kind: 'measure'; from: { x: number; y: number }; to: { x: number; y: number } }
  | { kind: 'fog'; from: { x: number; y: number }; to: { x: number; y: number }; hide: boolean }

/** Fits the whole scene in the viewport with a small margin. */
function fitView(scene: Pick<Scene, 'width' | 'height'>, box: { width: number; height: number }): View {
  if (!scene.width || !scene.height || !box.width || !box.height) return { scale: 1, tx: 0, ty: 0 }
  const scale = Math.min(box.width / scene.width, box.height / scene.height) * 0.95
  return { scale, tx: (box.width - scene.width * scale) / 2, ty: (box.height - scene.height * scale) / 2 }
}

function GridLines({ scene }: { scene: Scene }): React.JSX.Element | null {
  const g = scene.grid
  if (!g.visible) return null
  const id = `grid-${g.size}-${g.offsetX}-${g.offsetY}`
  return (
    <svg className="pointer-events-none absolute inset-0" width={scene.width} height={scene.height} aria-hidden>
      <defs>
        <pattern id={id} width={g.size} height={g.size} patternUnits="userSpaceOnUse" x={g.offsetX} y={g.offsetY}>
          <path d={`M ${g.size} 0 L 0 0 0 ${g.size}`} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** Fog of war: the DM sees hidden areas dimmed, not black. */
function Fog({ scene, preview }: { scene: Scene; preview: FogRect | null }): React.JSX.Element | null {
  if (!scene.fog.enabled && !preview) return null
  const rects = preview ? [...scene.fog.rects, preview] : scene.fog.rects
  return (
    <svg className="pointer-events-none absolute inset-0" width={scene.width} height={scene.height} aria-hidden>
      <defs>
        <mask id="fog-mask">
          <rect width="100%" height="100%" fill="white" />
          {rects.map((r, i) => (
            <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.hide ? 'white' : 'black'} />
          ))}
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgb(8,8,12)" opacity={0.6} mask="url(#fog-mask)" />
      {preview && <rect x={preview.x} y={preview.y} width={preview.w} height={preview.h} fill="none" stroke={preview.hide ? '#e5484d' : '#d4a843'} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />}
    </svg>
  )
}

function TokenView({ token, scene, selected, turn, offset }: { token: Token; scene: Scene; selected: boolean; turn: boolean; offset: { x: number; y: number } | null }): React.JSX.Element {
  const actor = actorOf(token)
  const px = token.size * scene.grid.size
  const img = token.img ? vaultUrl(token.img) : actor?.avatar ? vaultUrl(actor.avatar, actor.mtimeMs) : null
  const hp = actor && actor.max_hp ? { value: actor.hp ?? actor.max_hp, max: actor.max_hp } : token.hp
  const color = DISPOSITION_INFO[token.disposition].color
  const initials = token.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div
      data-token={token.id}
      className={cn('group absolute select-none', token.hidden && 'opacity-50')}
      style={{ left: token.x + (offset?.x ?? 0), top: token.y + (offset?.y ?? 0), width: px, height: px, zIndex: selected ? 3 : 2 }}
    >
      <div
        className={cn('size-full overflow-hidden rounded-full border-[3px] bg-card shadow-[0_2px_8px_rgba(0,0,0,0.6)]', token.hidden && 'border-dashed', turn && 'ring-4 ring-gold/80')}
        style={{ borderColor: color, outline: selected ? '3px solid #f5d27a' : undefined, outlineOffset: 2 }}
      >
        {img ? (
          <img src={img} alt="" draggable={false} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center font-display font-semibold text-foreground" style={{ fontSize: px * 0.36, background: `${color}33` }}>
            {initials}
          </div>
        )}
      </div>
      {hp && (
        <div className="absolute inset-x-[10%] -bottom-[6%] h-[9%] min-h-1 overflow-hidden rounded-full bg-black/70">
          <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, (hp.value / hp.max) * 100))}%`, background: hpColor(hp.value / hp.max) }} />
        </div>
      )}
      <div
        className={cn(
          'pointer-events-none absolute top-full left-1/2 mt-[10%] -translate-x-1/2 rounded bg-black/75 px-1.5 py-0.5 whitespace-nowrap text-white',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
        style={{ fontSize: Math.max(11, scene.grid.size * 0.2) }}
      >
        {token.name}
      </div>
    </div>
  )
}

export function SceneCanvas(): React.JSX.Element | null {
  const scene = useScene((s) => s.scene)
  const tool = useScene((s) => s.tool)
  const selected = useScene((s) => s.selected)
  const index = useVault((s) => s.index)
  const combat = useChat((s) => s.session?.frontmatter.combat)
  const ref = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>({ scale: 1, tx: 0, ty: 0 })
  const [drag, setDrag] = useState<Drag | null>(null)
  const [hud, setHud] = useState<{ id: string; x: number; y: number } | null>(null)
  const [space, setSpace] = useState(false)
  const fittedFor = useRef<string | null>(null)

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const r = ref.current!.getBoundingClientRect()
      return { x: (clientX - r.left - view.tx) / view.scale, y: (clientY - r.top - view.ty) / view.scale }
    },
    [view]
  )

  // Fit the scene when a different one opens (once its size is known).
  useLayoutEffect(() => {
    if (!scene || !ref.current || !scene.width) return
    if (fittedFor.current === scene.path) return
    fittedFor.current = scene.path
    setView(fitView(scene, ref.current.getBoundingClientRect()))
    setHud(null)
  }, [scene])

  const fitNonce = useScene((s) => s.fitNonce)
  useEffect(() => {
    const s = useScene.getState().scene
    if (fitNonce && s && ref.current) setView(fitView(s, ref.current.getBoundingClientRect()))
  }, [fitNonce])

  // Zoom with the wheel around the cursor (non-passive so the page doesn't scroll).
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const mx = e.clientX - r.left
      const my = e.clientY - r.top
      setView((v) => {
        const scale = Math.max(0.1, Math.min(6, v.scale * Math.exp(-e.deltaY * 0.0015)))
        return { scale, tx: mx - ((mx - v.tx) * scale) / v.scale, ty: my - ((my - v.ty) * scale) / v.scale }
      })
      setHud(null)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [scene?.path])

  // Keyboard: Delete removes selected tokens, arrows nudge them, space pans, Escape clears.
  useEffect(() => {
    const typing = (t: EventTarget | null): boolean => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
    const down = (e: KeyboardEvent): void => {
      if (typing(e.target)) return
      const { scene: s, selected: sel, update, select } = useScene.getState()
      if (e.key === ' ') setSpace(true)
      if (!s || !sel.length) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        update({ tokens: s.tokens.filter((t) => !sel.includes(t.id)) })
        select([])
        setHud(null)
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault()
        const d = s.grid.size
        const [dx, dy] = e.key === 'ArrowLeft' ? [-d, 0] : e.key === 'ArrowRight' ? [d, 0] : e.key === 'ArrowUp' ? [0, -d] : [0, d]
        update({ tokens: s.tokens.map((t) => (sel.includes(t.id) ? { ...t, x: t.x + dx, y: t.y + dy } : t)) })
      } else if (e.key === 'Escape') {
        select([])
        setHud(null)
      }
    }
    const up = (e: KeyboardEvent): void => {
      if (e.key === ' ') setSpace(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const currentTurn = useMemo(() => {
    if (!combat?.active) return null
    return combat.combatants[combat.turn] ?? null
  }, [combat])

  const rule = index?.campaigns.find((c) => scene?.path.startsWith(`${c.path}/`))?.edition === '3.5e' ? 'alternating' : 'equal'

  if (!scene) return null

  /** The topmost token under a screen point (by position: pointer capture retargets events to the canvas). */
  const tokenAt = (clientX: number, clientY: number): Token | undefined => {
    const p = toWorld(clientX, clientY)
    const size = scene.grid.size
    return [...scene.tokens].reverse().find((t) => p.x >= t.x && p.x < t.x + t.size * size && p.y >= t.y && p.y < t.y + t.size * size)
  }

  const onPointerDown = (e: React.PointerEvent): void => {
    if (e.button === 2) return
    ref.current?.setPointerCapture(e.pointerId)
    setHud(null)
    const p = toWorld(e.clientX, e.clientY)
    if (e.button === 1 || space) return setDrag({ kind: 'pan', sx: e.clientX, sy: e.clientY, tx: view.tx, ty: view.ty })
    if (tool === 'measure') return setDrag({ kind: 'measure', from: p, to: p })
    if (tool === 'reveal' || tool === 'hide') return setDrag({ kind: 'fog', from: p, to: p, hide: tool === 'hide' })
    const t = tokenAt(e.clientX, e.clientY)
    if (!t) {
      useScene.getState().select([])
      return setDrag({ kind: 'pan', sx: e.clientX, sy: e.clientY, tx: view.tx, ty: view.ty })
    }
    const ids = e.shiftKey ? [...new Set([...selected, t.id])] : selected.includes(t.id) ? selected : [t.id]
    useScene.getState().select(ids)
    setDrag({ kind: 'tokens', start: p, to: p, ids, moved: false })
  }

  const onPointerMove = (e: React.PointerEvent): void => {
    if (!drag) return
    if (drag.kind === 'pan') return setView((v) => ({ ...v, tx: drag.tx + e.clientX - drag.sx, ty: drag.ty + e.clientY - drag.sy }))
    const p = toWorld(e.clientX, e.clientY)
    if (drag.kind === 'tokens') {
      if (!drag.moved && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) * view.scale < 4) return
      return setDrag({ ...drag, moved: true, to: p })
    }
    setDrag({ ...drag, to: p })
  }

  const tokenOffset = drag?.kind === 'tokens' && drag.moved ? { x: drag.to.x - drag.start.x, y: drag.to.y - drag.start.y } : null

  const onPointerUp = (e: React.PointerEvent): void => {
    ref.current?.releasePointerCapture(e.pointerId)
    const d = drag
    setDrag(null)
    if (!d) return
    if (d.kind === 'tokens' && d.moved && tokenOffset) {
      useScene.getState().update((s) => ({
        tokens: s.tokens.map((t) => (d.ids.includes(t.id) ? { ...t, ...snapToken(s.grid, t.x + tokenOffset.x, t.y + tokenOffset.y, t.size) } : t))
      }))
    }
    // A click reveals (or hides) one square; a drag, the squares it covers.
    if (d.kind === 'fog') {
      const rect = { ...snapRect(scene.grid, d.from, d.to), ...(d.hide ? { hide: true } : {}) }
      useScene.getState().update((s) => ({ fog: { enabled: true, rects: [...s.fog.rects, rect] } }))
    }
  }

  const onDoubleClick = (e: React.MouseEvent): void => {
    const t = tokenAt(e.clientX, e.clientY)
    if (t?.actor) openActorWindow(t.actor)
    else if (t) setHud({ id: t.id, x: e.clientX, y: e.clientY })
  }

  const onContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault()
    const t = tokenAt(e.clientX, e.clientY)
    if (!t) return setHud(null)
    if (!selected.includes(t.id)) useScene.getState().select([t.id])
    setHud({ id: t.id, x: e.clientX, y: e.clientY })
  }

  const onDrop = (e: React.DragEvent): void => {
    const raw = e.dataTransfer.getData(ACTOR_DRAG)
    if (!raw) return
    e.preventDefault()
    const a = JSON.parse(raw) as ActorDrag
    placeToken(toWorld(e.clientX, e.clientY), { name: a.name, actor: a.path, disposition: a.kind === 'character' ? 'friendly' : 'neutral' })
  }

  const measure = drag?.kind === 'measure' ? drag : null
  const fogPreview = drag?.kind === 'fog' ? { ...snapRect(scene.grid, drag.from, drag.to), ...(drag.hide ? { hide: true } : {}) } : null
  const hudToken = hud ? scene.tokens.find((t) => t.id === hud.id) : undefined
  const cursor = drag?.kind === 'pan' || space ? 'grabbing' : tool === 'select' ? 'default' : 'crosshair'

  return (
    <div
      ref={ref}
      className="relative size-full touch-none overflow-hidden bg-[#121214]"
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onDragOver={(e) => e.dataTransfer.types.includes(ACTOR_DRAG) && e.preventDefault()}
      onDrop={onDrop}
      role="application"
      aria-label={`Scene: ${scene.name}`}
    >
      <div className="absolute top-0 left-0 origin-top-left" style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`, width: scene.width || undefined, height: scene.height || undefined }}>
        {scene.image ? (
          <img
            src={vaultUrl(scene.image)}
            alt=""
            draggable={false}
            className="block max-w-none select-none"
            onLoad={(e) => {
              const img = e.currentTarget
              if (img.naturalWidth && (img.naturalWidth !== scene.width || img.naturalHeight !== scene.height)) {
                useScene.getState().update({ width: img.naturalWidth, height: img.naturalHeight })
              }
            }}
          />
        ) : (
          <div className="size-full bg-[#2a2722]" />
        )}
        {scene.width > 0 && (
          <>
            <GridLines scene={scene} />
            {scene.tokens.map((t) => (
              <TokenView
                key={t.id}
                token={t}
                scene={scene}
                selected={selected.includes(t.id)}
                turn={!!currentTurn && (currentTurn.character ? currentTurn.character === t.actor : currentTurn.name === t.name)}
                offset={tokenOffset && selected.includes(t.id) ? tokenOffset : null}
              />
            ))}
            <Fog scene={scene} preview={fogPreview} />
            {measure && (
              <svg className="pointer-events-none absolute inset-0 overflow-visible" width={scene.width} height={scene.height} aria-hidden>
                {(() => {
                  const from = tokenCenter(scene.grid, { ...snapToken(scene.grid, measure.from.x - scene.grid.size / 2, measure.from.y - scene.grid.size / 2, 1), size: 1 })
                  const to = tokenCenter(scene.grid, { ...snapToken(scene.grid, measure.to.x - scene.grid.size / 2, measure.to.y - scene.grid.size / 2, 1), size: 1 })
                  const dist = gridDistance(scene.grid, from, to, rule)
                  return (
                    <>
                      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#f5d27a" strokeWidth={4} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                      <circle cx={from.x} cy={from.y} r={6 / view.scale} fill="#f5d27a" />
                      <g transform={`translate(${to.x} ${to.y}) scale(${1 / view.scale})`}>
                        <rect x={10} y={-26} width={86} height={24} rx={5} fill="rgba(0,0,0,0.8)" />
                        <text x={53} y={-9} textAnchor="middle" fill="#f5d27a" fontSize={14} fontWeight={600}>
                          {dist} {scene.grid.units}
                        </text>
                      </g>
                    </>
                  )
                })()}
              </svg>
            )}
          </>
        )}
      </div>
      {hud && hudToken && <TokenHud token={hudToken} x={hud.x} y={hud.y} onClose={() => setHud(null)} />}
    </div>
  )
}
