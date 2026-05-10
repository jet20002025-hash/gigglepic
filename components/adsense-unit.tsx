'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[]
  }
}

type Props = {
  /** Ad unit ID from AdSense → Ads → By ad unit */
  slot: string
  /** Layout hint for responsive units */
  format?: 'auto' | 'fluid'
  className?: string
}

/**
 * One display ad unit. Requires NEXT_PUBLIC_ADSENSE_CLIENT_ID and a valid slot id.
 * Create ad units in AdSense, then paste slot numbers into env (see README).
 */
export function AdSenseUnit({ slot, format = 'auto', className }: Props) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim()

  useEffect(() => {
    if (!clientId || !slot) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      /* ignore third-party errors */
    }
  }, [clientId, slot])

  if (!clientId || !slot) return null

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center' }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
