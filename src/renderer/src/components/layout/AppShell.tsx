import { useEffect } from 'react'
import { Hotbar } from '@/components/hotbar/Hotbar'
import { SceneStage } from '@/components/scene/SceneStage'
import { FloatingWindows } from '@/components/windows/FloatingWindows'
import { cn } from '@/lib/utils'
import { useLayout } from '@/stores/layout'
import { startSceneSync } from '@/stores/scene'
import { PlayersList } from './PlayersList'
import { RightPanel } from './RightPanel'

/** Sidebar width when open, and as an icon column when collapsed. */
const SIDEBAR_WIDTH = 380
const SIDEBAR_COLLAPSED = 46

/**
 * Foundry-style layout: the scene fills the window and everything else
 * floats over it: the sidebar on the right, players bottom-left, the macro
 * hotbar along the bottom, and sheets in their own windows.
 */
export function AppShell(): React.JSX.Element {
  const collapsed = useLayout((s) => s.rightCollapsed)
  useEffect(() => startSceneSync(), [])
  const sidebar = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="absolute inset-0" style={{ right: 0 }}>
        <SceneStage rightInset={sidebar + 16} />
      </div>

      <aside
        aria-label="Sidebar"
        className={cn('absolute top-2 right-2 z-20 overflow-hidden rounded-lg border border-white/10 bg-background/85 shadow-2xl backdrop-blur-md transition-[width] duration-200', collapsed ? 'max-h-[calc(100%-16px)]' : 'bottom-2')}
        style={{ width: sidebar }}
      >
        <RightPanel />
      </aside>

      <div className="absolute bottom-3 left-3 z-10">
        <PlayersList />
      </div>
      <div className="pointer-events-none absolute bottom-3 z-10 flex justify-center" style={{ left: 232, right: sidebar + 16 }}>
        <div className="pointer-events-auto">
          <Hotbar />
        </div>
      </div>

      <FloatingWindows />
    </div>
  )
}
