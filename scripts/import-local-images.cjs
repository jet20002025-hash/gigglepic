/**
 * Batch-import images from a folder into Postgres + storage (same rules as POST /api/images/upload).
 * Usage:
 *   npm run import-images -- [optional-folder]
 *   npm run import-images -- --replace [optional-folder]
 *
 * --replace: deletes all FunnyImage rows (comments cascade), removes local public/uploads files,
 *   and deletes matching objects from R2 when R2 is configured. Then imports from folder again.
 *
 * Default folder: ./local-import
 *
 * Requires DATABASE_URL (and Postgres reachable). Loads env from .env via npm script.
 * Local dev without R2: files go to public/uploads. With R2 env vars: uploads to R2.
 */

const { PrismaClient } = require('@prisma/client')
const { mkdir, readdir, readFile, writeFile, unlink } = require('fs/promises')
const path = require('path')
const { randomUUID } = require('crypto')
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')

const ALLOWED_EXT = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
])

const MAX_BYTES = 8 * 1024 * 1024

function extFromMime(mime) {
  if (mime === 'image/jpeg') return '.jpg'
  if (mime === 'image/png') return '.png'
  if (mime === 'image/webp') return '.webp'
  if (mime === 'image/gif') return '.gif'
  return ''
}

function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_BASE_URL,
  )
}

function r2ClientAndBucket() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET_NAME

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })

  return { client, bucket }
}

async function uploadToR2(params) {
  const baseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '')
  const { client, bucket } = r2ClientAndBucket()

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  )

  return `${baseUrl}/${params.key}`
}

async function deleteAllFromR2(prisma) {
  const rows = await prisma.funnyImage.findMany({ select: { storageKey: true } })
  if (rows.length === 0) return

  const { client, bucket } = r2ClientAndBucket()

  for (const { storageKey } of rows) {
    const key = `funny/${storageKey}`
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    console.log(`R2 deleted ${key}`)
  }
}

async function clearLocalUploadDir(root) {
  const uploadDir = path.join(root, 'public', 'uploads')
  let names
  try {
    names = await readdir(uploadDir)
  } catch {
    return
  }

  for (const name of names) {
    if (name === '.gitkeep') continue
    await unlink(path.join(uploadDir, name))
    console.log(`Removed local upload ${name}`)
  }
}

async function importOne(prisma, root, relPath, mimeType, buffer) {
  if (buffer.length > MAX_BYTES) {
    throw new Error(`${relPath}: exceeds 8MB`)
  }

  const ext = extFromMime(mimeType)
  const storageKey = `${randomUUID()}${ext}`
  const r2ObjectKey = `funny/${storageKey}`

  let publicUrl

  if (isR2Configured()) {
    publicUrl = await uploadToR2({
      key: r2ObjectKey,
      body: buffer,
      contentType: mimeType,
    })
  } else {
    if (process.env.VERCEL === '1') {
      throw new Error('Vercel requires R2; set R2_* env vars')
    }
    const uploadDir = path.join(root, 'public', 'uploads')
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
    select: { id: true, publicUrl: true },
  })

  return row
}

async function main() {
  const root = process.cwd()
  const argv = process.argv.slice(2)
  const replace = argv.includes('--replace')
  const dirArg = argv.filter((a) => a !== '--replace')[0]
  const dir = path.resolve(dirArg || path.join(root, 'local-import'))

  let names
  try {
    names = await readdir(dir)
  } catch {
    console.error(`Cannot read folder: ${dir}`)
    process.exit(1)
  }

  const files = names
    .filter((n) => ALLOWED_EXT.has(path.extname(n).toLowerCase()))
    .sort()

  if (files.length === 0) {
    console.error(`No JPG/PNG/WebP/GIF files in ${dir}`)
    process.exit(1)
  }

  const prisma = new PrismaClient()

  try {
    if (replace) {
      console.log('Replace mode: clearing existing images…')
      if (isR2Configured()) {
        await deleteAllFromR2(prisma)
      }
      const removed = await prisma.funnyImage.deleteMany({})
      console.log(`Database: removed ${removed.count} image row(s) (comments cascade).`)
      if (!isR2Configured()) {
        await clearLocalUploadDir(root)
      }
    }

    for (const name of files) {
      const full = path.join(dir, name)
      const ext = path.extname(name).toLowerCase()
      const mimeType = ALLOWED_EXT.get(ext)
      const buffer = await readFile(full)
      const row = await importOne(prisma, root, name, mimeType, buffer)
      console.log(`OK ${name} -> ${row.publicUrl} (${row.id})`)
    }
    console.log(`Done. Imported ${files.length} image(s).`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
