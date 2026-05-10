import type { Metadata } from 'next'
import { AdSenseScript } from '@/components/adsense-script'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'One Funny Pic — Random laughs in one tap',
  description:
    'Open the site for a random funny picture. Tap again for another. Sign in with Google to leave a reaction.',
  openGraph: {
    title: 'One Funny Pic — Random laughs in one tap',
    description:
      'Open the site for a random funny picture. Tap again for another. Sign in with Google to leave a reaction.',
    locale: 'en_US',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AdSenseScript />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
