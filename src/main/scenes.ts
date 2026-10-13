/** Scene notes (battlemaps with tokens and fog) in a campaign's Scenes folder. */
import { CAMPAIGN_FILE } from '@shared/layout'
import { joinVaultPath, noteName, sanitizeFileName, toWikilink } from '@shared/names'
import { SCENES_FOLDER, sceneFromFrontmatter, sceneToFrontmatter, type Scene, type SceneSummary } from '@shared/scene'
import type { VaultPath } from '@shared/types'
import { AppError } from './errors'
import { imagePath } from './maps'
import { parseNote, serializeNote, updateNote } from './vault/frontmatter'
import type { Vault } from './vault/vault'

/** "…/Campaigns/X/Scenes/Y.md" → "…/Campaigns/X". */
export function campaignOfScene(path: VaultPath): VaultPath {
  return path.split('/').slice(0, -2).join('/')
}

async function sceneFiles(vault: Vault, campaignPath: VaultPath): Promise<{ path: VaultPath; content: string }[]> {
  const entries = await vault.list(joinVaultPath(campaignPath, SCENES_FOLDER)).catch(() => [])
  const out: { path: VaultPath; content: string }[] = []
  for (const e of entries) {
    if (e.isDir || !e.name.toLowerCase().endsWith('.md')) continue
    const file = await vault.readIfExists(e.path)
    if (file && parseNote(file.content).data.type === 'scene') out.push({ path: e.path, content: file.content })
  }
  return out
}

function toScene(vault: Vault, path: VaultPath, content: string): Scene {
  const { data } = parseNote(content)
  return sceneFromFrontmatter(path, noteName(path), data, imagePath(vault, campaignOfScene(path), data.image))
}

export async function listScenes(vault: Vault, campaignPath: VaultPath): Promise<SceneSummary[]> {
  const files = await sceneFiles(vault, campaignPath)
  return files
    .map((f) => toScene(vault, f.path, f.content))
    .map((s) => ({ path: s.path, name: s.name, image: s.image, active: s.active }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function readScene(vault: Vault, path: VaultPath): Promise<Scene> {
  const file = await vault.readIfExists(path)
  if (!file) throw new AppError('NOT_FOUND', 'That scene no longer exists.')
  return toScene(vault, path, file.content)
}

/** Stores the image relative to the campaign folder when it's inside it. */
function storedImage(campaignPath: VaultPath, image: string): string | undefined {
  if (!image) return undefined
  return image.startsWith(`${campaignPath}/`) ? image.slice(campaignPath.length + 1) : image
}

export async function createScene(vault: Vault, campaignPath: VaultPath, opts: { name: string; image: string; width?: number; height?: number }): Promise<Scene> {
  const name = opts.name.trim() || 'New scene'
  const path = await vault.uniquePath(joinVaultPath(campaignPath, SCENES_FOLDER), sanitizeFileName(name), '.md')
  const campaignName = noteName(campaignPath)
  const embed = opts.image ? `\n![[${opts.image.split('/').pop()}]]\n` : ''
  const scene = sceneFromFrontmatter(path, noteName(path), { width: opts.width, height: opts.height }, opts.image)
  const data = {
    type: 'scene',
    campaign: toWikilink(joinVaultPath(campaignPath, CAMPAIGN_FILE), { full: true, alias: campaignName }),
    image: storedImage(campaignPath, opts.image),
    ...sceneToFrontmatter(scene)
  }
  await vault.write(path, serializeNote(data, `\n# ${noteName(path)}\n${embed}\n## DM notes\n\n`))
  return readScene(vault, path)
}

export type ScenePatch = Partial<Pick<Scene, 'image' | 'width' | 'height' | 'grid' | 'tokens' | 'fog' | 'active'>>

/** Saves changed fields; activating a scene deactivates the campaign's others. */
export async function saveScene(vault: Vault, path: VaultPath, patch: ScenePatch): Promise<Scene> {
  const campaignPath = campaignOfScene(path)
  const fields: Record<string, unknown> = {}
  if (patch.image !== undefined) fields.image = storedImage(campaignPath, patch.image)
  if (patch.width !== undefined) fields.width = patch.width || undefined
  if (patch.height !== undefined) fields.height = patch.height || undefined
  if (patch.grid) fields.grid = patch.grid
  if (patch.tokens) fields.tokens = patch.tokens.map((t) => ({ ...t }))
  if (patch.fog) fields.fog = patch.fog.enabled || patch.fog.rects.length ? patch.fog : undefined
  if (patch.active !== undefined) fields.active = patch.active || undefined
  let missing = false
  await vault.mutate(path, (cur) => {
    if (cur === null) {
      missing = true
      return null
    }
    return updateNote(cur, fields)
  })
  if (missing) throw new AppError('NOT_FOUND', 'That scene no longer exists.')
  if (patch.active) {
    for (const other of await sceneFiles(vault, campaignPath)) {
      if (other.path !== path && parseNote(other.content).data.active === true) await vault.mutate(other.path, (cur) => (cur === null ? null : updateNote(cur, { active: undefined })))
    }
  }
  return readScene(vault, path)
}

/** The scene players see: the active one, if any. */
export async function activeScene(vault: Vault, campaignPath: VaultPath): Promise<Scene | null> {
  const files = await sceneFiles(vault, campaignPath)
  const hit = files.find((f) => parseNote(f.content).data.active === true)
  return hit ? toScene(vault, hit.path, hit.content) : null
}
