import Link from 'next/link'
import { readdir } from 'fs/promises'
import path from 'path'
import type { Metadata } from 'next'
import { DemoViewer } from './demo-viewer'

export const metadata: Metadata = {
  title: 'Local folder — One Funny Pic',
  description: 'Tap through images in local-import (offline folder, not the database).',
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i

async function listLocalImages(): Promise<string[]> {
  const dir = path.join(process.cwd(), 'local-import')
  try {
    const names = await readdir(dir)
    return names.filter((n) => IMAGE_EXT.test(n)).sort((a, b) => a.localeCompare(b))
  } catch {
    return []
  }
}

export default async function DemoPage() {
  const files = await listLocalImages()

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="text-center">
        <p className="mb-2 text-sm text-[var(--muted)]">
          <Link href="/" className="text-[var(--accent)] underline-offset-2 hover:underline">
            ← Back to home
          </Link>
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--accent)]">Local folder</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Same interaction as the main site: <strong className="text-[var(--text)]">one image</strong>,{' '}
          <strong className="text-[var(--text)]">left-click</strong> for the next file,{' '}
          <strong className="text-[var(--text)]">wheel</strong> to zoom — files in{' '}
          <code className="rounded bg-white/5 px-1.5 py-0.5">local-import/</code>.
        </p>
      </header>

      {files.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-[var(--card)]/80 p-8 text-center text-sm text-[var(--muted)]">
          No images found. Add JPG, PNG, WebP, or GIF files to the{' '}
          <code className="text-[var(--text)]">local-import</code> folder at the project root.
        </p>
      ) : (
        <DemoViewer files={files} />
      )}
    </main>
  )
}
