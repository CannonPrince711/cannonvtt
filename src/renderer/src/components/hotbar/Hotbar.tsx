import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { runCommand } from '@/lib/commands'
import { ACTOR_DRAG, type ActorDrag } from '@/lib/scene-actions'
import { cn } from '@/lib/utils'
import { useChat } from '@/stores/chat'
import { toast } from '@/stores/toasts'
import { openActorWindow } from '@/stores/windows'

/** A hotbar slot: a slash command, or "sheet:<path>" to open an actor's sheet. */
export interface Macro {
  label: string
  command: string
}

const SLOTS = 10
const KEY = 'cvtt.hotbar'

const DEFAULTS: (Macro | null)[] = [
  { label: 'd20', command: '/roll 1d20' },
  { label: 'Init', command: '/init' },
  { label: 'Next', command: '/next' },
  { label: 'Death save', command: '/deathsave' },
  { label: 'Short rest', command: '/rest short' },
  { label: 'Long rest', command: '/rest long' },
  null,
  null,
  null,
  null
]

function load(): (Macro | null)[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as unknown
    if (Array.isArray(raw)) return Array.from({ length: SLOTS }, (_, i) => (raw[i] && typeof raw[i].command === 'string' ? { label: String(raw[i].label ?? ''), command: raw[i].command } : null))
  } catch {
    /* fall back to the defaults */
  }
  return DEFAULTS
}

const useHotbar = create<{ slots: (Macro | null)[]; set: (i: number, m: Macro | null) => void }>((set, get) => ({
  slots: load(),
  set(i, m) {
    const slots = get().slots.map((s, j) => (j === i ? m : s))
    set({ slots })
    try {
      localStorage.setItem(KEY, JSON.stringify(slots))
    } catch {
      /* per-device convenience only */
    }
  }
}))

async function runMacro(m: Macro): Promise<void> {
  if (m.command.startsWith('sheet:')) return openActorWindow(m.command.slice(6))
  const session = useChat.getState().session
  if (!session) return void toast.info('Open a session first', 'Macros run in the current session’s chat.')
  if (!m.command.startsWith('/')) return void useChat.getState().send(m.command)
  await runCommand(m.command, session)
}

function EditSlot({ index, onClose }: { index: number; onClose: () => void }): React.JSX.Element {
  const slot = useHotbar((s) => s.slots[index])
  const [label, setLabel] = useState(slot?.label ?? '')
  const [command, setCommand] = useState(slot?.command ?? '')
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    const down = (e: PointerEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('pointerdown', down, true)
    return () => window.removeEventListener('pointerdown', down, true)
  }, [onClose])
  return (
    <form
      ref={ref}
      className="absolute bottom-full left-1/2 mb-2 w-72 -translate-x-1/2 space-y-2 rounded-lg border bg-popover p-3 shadow-xl"
      onSubmit={(e) => {
        e.preventDefault()
        useHotbar.getState().set(index, command.trim() ? { label: label.trim() || command.trim().replace(/^\//, '').slice(0, 12), command: command.trim() } : null)
        onClose()
      }}
    >
      <p className="text-xs font-medium">Slot {(index + 1) % 10}</p>
      <Input autoFocus value={command} onChange={(e) => setCommand(e.target.value)} placeholder="/roll 1d20+5 Longbow" aria-label="Command" className="h-8 font-mono text-xs" />
      <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" aria-label="Label" className="h-8 text-xs" />
      <div className="flex justify-between">
        <Button type="button" size="sm" variant="ghost" onClick={() => (useHotbar.getState().set(index, null), onClose())}>
          Clear
        </Button>
        <Button type="submit" size="sm">
          Save
        </Button>
      </div>
    </form>
  )
}

/** Foundry-style macro bar: click or press 1–0 to run; right-click to edit; drop an actor to make a sheet shortcut. */
export function Hotbar(): React.JSX.Element {
  const slots = useHotbar((s) => s.slots)
  const [editing, setEditing] = useState<number | null>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement | null
      if (e.ctrlKey || e.altKey || e.metaKey || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) return
      if (!/^[0-9]$/.test(e.key)) return
      const m = useHotbar.getState().slots[(Number(e.key) + 9) % 10]
      if (m) {
        e.preventDefault()
        void runMacro(m)
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  return (
    <nav aria-label="Macro hotbar" className="relative flex gap-1 rounded-lg border bg-black/60 p-1 backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
      {slots.map((m, i) => (
        <div key={i} className="relative">
          <button
            type="button"
            title={m ? `${m.command} (key ${(i + 1) % 10})` : 'Empty: right-click to set a macro'}
            aria-label={m ? `Macro ${(i + 1) % 10}: ${m.label}` : `Empty macro slot ${(i + 1) % 10}`}
            onClick={() => (m ? void runMacro(m) : setEditing(i))}
            onContextMenu={(e) => (e.preventDefault(), setEditing(i))}
            onDragOver={(e) => e.dataTransfer.types.includes(ACTOR_DRAG) && e.preventDefault()}
            onDrop={(e) => {
              const raw = e.dataTransfer.getData(ACTOR_DRAG)
              if (!raw) return
              const a = JSON.parse(raw) as ActorDrag
              useHotbar.getState().set(i, { label: a.name.split(/\s+/)[0]!, command: `sheet:${a.path}` })
            }}
            className={cn(
              'relative flex size-12 flex-col items-center justify-center rounded-md border text-center text-[10px] leading-tight transition-colors',
              m ? 'border-white/15 bg-white/5 text-foreground hover:border-gold/60 hover:bg-gold/10' : 'border-dashed border-white/10 text-muted-foreground/40 hover:text-muted-foreground'
            )}
          >
            <span className="absolute top-0.5 left-1 text-[9px] text-muted-foreground">{(i + 1) % 10}</span>
            <span className="line-clamp-2 px-0.5">{m?.label ?? ''}</span>
          </button>
          {editing === i && <EditSlot index={i} onClose={() => setEditing(null)} />}
        </div>
      ))}
    </nav>
  )
}
