import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import type { CharacterSummary } from '@shared/types'
import { CharacterAvatar } from '@/components/CharacterAvatar'
import { Input } from '@/components/ui/input'
import { Tip } from '@/components/ui/tooltip'
import { ACTOR_DRAG, placeToken, type ActorDrag } from '@/lib/scene-actions'
import { useScene } from '@/stores/scene'
import { useVault } from '@/stores/vault'
import { openActorWindow } from '@/stores/windows'

function ActorRow({ actor, kind }: { actor: CharacterSummary; kind: ActorDrag['kind'] }): React.JSX.Element {
  const hasScene = useScene((s) => !!s.scene)
  const drag: ActorDrag = { path: actor.path, name: actor.displayName, kind }
  const sub = [actor.race, actor.class, actor.level ? `Lv ${actor.level}` : ''].filter(Boolean).join(' · ')
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(ACTOR_DRAG, JSON.stringify(drag))
        e.dataTransfer.effectAllowed = 'copy'
      }}
      className="group flex cursor-grab items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent/60 active:cursor-grabbing"
    >
      <button type="button" onClick={() => openActorWindow(actor.path)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-label={`Open ${actor.displayName}’s sheet`}>
        <CharacterAvatar name={actor.displayName} avatar={actor.avatar} version={actor.mtimeMs} hp={actor.hp} maxHp={actor.max_hp} size={32} />
        <span className="min-w-0">
          <span className="block truncate text-sm">{actor.displayName}</span>
          {sub && <span className="block truncate text-[11px] text-muted-foreground">{sub}</span>}
        </span>
      </button>
      {hasScene && (
        <Tip label="Place a token in the middle of the scene (or drag onto the map)">
          <button
            type="button"
            aria-label={`Place ${actor.displayName} on the scene`}
            onClick={() => {
              const s = useScene.getState().scene
              if (s) placeToken({ x: s.width / 2, y: s.height / 2 }, { name: actor.displayName, actor: actor.path, disposition: kind === 'character' ? 'friendly' : 'neutral' })
            }}
            className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
          >
            <Plus className="size-4" />
          </button>
        </Tip>
      )}
    </li>
  )
}

/** Characters and NPCs, like Foundry's Actors directory: open a sheet, or drag onto the map. */
export function ActorsPanel(): React.JSX.Element {
  const index = useVault((s) => s.index)
  const campaign = useVault((s) => s.activeCampaign)
  const [query, setQuery] = useState('')
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const inCampaign = (c: CharacterSummary): boolean => !campaign || !c.campaigns?.length || c.campaigns.includes(campaign)
    const match = (c: CharacterSummary): boolean => inCampaign(c) && (!q || c.displayName.toLowerCase().includes(q) || (c.class ?? '').toLowerCase().includes(q))
    return [
      { title: 'Player characters', kind: 'character' as const, list: (index?.characters ?? []).filter(match) },
      { title: 'NPCs', kind: 'npc' as const, list: (index?.npcs ?? []).filter(match) }
    ]
  }, [index, campaign, query])

  return (
    <div className="pb-4 text-sm">
      <div className="flex items-center justify-between px-3 py-3">
        <h2 className="font-display text-base font-semibold tracking-wide">Actors</h2>
        <span className="text-[11px] text-muted-foreground">Drag onto the map</span>
      </div>
      <div className="relative px-3 pb-2">
        <Search className="pointer-events-none absolute top-2 left-5 size-3.5 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search actors" aria-label="Search actors" className="h-8 pl-7" />
      </div>
      {groups.map((g) => (
        <section key={g.kind} className="px-2 pt-2">
          <h3 className="px-1.5 pb-1 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {g.title} <span className="font-normal">{g.list.length}</span>
          </h3>
          {g.list.length === 0 ? (
            <p className="px-1.5 text-xs text-muted-foreground">None{query ? ' match' : ' yet'}.</p>
          ) : (
            <ul className="space-y-0.5">
              {g.list.map((a) => (
                <ActorRow key={a.path} actor={a} kind={g.kind} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
