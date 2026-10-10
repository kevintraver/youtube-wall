import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useEffect, useState } from 'react'
import { Commands } from './commands/Commands'
import { SearchPanel } from './components/SearchPanel'
import { SettingsDialog } from './components/SettingsDialog'
import { Toolbar } from './components/Toolbar'
import { Wall } from './components/Wall'
import { useResolver } from './hooks/useResolver'
import { placeSource } from './lib/actions'
import { parseLink } from './lib/parseLink'
import { useUi } from './state/ui'
import { useWall } from './state/wall'

const IDLE_MS = 3000

type DragData = { type: 'slot'; slotId: string } | { type: 'result'; videoId: string }

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

function useIdle(): boolean {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), IDLE_MS)
    const wake = () => {
      setIdle(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setIdle(true), IDLE_MS)
    }
    window.addEventListener('pointermove', wake)
    window.addEventListener('pointerdown', wake)
    window.addEventListener('keydown', wake)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointermove', wake)
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', wake)
    }
  }, [])
  return idle
}

// Pasting a link while hovering a tile puts it in that tile.
function usePasteToTile(): void {
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return
      const slotId = useUi.getState().hoveredSlotId
      if (!slotId) return
      const result = parseLink(e.clipboardData?.getData('text') ?? '')
      if (result.ok) {
        e.preventDefault()
        placeSource(slotId, result.source)
      } else {
        useUi.getState().showToast(result.error)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])
}

function useFullscreen(): boolean {
  const [fullscreen, setFullscreen] = useState(() => document.fullscreenElement !== null)
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  return fullscreen
}

export default function App() {
  useResolver()
  usePasteToTile()
  const idle = useIdle()
  const fullscreen = useFullscreen()
  const searchOpen = useUi((s) => s.searchOpen)
  const placing = useUi((s) => s.placing !== null)
  const settingsOpen = useUi((s) => s.settingsOpen)
  const toast = useUi((s) => s.toast)
  const wallEmpty = useWall((s) => s.slots.slice(0, s.rows * s.cols).every((slot) => !slot.source))
  const [dragging, setDragging] = useState<DragData | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const onDragStart = (e: DragStartEvent) => setDragging((e.active.data.current as DragData | undefined) ?? null)

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null)
    const data = e.active.data.current as DragData | undefined
    const target = e.over?.data.current as { slotId: string } | undefined
    if (!data || !target) return
    const wall = useWall.getState()
    if (data.type === 'slot' && data.slotId !== target.slotId) wall.swap(data.slotId, target.slotId)
    if (data.type === 'result') placeSource(target.slotId, { kind: 'video', id: data.videoId })
  }

  // The toolbar is always shown in a window. In fullscreen it overlays the wall and hides while idle.
  const toolbarVisible = !fullscreen || !idle || searchOpen || settingsOpen || wallEmpty || placing

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      <div
        className={`app${fullscreen ? ' fullscreen' : ''}${toolbarVisible ? '' : ' idle'}${dragging ? ' is-dragging' : ''}${searchOpen ? ' search-open' : ''}${placing ? ' placing' : ''}`}
      >
        <Toolbar visible={toolbarVisible} />
        <Wall />
        <SearchPanel />
        <SettingsDialog />
        <Commands />
        {toast && (
          <div className="toast" role="status">
            <span>{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action?.run()
                  useUi.getState().set({ toast: null })
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        {dragging && <div className="drag-chip">{dragging.type === 'slot' ? 'Move tile' : 'Drop on a tile'}</div>}
      </DragOverlay>
    </DndContext>
  )
}
