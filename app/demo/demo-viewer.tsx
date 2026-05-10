'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { RandomImageCard } from '@/components/random-image-card'

function pickRandom<T>(items: T[], avoid: T | null): T {
  if (items.length === 1) return items[0]!
  let choice = items[Math.floor(Math.random() * items.length)]!
  let guard = 0
  while (choice === avoid && guard++ < 24) {
    choice = items[Math.floor(Math.random() * items.length)]!
  }
  return choice
}

export function DemoViewer({ files }: { files: string[] }) {
  const [current, setCurrent] = useState(() => pickRandom(files, null))

  const showNext = useCallback(() => {
    if (files.length === 0) return
    setCurrent((prev) => pickRandom(files, prev))
  }, [files])

  const src = `/api/demo-local/${encodeURIComponent(current)}`

  return (
    <>
      <RandomImageCard
        src={src}
        alt=""
        loading={false}
        refreshing={false}
        error={null}
        emptyContent={null}
        onRequestNext={showNext}
        disabled={false}
        hint="Left-click for another random file · Scroll wheel on the image to zoom (1×–6×)"
      />

      <p className="text-center text-xs text-[var(--muted)]">
        Not in the live pool yet —{' '}
        <Link href="/" className="text-[var(--accent)] underline-offset-2 hover:underline">
          Home (database)
        </Link>
      </p>
    </>
  )
}
