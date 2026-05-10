import { NextResponse } from 'next/server'
import { readFile, readdir } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i

function mimeFromExt(ext: string) {
  switch (ext.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    default:
      return 'application/octet-stream'
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name: raw } = await context.params

  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return new NextResponse('Bad request', { status: 400 })
  }

  const base = path.basename(decoded)
  if (base !== decoded || base === '.' || base === '..') {
    return new NextResponse('Bad request', { status: 400 })
  }

  const dir = path.join(process.cwd(), 'local-import')

  let allowed: string[]
  try {
    const names = await readdir(dir)
    allowed = names.filter((n) => IMAGE_EXT.test(n))
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }

  if (!allowed.includes(base)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const full = path.join(dir, base)

  try {
    const buf = await readFile(full)
    const mime = mimeFromExt(path.extname(base))
    return new NextResponse(buf, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
