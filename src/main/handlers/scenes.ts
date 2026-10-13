import { z } from 'zod'
import { DISPOSITIONS } from '@shared/scene'
import { handle } from '../ipc'
import { createScene, listScenes, readScene, saveScene } from '../scenes'
import { vaultService } from '../vault/service'

const path = z.string().min(1).max(1024)
const px = z.number().finite().min(-100_000).max(100_000)

const grid = z.object({
  size: z.number().min(10).max(1000),
  distance: z.number().min(0.1).max(10_000),
  units: z.string().max(12),
  offsetX: px,
  offsetY: px,
  visible: z.boolean()
})

const token = z.object({
  id: z.string().min(1).max(60),
  name: z.string().min(1).max(200),
  x: px,
  y: px,
  size: z.number().min(0.5).max(10),
  actor: z.string().max(1024).optional(),
  img: z.string().max(1024).optional(),
  disposition: z.enum(DISPOSITIONS),
  hidden: z.boolean().optional(),
  hp: z.object({ value: z.number().int().min(0).max(100_000), max: z.number().int().min(1).max(100_000) }).optional(),
  ac: z.number().int().min(-50).max(100).optional()
})

const fog = z.object({
  enabled: z.boolean(),
  rects: z.array(z.object({ x: px, y: px, w: z.number().min(1).max(200_000), h: z.number().min(1).max(200_000), hide: z.boolean().optional() })).max(5000)
})

export function registerSceneHandlers(): void {
  handle('scenes:list', (_e, campaignPath) => listScenes(vaultService.require(), campaignPath), z.tuple([path]))
  handle('scenes:get', (_e, scenePath) => readScene(vaultService.require(), scenePath), z.tuple([path]))
  handle(
    'scenes:create',
    (_e, campaignPath, opts) => createScene(vaultService.require(), campaignPath, opts),
    z.tuple([path, z.object({ name: z.string().max(200), image: z.string().max(1024), width: z.number().int().min(0).max(100_000).optional(), height: z.number().int().min(0).max(100_000).optional() })])
  )
  handle(
    'scenes:save',
    (_e, scenePath, patch) => saveScene(vaultService.require(), scenePath, patch),
    z.tuple([
      path,
      z.object({
        image: z.string().max(1024).optional(),
        width: z.number().int().min(0).max(100_000).optional(),
        height: z.number().int().min(0).max(100_000).optional(),
        grid: grid.optional(),
        tokens: z.array(token).max(1000).optional(),
        fog: fog.optional(),
        active: z.boolean().optional()
      })
    ])
  )
}
