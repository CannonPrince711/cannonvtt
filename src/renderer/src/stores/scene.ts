/**
 * The scene on the canvas: the campaign's scenes, the one being viewed, the
 * selected tool and tokens. Edits apply at once and are saved to the scene
 * note shortly after (batched, so dragging doesn't write on every frame).
 */
import { create } from 'zustand'
import type { Scene, SceneSummary } from '@shared/scene'
import { invoke, on } from '@/lib/ipc'
import { toast } from '@/stores/toasts'
import { useVault } from '@/stores/vault'

export type SceneTool = 'select' | 'measure' | 'reveal' | 'hide'

type Patch = Partial<Pick<Scene, 'image' | 'width' | 'height' | 'grid' | 'tokens' | 'fog' | 'active'>>

interface SceneStore {
  campaign: string | null
  scenes: SceneSummary[]
  scene: Scene | null
  tool: SceneTool
  selected: string[]
  /** Bumped to ask the canvas to fit the scene in view. */
  fitNonce: number
  requestFit: () => void
  /** Loads the campaign's scenes and opens the remembered (or active) one. */
  load: (campaign: string | null) => Promise<void>
  view: (path: string | null) => Promise<void>
  update: (patch: Patch | ((s: Scene) => Patch)) => void
  create: (opts: { name: string; image: string; width?: number; height?: number }) => Promise<Scene | null>
  activate: (path: string) => Promise<void>
  setTool: (tool: SceneTool) => void
  select: (ids: string[]) => void
}

const SAVE_DELAY = 350
let pending: { path: string; patch: Patch } | null = null
let timer: ReturnType<typeof setTimeout> | null = null
/** Our own recent writes, so the file watcher doesn't reload over newer local edits. */
let lastSaveAt = 0

function rememberKey(campaign: string): string {
  return `cvtt.scene:${campaign}`
}
function remember(campaign: string, path: string | null): void {
  try {
    if (path) localStorage.setItem(rememberKey(campaign), path)
    else localStorage.removeItem(rememberKey(campaign))
  } catch {
    /* per-device convenience only */
  }
}
function remembered(campaign: string): string | null {
  try {
    return localStorage.getItem(rememberKey(campaign))
  } catch {
    return null
  }
}

async function flush(): Promise<void> {
  if (timer) clearTimeout(timer)
  timer = null
  const job = pending
  pending = null
  if (!job) return
  try {
    lastSaveAt = Date.now()
    await invoke('scenes:save', job.path, job.patch)
  } catch (err) {
    toast.error(err, 'Could not save the scene')
  }
}

export const useScene = create<SceneStore>((set, get) => ({
  campaign: null,
  scenes: [],
  scene: null,
  tool: 'select',
  selected: [],
  fitNonce: 0,
  requestFit: () => set({ fitNonce: get().fitNonce + 1 }),

  async load(campaign) {
    await flush()
    if (!campaign) return set({ campaign: null, scenes: [], scene: null, selected: [] })
    const scenes = await invoke('scenes:list', campaign).catch(() => [] as SceneSummary[])
    const keep = get().campaign === campaign ? get().scene?.path : null
    set({ campaign, scenes })
    const want = [keep, remembered(campaign), scenes.find((s) => s.active)?.path, scenes[0]?.path].find((p) => p && scenes.some((s) => s.path === p)) ?? null
    await get().view(want)
  },

  async view(path) {
    await flush()
    const campaign = get().campaign
    if (campaign) remember(campaign, path)
    if (!path) return set({ scene: null, selected: [] })
    try {
      const scene = await invoke('scenes:get', path)
      set({ scene, selected: get().scene?.path === path ? get().selected : [] })
    } catch (err) {
      toast.error(err, 'Could not open the scene')
      set({ scene: null })
    }
  },

  update(patchOrFn) {
    const scene = get().scene
    if (!scene) return
    const patch = typeof patchOrFn === 'function' ? patchOrFn(scene) : patchOrFn
    set({ scene: { ...scene, ...patch } })
    if (pending && pending.path !== scene.path) void flush()
    pending = { path: scene.path, patch: { ...(pending?.patch ?? {}), ...patch } }
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void flush(), SAVE_DELAY)
  },

  async create(opts) {
    const campaign = get().campaign
    if (!campaign) {
      toast.info('Pick a campaign first.')
      return null
    }
    try {
      const scene = await invoke('scenes:create', campaign, opts)
      const scenes = await invoke('scenes:list', campaign)
      set({ scenes })
      await get().view(scene.path)
      return scene
    } catch (err) {
      toast.error(err, 'Could not create the scene')
      return null
    }
  },

  async activate(path) {
    await flush()
    try {
      const scene = await invoke('scenes:save', path, { active: true })
      const campaign = get().campaign
      if (campaign) set({ scenes: await invoke('scenes:list', campaign) })
      if (get().scene?.path === path) set({ scene })
    } catch (err) {
      toast.error(err, 'Could not activate the scene')
    }
  },

  setTool: (tool) => set({ tool }),
  select: (selected) => set({ selected })
}))

/** Keeps the store in step with the active campaign and with edits made in Obsidian. */
export function startSceneSync(): () => void {
  let campaign = useVault.getState().activeCampaign
  void useScene.getState().load(campaign)
  const unsubVault = useVault.subscribe((s) => {
    if (s.activeCampaign !== campaign) {
      campaign = s.activeCampaign
      void useScene.getState().load(campaign)
    }
  })
  const unsubFiles = on('vault:changed', (e) => {
    const { campaign: c, scene } = useScene.getState()
    if (!c || !e.path.startsWith(`${c}/Scenes/`)) return
    void invoke('scenes:list', c).then((scenes) => useScene.setState({ scenes })).catch(() => {})
    if (scene?.path !== e.path) return
    if (e.event === 'unlink') return void useScene.getState().view(null)
    // Skip the echo of our own save, and don't clobber edits still waiting to be saved.
    if (pending || Date.now() - lastSaveAt < 1500) return
    void invoke('scenes:get', e.path).then((next) => useScene.setState({ scene: next })).catch(() => {})
  })
  return () => {
    unsubVault()
    unsubFiles()
  }
}
