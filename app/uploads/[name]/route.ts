import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isR2Configured } from '@/lib/r2'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Matches storage keys produced by upload/import (UUID + allowed ext). */
const STORAGE_KEY =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpe?g|png|webp|gif)$/i

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params

  if (!STORAGE_KEY.test(name)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const row = await prisma.funnyImage.findFirst({
    where: { storageKey: name },
    select: { storageKey: true, publicUrl: true },
  })

  if (!row) {
    return new NextResponse('Not found', { status: 404 })
  }

  const url = row.publicUrl.trim()

  if (url.startsWith('https://') || url.startsWith('http://')) {
    return NextResponse.redirect(url, 302)
  }

  if (url.startsWith('/uploads/') && isR2Configured()) {
    const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '')
    if (base) {
      return NextResponse.redirect(`${base}/funny/${row.storageKey}`, 302)
    }
  }

  return new NextResponse('Not found', { status: 404 })
}
