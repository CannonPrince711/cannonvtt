/** Actions shared by the canvas, the token HUD and the directories. */
import { addCombatants } from '@shared/combat'
import { modifier } from '@shared/prompt'
import { freeSpot, newTokenId, snapToken, type Disposition, type Token } from '@shared/scene'
import type { CharacterSummary } from '@shared/types'
import { invoke } from './ipc'
import { updateCombat } from './combat'
import { useScene } from '@/stores/scene'
import { useVault } from '@/stores/vault'

/** dataTransfer type for an actor dragged from the Actors directory. */
export const ACTOR_DRAG = 'application/x-cannonvtt-actor'

export interface ActorDrag {
  path: string
  name: string
  kind: 'character' | 'npc'
}

/** The character or NPC summary a token stands for. */
export function actorOf(token: Pick<Token, 'actor'>): CharacterSummary | undefined {
  if (!token.actor) return undefined
  const index = useVault.getState().index
  return index?.characters.find((c) => c.path === token.actor) ?? index?.npcs.find((c) => c.path === token.actor)
}

/** Places a token for an actor (or a bare one) centred on a point of the scene. */
export function placeToken(at: { x: number; y: number }, opts: { name: string; actor?: string; disposition?: Disposition; size?: number; hp?: Token['hp']; ac?: number }): Token | null {
  const scene = useScene.getState().scene
  if (!scene) return null
  const size = opts.size ?? 1
  const half = (size * scene.grid.size) / 2
  const pos = freeSpot(scene.grid, scene.tokens, snapToken(scene.grid, at.x - half, at.y - half, size))
  const token: Token = {
    id: newTokenId(),
    name: opts.name,
    ...pos,
    size,
    disposition: opts.disposition ?? 'neutral',
    ...(opts.actor ? { actor: opts.actor } : {}),
    ...(opts.hp ? { hp: opts.hp } : {}),
    ...(opts.ac !== undefined ? { ac: opts.ac } : {})
  }
  useScene.getState().update((s) => ({ tokens: [...s.tokens, token] }))
  useScene.getState().select([token.id])
  return token
}

/** Adds tokens to the session's combat tracker (skipping ones already in it). */
export async function addTokensToCombat(tokens: Token[]): Promise<void> {
  const adds: { args: Parameters<typeof addCombatants>[1][number]; extra: Parameters<typeof addCombatants>[2] }[] = []
  for (const t of tokens) {
    let hp = t.hp?.value ?? 10
    let max = t.hp?.max ?? hp
    let ac = t.ac ?? 10
    let initMod = 0
    let isPlayer = false
    if (t.actor) {
      const note = await invoke('characters:get', t.actor).catch(() => null)
      const sheet = note?.card.dnd
      if (sheet) {
        hp = sheet.hp
        max = sheet.max_hp
        ac = sheet.ac
        initMod = modifier(sheet.dex)
      }
      isPlayer = !!useVault.getState().index?.characters.some((c) => c.path === t.actor)
    }
    adds.push({ args: { name: t.name, count: 1, hp, ac, initMod }, extra: { max_hp: max, is_player: isPlayer, ...(isPlayer && t.actor ? { character: t.actor } : {}) } })
  }
  await updateCombat((c) =>
    adds.reduce((state, a) => (state.combatants.some((x) => x.name === a.args.name) ? state : addCombatants(state, [a.args], a.extra)), c)
  )
}
