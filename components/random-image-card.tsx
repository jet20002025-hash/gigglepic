'use client'

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'

const ZOOM_MIN = 1
const ZOOM_MAX = 6

type RandomImageCardProps = {
  src: string | null
  alt: string
  loading: boolean
  refreshing: boolean
  error: string | null
  emptyContent: ReactNode
  onRequestNext: () => void
  disabled: boolean
  hint: string
}

export function RandomImageCard({
  src,
  alt,
  loading,
  refreshing,
  error,
  emptyContent,
  onRequestNext,
  disabled,
  hint,
}: RandomImageCardProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    setZoom(1)
  }, [src])

  useEffect(() => {
    const el = viewportRef.current
    if (!el || !src) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z * factor)))
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [src])

  return (
    <button
      type="button"
      onClick={() => void onRequestNext()}
      disabled={disabled}
      aria-label="Show another random picture. Scroll wheel over the image to zoom."
      className="group relative w-full overflow-hidden rounded-3xl border border-white/10 bg-[var(--card)] p-3 shadow-xl shadow-black/40 transition hover:border-[var(--accent)]/40 disabled:opacity-60 sm:p-4"
    >
      <div
        ref={viewportRef}
        className="relative h-[min(82vh,780px)] w-full overflow-auto rounded-2xl bg-black/40 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20"
      >
        {refreshing ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/30 text-sm text-white/90">
            Loading another…
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-[min(78vh,720px)] items-center justify-center text-[var(--muted)]">
            Loading…
          </div>
        ) : error ? (
          <div className="flex min-h-[min(78vh,720px)] items-center justify-center px-6 text-center text-[var(--muted)]">
            {error}
          </div>
        ) : src ? (
          <div className="flex min-h-full min-w-full items-center justify-center p-2">
            {/* `zoom` affects layout so scrollbars work; `transform: scale` does not expand scroll area */}
            <div style={{ zoom } as CSSProperties} className="inline-block max-w-none origin-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- dynamic CDN / uploads URLs */}
              <img
                src={src}
                alt={alt}
                draggable={false}
                className={`max-h-[min(78vh,720px)] max-w-[min(96vw,1200px)] object-contain select-none ${zoom <= 1 ? 'transition duration-300 group-active:opacity-90' : ''}`}
              />
            </div>
          </div>
        ) : (
          <div className="flex min-h-[min(78vh,720px)] flex-col items-center justify-center gap-2 px-6 text-center text-[var(--muted)]">
            {emptyContent}
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-sm text-[var(--muted)]">{hint}</p>
    </button>
  )
}
