import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const excludeId = new URL(request.url).searchParams.get('exclude')

  const total = await prisma.funnyImage.count()

  if (total === 0) {
    return NextResponse.json({ image: null })
  }

  const excluded =
    excludeId && excludeId.length > 0 ? ({ NOT: { id: excludeId } } as const) : undefined

  let poolCount = excluded ? await prisma.funnyImage.count({ where: excluded }) : total
  let where: { NOT: { id: string } } | undefined = excluded

  if (excluded && poolCount === 0) {
    poolCount = total
    where = undefined
  }

  const skip = Math.floor(Math.random() * poolCount)
  const row = await prisma.funnyImage.findFirst({
    where,
    skip,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      publicUrl: true,
      mimeType: true,
      createdAt: true,
    },
  })

  if (!row) {
    return NextResponse.json({ image: null })
  }

  return NextResponse.json({
    image: {
      id: row.id,
      url: row.publicUrl,
      mimeType: row.mimeType,
      createdAt: row.createdAt.toISOString(),
    },
  })
}
