import { useState } from 'react'
import { Crown, Map as MapIcon, Plus } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { LanternArt } from '@/components/illustrations'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useApp } from '@/stores/app'
import { useLayout } from '@/stores/layout'
import { useScene } from '@/stores/scene'
import { useVault } from '@/stores/vault'
import { SceneCanvas } from './SceneCanvas'
import { SceneControls } from './SceneControls'
import { NewSceneDialog } from './ScenesPanel'

/** Scene tabs along the top of the canvas, like Foundry's scene navigation. */
function SceneNav({ onNew }: { onNew: () => void }): React.JSX.Element {
  const scenes = useScene((s) => s.scenes)
  const current = useScene((s) => s.scene?.path)
  return (
    <nav aria-label="Scenes" className="absolute top-3 left-3 z-10 flex max-w-[calc(100%-24px)] items-center gap-1 overflow-x-auto rounded-lg border bg-black/50 p-1 backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
      {scenes.map((s) => (
        <button
          key={s.path}
          type="button"
          onClick={() => void useScene.getState().view(s.path)}
          aria-current={current === s.path}
          className={cn('flex shrink-0 items-center gap-1 rounded px-2.5 py-1 text-xs whitespace-nowrap', current === s.path ? 'bg-gold/20 text-gold' : 'text-muted-foreground hover:bg-white/10 hover:text-foreground')}
        >
          {s.active && <Crown className="size-3" aria-label="Active" />}
          {s.name}
        </button>
      ))}
      <button type="button" aria-label="New scene" onClick={onNew} className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground">
        <Plus className="size-3.5" />
      </button>
    </nav>
  )
}

/** The middle of the window: the scene canvas with its controls, or a way to make the first scene. */
export function SceneStage(): React.JSX.Element {
  const scene = useScene((s) => s.scene)
  const campaign = useScene((s) => s.campaign)
  const index = useVault((s) => s.index)
  const settings = useApp((s) => s.settings)
  const [creating, setCreating] = useState(false)

  let empty: React.ReactNode = null
  if (!index) {
    empty = <EmptyState size="lg" illustration={<LanternArt />} title="No vault open" description={settings?.vault.path ? `The vault at ${settings.vault.path} could not be opened.` : 'Choose a vault in Settings to begin.'} />
  } else if (!campaign) {
    empty = <EmptyState size="lg" illustration={<LanternArt />} title="No campaign" description="Pick or create a campaign in the left sidebar, then add a scene." />
  } else if (!scene) {
    empty = (
      <EmptyState
        size="lg"
        illustration={<LanternArt />}
        title="An empty table"
        description="Lay out a scene: a battlemap with a grid, tokens and fog of war."
        action={
          <div className="flex gap-2">
            <Button onClick={() => setCreating(true)}>
              <MapIcon /> New scene
            </Button>
            <Button variant="outline" onClick={() => useLayout.getState().setRightTab('chat')}>
              Open chat
            </Button>
          </div>
        }
      />
    )
  }

  return (
    <div className="relative size-full overflow-hidden">
      {empty ? (
        <div className="flex size-full items-center justify-center">{empty}</div>
      ) : (
        <>
          <SceneCanvas />
          <SceneNav onNew={() => setCreating(true)} />
          <SceneControls />
        </>
      )}
      {creating && <NewSceneDialog onClose={() => setCreating(false)} />}
    </div>
  )
}
