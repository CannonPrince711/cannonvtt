import { BookOpen, ChevronLeft, ChevronRight, Crown, Image, Map as MapIcon, MessageSquare, NotebookText, Puzzle, ScrollText, Settings, Swords, UserRound, Users } from 'lucide-react'
import { ActorsPanel } from '@/components/actors/ActorsPanel'
import { GraphPanel } from '@/components/graph/GraphView'
import { ImagesPanel } from '@/components/images/ImagesPanel'
import { ExtensionsPanel } from '@/components/extensions/ExtensionsUi'
import { LorePanel } from '@/components/lore/LorePanel'
import { ScenesPanel } from '@/components/scene/ScenesPanel'
import { CombatPanel } from '@/components/sheet/CombatPanel'
import { SheetPanel } from '@/components/sheet/SheetPanel'
import { DmScreen } from '@/components/table/DmScreen'
import { TablePanel } from '@/components/table/TablePanel'
import { Tip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useLayout, type RightTab } from '@/stores/layout'
import { useUi } from '@/stores/ui'
import { ChatPane } from './ChatPane'
import { LeftSidebar } from './LeftSidebar'

const TABS: { id: RightTab; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'combat', label: 'Combat', icon: Swords },
  { id: 'scenes', label: 'Scenes', icon: MapIcon },
  { id: 'actors', label: 'Actors', icon: UserRound },
  { id: 'journal', label: 'Journal: campaigns and sessions', icon: NotebookText },
  { id: 'lore', label: 'Lore', icon: BookOpen },
  { id: 'sheet', label: 'Your sheet', icon: ScrollText },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'table', label: 'Players', icon: Users },
  { id: 'dm', label: 'DM screen', icon: Crown },
  { id: 'extensions', label: 'Extensions', icon: Puzzle }
]

function TabBody({ tab }: { tab: RightTab }): React.JSX.Element {
  switch (tab) {
    case 'chat':
      return <ChatPane />
    case 'combat':
      return <CombatPanel />
    case 'scenes':
      return <ScenesPanel />
    case 'actors':
      return <ActorsPanel />
    case 'journal':
      return <LeftSidebar />
    case 'lore':
      return <LorePanel />
    case 'sheet':
      return <SheetPanel />
    case 'images':
      return <ImagesPanel />
    case 'graph':
      return <GraphPanel />
    case 'table':
      return <TablePanel />
    case 'dm':
      return <DmScreen />
    case 'extensions':
      return <ExtensionsPanel />
  }
}

function TabButton({ id, label, icon: Icon, active, vertical }: { id: RightTab; label: string; icon: React.ElementType; active: boolean; vertical?: boolean }): React.JSX.Element {
  return (
    <Tip label={label} side={vertical ? 'left' : 'bottom'}>
      <button
        type="button"
        role="tab"
        aria-selected={active}
        aria-label={label}
        onClick={() => useLayout.getState().openTab(id)}
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-md transition-colors',
          active ? 'bg-gold/20 text-gold shadow-[inset_0_-2px_0_var(--color-gold)]' : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'
        )}
      >
        <Icon className="size-4" />
      </button>
    </Tip>
  )
}

/** Foundry-style sidebar: a row of tab icons over the open tab; collapses to an icon column. */
export function RightPanel(): React.JSX.Element {
  const { rightTab, rightCollapsed, toggleRight } = useLayout()
  const openSettings = useUi((s) => s.openSettings)
  const side = rightCollapsed ? 'left' : 'bottom'
  const settingsButton = (
    <Tip label="Settings" side={side}>
      <button type="button" aria-label="Settings" onClick={() => openSettings()} className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground">
        <Settings className="size-4" />
      </button>
    </Tip>
  )
  const collapse = (
    <Tip label={rightCollapsed ? 'Expand the sidebar' : 'Collapse the sidebar'} side={side}>
      <button type="button" aria-label={rightCollapsed ? 'Expand the sidebar' : 'Collapse the sidebar'} onClick={toggleRight} className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground">
        {rightCollapsed ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
      </button>
    </Tip>
  )

  if (rightCollapsed) {
    return (
      <div role="tablist" aria-orientation="vertical" aria-label="Sidebar tabs" className="flex flex-col items-center gap-1 p-1.5">
        {collapse}
        {TABS.map((t) => (
          <TabButton key={t.id} {...t} active={false} vertical />
        ))}
        {settingsButton}
      </div>
    )
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div role="tablist" aria-label="Sidebar tabs" className="flex items-center justify-between border-b border-white/10 px-1.5 py-1">
        {TABS.map((t) => (
          <TabButton key={t.id} {...t} active={rightTab === t.id} />
        ))}
        {settingsButton}
      </div>
      <div role="tabpanel" aria-label={TABS.find((t) => t.id === rightTab)?.label} className={cn('min-h-0 flex-1', rightTab === 'chat' ? 'flex flex-col' : 'overflow-y-auto')}>
        <TabBody tab={rightTab} />
      </div>
    </div>
  )
}
