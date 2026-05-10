import { NextResponse } from 'next/server'

function publisherNumericId(clientId: string) {
  return clientId.replace(/^ca-pub-/i, '').trim()
}

/**
 * AdSense / ads.txt — uses same publisher id as NEXT_PUBLIC_ADSENSE_CLIENT_ID.
 * @see https://support.google.com/adsense/answer/7532444
 */
export function GET() {
  const raw = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() ?? ''
  const pub = publisherNumericId(raw)

  if (!pub || !/^\d+$/.test(pub)) {
    return new NextResponse(
      '# Configure NEXT_PUBLIC_ADSENSE_CLIENT_ID (e.g. ca-pub-1234567890123456) then redeploy.\n',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      },
    )
  }

  const body = `google.com, pub-${pub}, DIRECT, f08c47fec0942fa0\n`

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
