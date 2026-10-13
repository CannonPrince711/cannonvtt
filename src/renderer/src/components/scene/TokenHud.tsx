import { useEffect, useRef } from 'react'
import { Eye, EyeOff, ScrollText, Swords, Trash2, X } from 'lucide-react'
import { DISPOSITIONS, DISPOSITION_INFO, type Token } from '@shared/scene'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/controls'
import { Tip } from '@/components/ui/tooltip'
import { addTokensToCombat } from '@/lib/scene-actions'
import { cn } from '@/lib/utils'
import { useScene } from '@/stores/scene'
import { toast } from '@/stores/toasts'
import { openActorWindow } from '@/stores/windows'

const SIZES: [number, string][] = [
  [0.5, 'Tiny'],
  [1, 'Small / Medium'],
  [2, 'Large'],
  [3, 'Huge'],
  [4, 'Gargantuan']
]

/** Token settings, opened with a right-click on a token. */
export function TokenHud({ token, x, y, onClose }: { token: Token; x: number; y: number; onClose: () => void }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const set = (patch: Partial<Token>): void => useScene.getState().update((s) => ({ tokens: s.tokens.map((t) => (t.id === token.id ? { ...t, ...patch } : t)) }))

  useEffect(() => {
    const down = (e: PointerEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('pointerdown', down, true)
    return () => window.removeEventListener('pointerdown', down, true)
  }, [onClose])

  // Keep the panel on screen.
  const left = Math.min(x + 12, window.innerWidth - 268)
  const top = Math.min(y - 8, window.innerHeight - 330)

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Token: ${token.name}`}
      className="fixed z-50 w-64 space-y-2.5 rounded-lg border bg-popover p-3 text-sm shadow-xl"
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5">
        <Input defaultValue={token.name} aria-label="Token name" className="h-7 text-sm font-medium" onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== token.name && set({ name: e.target.value.trim() })} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
        <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground">
          <X className="size-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Disposition</span>
        <div className="flex gap-1.5">
          {DISPOSITIONS.map((d) => (
            <Tip key={d} label={DISPOSITION_INFO[d].label}>
              <button
                type="button"
                aria-label={DISPOSITION_INFO[d].label}
                aria-pressed={token.disposition === d}
                onClick={() => set({ disposition: d })}
                className={cn('size-5 rounded-full border-2', token.disposition === d ? 'border-foreground' : 'border-transparent')}
                style={{ background: DISPOSITION_INFO[d].color }}
              />
            </Tip>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Size</span>
        <NativeSelect value={String(token.size)} onChange={(e) => set({ size: Number(e.target.value) })} aria-label="Token size" className="h-7 w-40 text-xs">
          {SIZES.map(([n, label]) => (
            <option key={n} value={n}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>

      {!token.actor && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">HP</span>
          <Input type="number" aria-label="Hit points" className="h-7 w-16 text-center" defaultValue={token.hp?.value ?? ''} placeholder="—" onBlur={(e) => {
            const value = Math.max(0, Math.round(Number(e.target.value)))
            if (e.target.value === '') return set({ hp: undefined })
            set({ hp: { value, max: Math.max(value, token.hp?.max ?? value) } })
          }} />
          <span className="text-muted-foreground">/</span>
          <Input type="number" aria-label="Max hit points" className="h-7 w-16 text-center" defaultValue={token.hp?.max ?? ''} placeholder="—" onBlur={(e) => {
            const max = Math.max(1, Math.round(Number(e.target.value)))
            if (e.target.value === '') return
            set({ hp: { value: Math.min(token.hp?.value ?? max, max), max } })
          }} />
          <span className="ml-auto text-muted-foreground">AC</span>
          <Input type="number" aria-label="Armor class" className="h-7 w-12 text-center" defaultValue={token.ac ?? ''} placeholder="—" onBlur={(e) => set({ ac: e.target.value === '' ? undefined : Math.round(Number(e.target.value)) })} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <Button size="sm" variant="outline" onClick={() => set({ hidden: token.hidden ? undefined : true })}>
          {token.hidden ? <EyeOff /> : <Eye />} {token.hidden ? 'Hidden' : 'Visible'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => void addTokensToCombat([token]).then(() => toast.success(`${token.name} joins the combat tracker`)).catch((e) => toast.error(e))}>
          <Swords /> Combat
        </Button>
        {token.actor && (
          <Button size="sm" variant="outline" onClick={() => (openActorWindow(token.actor!), onClose())}>
            <ScrollText /> Sheet
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="border-crimson/50 text-crimson hover:bg-crimson/10"
          onClick={() => {
            useScene.getState().update((s) => ({ tokens: s.tokens.filter((t) => t.id !== token.id) }))
            onClose()
          }}
        >
          <Trash2 /> Remove
        </Button>
      </div>
    </div>
  )
}
