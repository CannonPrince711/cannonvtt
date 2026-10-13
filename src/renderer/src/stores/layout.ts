import { create } from 'zustand'

export type RightTab = 'chat' | 'combat' | 'scenes' | 'actors' | 'journal' | 'lore' | 'images' | 'table' | 'dm' | 'extensions' | 'sheet' | 'graph'

interface LayoutStore {
  /** The sidebar shrinks to its icon column, like Foundry's collapsed sidebar. */
  rightCollapsed: boolean
  rightTab: RightTab
  setRightCollapsed: (v: boolean) => void
  toggleRight: () => void
  setRightTab: (tab: RightTab) => void
  /** Shows a tab, expanding the sidebar if needed. */
  openTab: (tab: RightTab) => void
}

export const useLayout = create<LayoutStore>((set) => ({
  rightCollapsed: false,
  rightTab: 'chat',
  setRightCollapsed: (rightCollapsed) => set({ rightCollapsed }),
  toggleRight: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),
  setRightTab: (rightTab) => set({ rightTab }),
  openTab: (rightTab) => set({ rightTab, rightCollapsed: false })
}))
