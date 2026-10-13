import { useState } from 'react'
import { ChevronDown, ChevronUp, Crown } from 'lucide-react'
import { useTable } from '@/components/table/TablePanel'
import { cn } from '@/lib/utils'
import { useApp } from '@/stores/app'
import { useLayout } from '@/stores/layout'
import { useVault } from '@/stores/vault'

/** Who is at the table, bottom-left like Foundry's player list. */
export function PlayersList(): React.JSX.Element {
  const status = useTable((s) => s.status)
  const you = useApp((s) => s.settings?.general.playerName) || 'You'
  const index = useVault((s) => s.index)
  const [open, setOpen] = useState(true)
  const players = status?.hosting ? status.players : []
  const characterName = (path?: string): string | undefined => (path ? index?.characters.concat(index.npcs).find((c) => c.path === path)?.displayName : undefined)

  return (
    <section aria-label="Players" className="w-52 rounded-lg border bg-black/60 text-xs backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        Players
        {open ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
      </button>
      {open && (
        <ul className="space-y-1 px-2.5 pb-2">
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald" aria-label="Online" />
            <span className="truncate font-medium">{you}</span>
            <Crown className="ml-auto size-3 text-gold" aria-label="Game master" />
          </li>
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', p.connected ? 'bg-emerald' : 'bg-muted-foreground/50')} aria-label={p.connected ? 'Online' : 'Offline'} />
              <span className="truncate">{p.name}</span>
              {characterName(p.characterPath) && <span className="ml-auto truncate text-muted-foreground">{characterName(p.characterPath)}</span>}
            </li>
          ))}
          {!status?.hosting && (
            <li>
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => useLayout.getState().openTab('table')}>
                Invite players…
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}
