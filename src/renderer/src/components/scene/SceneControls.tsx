import { Cloud, CloudOff, Eraser, Grid3x3, Maximize, MousePointer2, Ruler, SquareDashed, SquareDashedMousePointer } from 'lucide-react'
import { Tip } from '@/components/ui/tooltip'
import { askConfirm } from '@/components/AskDialog'
import { cn } from '@/lib/utils'
import { useScene, type SceneTool } from '@/stores/scene'

const TOOLS: { id: SceneTool; label: string; icon: React.ElementType }[] = [
  { id: 'select', label: 'Select and move tokens (drag empty space to pan)', icon: MousePointer2 },
  { id: 'measure', label: 'Measure distance', icon: Ruler },
  { id: 'reveal', label: 'Reveal fog (drag a rectangle)', icon: SquareDashedMousePointer },
  { id: 'hide', label: 'Hide again under fog', icon: SquareDashed }
]

function ToolButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }): React.JSX.Element {
  return (
    <Tip label={label} side="right">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={cn('flex size-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:text-foreground', active ? 'border-gold/70 bg-gold/15 text-gold' : 'border-transparent bg-black/40 hover:bg-black/60')}
      >
        {children}
      </button>
    </Tip>
  )
}

/** Foundry-style tool column on the left edge of the canvas. */
export function SceneControls(): React.JSX.Element | null {
  const scene = useScene((s) => s.scene)
  const tool = useScene((s) => s.tool)
  if (!scene) return null
  const update = useScene.getState().update
  return (
    <div className="absolute top-14 left-3 z-10 flex flex-col gap-1.5 rounded-lg border bg-black/50 p-1.5 backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
      {TOOLS.map(({ id, label, icon: Icon }) => (
        <ToolButton key={id} label={label} active={tool === id} onClick={() => useScene.getState().setTool(id)}>
          <Icon className="size-4.5" />
        </ToolButton>
      ))}
      <div className="my-0.5 h-px bg-border" />
      <ToolButton label={scene.fog.enabled ? 'Fog of war on (click to turn off)' : 'Fog of war off (click to turn on)'} active={scene.fog.enabled} onClick={() => update((s) => ({ fog: { ...s.fog, enabled: !s.fog.enabled } }))}>
        {scene.fog.enabled ? <Cloud className="size-4.5" /> : <CloudOff className="size-4.5" />}
      </ToolButton>
      <ToolButton
        label="Cover the whole map in fog again"
        onClick={async () => {
          if (!(await askConfirm({ title: 'Reset the fog?', description: 'Everything revealed is covered again.', confirmLabel: 'Reset fog' }))) return
          update({ fog: { enabled: true, rects: [] } })
        }}
      >
        <Eraser className="size-4.5" />
      </ToolButton>
      <ToolButton label={scene.grid.visible ? 'Hide grid lines' : 'Show grid lines'} active={scene.grid.visible} onClick={() => update((s) => ({ grid: { ...s.grid, visible: !s.grid.visible } }))}>
        <Grid3x3 className="size-4.5" />
      </ToolButton>
      <ToolButton label="Fit the scene to the window" onClick={() => useScene.getState().requestFit()}>
        <Maximize className="size-4.5" />
      </ToolButton>
    </div>
  )
}
