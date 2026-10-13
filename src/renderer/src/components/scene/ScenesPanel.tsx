import { useEffect, useState } from 'react'
import { Crown, FolderOpen, Grid3x3, Map as MapIcon, Plus, Sparkles } from 'lucide-react'
import { BLANK_SIZE, type SceneGrid } from '@shared/scene'
import { EmptyState } from '@/components/EmptyState'
import { RuneArt } from '@/components/illustrations'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tip } from '@/components/ui/tooltip'
import { invoke, on } from '@/lib/ipc'
import { cn } from '@/lib/utils'
import { useImages } from '@/stores/images'
import { useScene } from '@/stores/scene'
import { toast } from '@/stores/toasts'
import { vaultUrl } from '@/stores/vault'

/** Pick a battlemap (the campaign's images, a file, a new AI one, or a blank grid) and name the scene. */
export function NewSceneDialog({ onClose }: { onClose: () => void }): React.JSX.Element {
  const campaign = useScene((s) => s.campaign)
  const [name, setName] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!campaign) return
    const load = (): void => void invoke('maps:images', campaign).then(setImages).catch(() => {})
    load()
    // A battlemap generated meanwhile shows up in the list.
    return on('images:done', load)
  }, [campaign])

  const importFile = async (): Promise<void> => {
    if (!campaign) return
    const path = await invoke('maps:importImage', campaign).catch((e) => (toast.error(e), null))
    if (!path) return
    setImages((list) => [path, ...list.filter((p) => p !== path)])
    setImage(path)
  }

  const generate = (): void => {
    if (!campaign || !prompt.trim()) return
    void useImages.getState().generate({ campaignPath: campaign, kind: 'battlemap', prompt: prompt.trim() })
    toast.info('Painting a battlemap…', 'It appears in the list when it’s ready.')
    if (!name.trim()) setName(prompt.trim().replace(/^./, (c) => c.toUpperCase()).slice(0, 60))
  }

  const create = async (): Promise<void> => {
    setBusy(true)
    const blank = image === ''
    const fallback = image ? (image.split('/').pop() ?? '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') : 'Blank grid'
    const scene = await useScene.getState().create({ name: name.trim() || fallback, image: image ?? '', ...(blank ? BLANK_SIZE : {}) })
    setBusy(false)
    if (scene) onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[min(720px,calc(100vw-48px))]">
        <DialogHeader>
          <DialogTitle>New scene</DialogTitle>
          <DialogDescription>Choose a battlemap. Scenes are saved as notes in the campaign’s Scenes folder.</DialogDescription>
        </DialogHeader>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Scene name, e.g. The Sunken Chapel" aria-label="Scene name" />
        <div className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => setImage('')}
            aria-pressed={image === ''}
            className={cn('flex aspect-square flex-col items-center justify-center gap-1 rounded-md border bg-[#2a2722] text-xs text-muted-foreground', image === '' && 'ring-2 ring-gold')}
          >
            <Grid3x3 className="size-5" /> Blank grid
          </button>
          {images.map((p) => (
            <button key={p} type="button" onClick={() => setImage(p)} aria-pressed={image === p} title={p.split('/').pop()} className={cn('overflow-hidden rounded-md border', image === p && 'ring-2 ring-gold')}>
              <img src={vaultUrl(p)} alt={p.split('/').pop()} className="aspect-square w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void importFile()}>
            <FolderOpen /> Import an image…
          </Button>
          <form
            className="flex min-w-60 flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              generate()
            }}
          >
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Or describe one to generate: a flooded crypt" aria-label="Battlemap description" className="h-8" />
            <Button type="submit" size="sm" variant="outline" disabled={!prompt.trim()}>
              <Sparkles /> Generate
            </Button>
          </form>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void create()} disabled={image === null || busy}>
            Create scene
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GridSettings(): React.JSX.Element | null {
  const scene = useScene((s) => s.scene)
  if (!scene) return null
  const g = scene.grid
  const set = (patch: Partial<SceneGrid>): void => useScene.getState().update((s) => ({ grid: { ...s.grid, ...patch } }))
  const field = (label: string, value: number | string, onCommit: (v: string) => void, opts: { width?: string; title?: string } = {}): React.JSX.Element => (
    <label className="flex items-center gap-1.5 text-xs" title={opts.title}>
      <span className="text-muted-foreground">{label}</span>
      <Input key={`${scene.path}-${label}-${value}`} defaultValue={value} onBlur={(e) => e.target.value !== String(value) && onCommit(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} className={cn('h-7 text-center', opts.width ?? 'w-14')} />
    </label>
  )
  return (
    <section className="space-y-2 border-t px-3 py-3">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        <Grid3x3 className="size-3.5 text-gold" /> Grid · {scene.name}
      </h3>
      <div className="flex flex-wrap gap-x-3 gap-y-2">
        {field('Square', g.size, (v) => Number(v) >= 10 && set({ size: Math.round(Number(v)) }), { title: 'Pixels per square on the image' })}
        {field('=', g.distance, (v) => Number(v) > 0 && set({ distance: Number(v) }), { width: 'w-12' })}
        {field('', g.units, (v) => v.trim() && set({ units: v.trim().slice(0, 12) }), { width: 'w-12' })}
        {field('Offset x', g.offsetX, (v) => Number.isFinite(Number(v)) && set({ offsetX: Math.round(Number(v)) }))}
        {field('y', g.offsetY, (v) => Number.isFinite(Number(v)) && set({ offsetY: Math.round(Number(v)) }))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {scene.width && scene.height ? `${scene.width} × ${scene.height} px, ${Math.floor(scene.width / g.size)} × ${Math.floor(scene.height / g.size)} squares.` : ''} Match “Square” to the map’s own grid so tokens line up.
      </p>
    </section>
  )
}

export function ScenesPanel(): React.JSX.Element {
  const campaign = useScene((s) => s.campaign)
  const scenes = useScene((s) => s.scenes)
  const current = useScene((s) => s.scene?.path)
  const [creating, setCreating] = useState(false)

  if (!campaign) return <EmptyState illustration={<RuneArt />} title="No campaign" description="Pick or create a campaign to add scenes." className="pt-16" />

  return (
    <div className="pb-4 text-sm">
      <div className="flex items-center justify-between px-3 py-3">
        <h2 className="font-display text-base font-semibold tracking-wide">Scenes</h2>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus /> New scene
        </Button>
      </div>
      {scenes.length === 0 ? (
        <p className="px-3 text-xs text-muted-foreground">No scenes yet. Make one from a battlemap: an image in the campaign, a file, or a new AI-painted one.</p>
      ) : (
        <ul className="space-y-1 px-2">
          {scenes.map((s) => (
            <li key={s.path}>
              <div className={cn('group flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-accent/60', current === s.path && 'bg-accent')}>
                <button type="button" onClick={() => void useScene.getState().view(s.path)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  {s.image ? <img src={vaultUrl(s.image)} alt="" className="size-10 shrink-0 rounded object-cover" loading="lazy" /> : <div className="flex size-10 shrink-0 items-center justify-center rounded bg-[#2a2722]"><MapIcon className="size-4 text-muted-foreground" /></div>}
                  <span className="truncate">{s.name}</span>
                </button>
                <Tip label={s.active ? 'Players see this scene' : 'Show this scene to the players'}>
                  <button type="button" aria-label={s.active ? `${s.name} is the active scene` : `Activate ${s.name}`} aria-pressed={s.active} onClick={() => !s.active && void useScene.getState().activate(s.path)} className={cn('rounded p-1', s.active ? 'text-gold' : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground')}>
                    <Crown className="size-4" />
                  </button>
                </Tip>
              </div>
            </li>
          ))}
        </ul>
      )}
      <GridSettings />
      {creating && <NewSceneDialog onClose={() => setCreating(false)} />}
    </div>
  )
}
