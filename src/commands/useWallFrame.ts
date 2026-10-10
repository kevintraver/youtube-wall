import { useLayoutEffect, useState, type CSSProperties } from 'react'

/**
 * The wall's box on screen (plus its grid gap and padding), kept current as it resizes, e.g. when
 * the search panel pushes it aside. Overlays use it to mirror the wall's grid.
 */
export function useWallFrame(): CSSProperties | null {
  const [frame, setFrame] = useState<CSSProperties | null>(null)
  useLayoutEffect(() => {
    const wall = document.querySelector<HTMLElement>('.wall')!
    const measure = () => {
      const rect = wall.getBoundingClientRect()
      const style = getComputedStyle(wall)
      setFrame({ left: rect.left, top: rect.top, width: rect.width, height: rect.height, gap: style.gap, padding: style.padding })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(wall)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])
  return frame
}
