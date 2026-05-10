import { NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { isR2Configured, uploadToR2 } from '@/lib/r2'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function extFromMime(mime: string) {
  if (mime === 'image/jpeg') return '.jpg'
  if (mime === 'image/png') return '.png'
  if (mime === 'image/webp') return '.webp'
  if (mime === 'image/gif') return '.gif'
  return ''
}

export async function POST(request: Request) {
  const form = await request.formData()
  const file = form.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing form field: file' }, { status: 400 })
  }

  const mimeType = file.type || 'application/octet-stream'
  if (!ALLOWED.has(mimeType)) {
    return NextResponse.json({ error: 'Only JPG, PNG, WebP, and GIF are allowed' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const maxBytes = 8 * 1024 * 1024
  if (buffer.length > maxBytes) {
    return NextResponse.json({ error: 'Each image must be 8MB or smaller' }, { status: 400 })
  }

  const ext = extFromMime(mimeType)
  const storageKey = `${randomUUID()}${ext}`
  const r2ObjectKey = `funny/${storageKey}`

  let publicUrl: string

  if (isR2Configured()) {
    try {
      publicUrl = await uploadToR2({
        key: r2ObjectKey,
        body: buffer,
        contentType: mimeType,
      })
    } catch {
      return NextResponse.json(
        { error: 'Upload to Cloudflare R2 failed. Check env vars and bucket permissions.' },
        { status: 500 },
      )
    }
  } else {
    if (process.env.VERCEL === '1') {
      return NextResponse.json(
        {
          error:
            'R2 is not configured for production. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_BASE_URL on Vercel.',
        },
        { status: 500 },
      )
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })
    await writeFile(path.join(uploadDir, storageKey), buffer)
    publicUrl = `/uploads/${storageKey}`
  }

  const row = await prisma.funnyImage.create({
    data: {
      storageKey,
      publicUrl,
      mimeType,
    },
    select: {
      id: true,
      publicUrl: true,
      mimeType: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    image: {
      id: row.id,
      url: row.publicUrl,
      mimeType: row.mimeType,
      createdAt: row.createdAt.toISOString(),
    },
  })
}
