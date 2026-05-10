import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_BASE_URL,
  )
}

export function createR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials are not configured')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

export async function uploadToR2(params: {
  key: string
  body: Buffer
  contentType: string
}) {
  const bucket = process.env.R2_BUCKET_NAME
  const baseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '')

  if (!bucket || !baseUrl) {
    throw new Error('R2_BUCKET_NAME or R2_PUBLIC_BASE_URL missing')
  }

  const client = createR2Client()
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
