import { useRef } from 'react'
import { X } from 'lucide-react'
import { SheetPanel } from '@/components/sheet/SheetPanel'
import { useVault } from '@/stores/vault'
import { useWindows, type FloatingWindow } from '@/stores/windows'

function Window({ w }: { w: FloatingWindow }): React.JSX.Element {
  const { close, focus, move } = useWindows.getState()
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const index = useVault((s) => s.index)
  const title = index?.characters.concat(index.npcs).find((c) => c.path === w.path)?.displayName ?? w.path.split('/').pop()?.replace(/\.md$/i, '')

  return (
    <section
      role="dialog"
      aria-label={title}
      className="pointer-events-auto fixed flex h-[min(640px,80vh)] w-[360px] resize flex-col overflow-hidden rounded-lg border bg-background shadow-2xl"
      style={{ left: w.x, top: w.y, zIndex: 40 + w.z, minWidth: 300, minHeight: 240 }}
      onPointerDown={() => focus(w.id)}
    >
      <header
        className="flex h-8 shrink-0 cursor-move items-center justify-between border-b bg-card px-3 select-none"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return
          e.currentTarget.setPointerCapture(e.pointerId)
          drag.current = { dx: e.clientX - w.x, dy: e.clientY - w.y }
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          move(w.id, Math.max(0, Math.min(window.innerWidth - 80, e.clientX - drag.current.dx)), Math.max(0, Math.min(window.innerHeight - 40, e.clientY - drag.current.dy)))
        }}
        onPointerUp={() => (drag.current = null)}
      >
        <span className="truncate font-display text-sm font-semibold tracking-wide">{title}</span>
        <button type="button" aria-label={`Close ${title}`} onClick={() => close(w.id)} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SheetPanel path={w.path} />
      </div>
    </section>
  )
}

export function FloatingWindows(): React.JSX.Element {
  const windows = useWindows((s) => s.windows)
  return (
    <>
      {windows.map((w) => (
        <Window key={w.id} w={w} />
      ))}
    </>
  )
}
