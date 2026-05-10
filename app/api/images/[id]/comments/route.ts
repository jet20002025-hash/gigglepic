import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const MAX_LEN = 500

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: funnyImageId } = await context.params

  const image = await prisma.funnyImage.findUnique({
    where: { id: funnyImageId },
    select: { id: true },
  })

  if (!image) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }

  const rows = await prisma.comment.findMany({
    where: { funnyImageId },
    orderBy: { createdAt: 'desc' },
    take: 80,
    select: {
      id: true,
      body: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  })

  return NextResponse.json({
    comments: rows.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      user: {
        id: row.user.id,
        name: row.user.name,
        image: row.user.image,
      },
    })),
  })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in with Google to comment' }, { status: 401 })
  }

  const { id: funnyImageId } = await context.params

  const image = await prisma.funnyImage.findUnique({
    where: { id: funnyImageId },
    select: { id: true },
  })

  if (!image) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const text =
    typeof body === 'object' && body !== null && 'body' in body && typeof (body as { body: unknown }).body === 'string'
      ? (body as { body: string }).body.trim()
      : ''

  if (!text) {
    return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
  }

  if (text.length > MAX_LEN) {
    return NextResponse.json({ error: `Comment must be ${MAX_LEN} characters or fewer` }, { status: 400 })
  }

  const row = await prisma.comment.create({
    data: {
      body: text,
      userId: session.user.id,
      funnyImageId,
    },
    select: {
      id: true,
      body: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  })

  return NextResponse.json({
    comment: {
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      user: {
        id: row.user.id,
        name: row.user.name,
        image: row.user.image,
      },
    },
  })
}
