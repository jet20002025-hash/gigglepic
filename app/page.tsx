'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { AdSenseUnit } from '@/components/adsense-unit'
import { RandomImageCard } from '@/components/random-image-card'

const AD_SLOT_BELOW_IMAGE = process.env.NEXT_PUBLIC_ADSENSE_SLOT_BELOW_IMAGE ?? ''
const AD_SLOT_ABOVE_FOOTER = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ABOVE_FOOTER ?? ''

type Img = {
  id: string
  url: string
  mimeType: string | null
  createdAt: string
}

type CommentRow = {
  id: string
  body: string
  createdAt: string
  user: {
    id: string
    name: string | null
    image: string | null
  }
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const [image, setImage] = useState<Img | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)
  const [chosenUploadName, setChosenUploadName] = useState<string | null>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const [comments, setComments] = useState<CommentRow[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)
  const [commentMsg, setCommentMsg] = useState<string | null>(null)

  const fetchRandom = useCallback(async (isInitial = false, excludeId?: string | null) => {
    setError(null)
    if (isInitial) setLoading(true)
    else setRefreshing(true)
    try {
      const qs =
        !isInitial && excludeId
          ? `?exclude=${encodeURIComponent(excludeId)}`
          : ''
      const res = await fetch(`/api/images/random${qs}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load')
      const data = (await res.json()) as { image: Img | null }
      setImage(data.image)
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      if (isInitial) setLoading(false)
      else setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchRandom(true)
  }, [fetchRandom])

  useEffect(() => {
    if (!image?.id) {
      setComments([])
      return
    }

    let cancelled = false
    setCommentsLoading(true)

    void (async () => {
      try {
        const res = await fetch(`/api/images/${image.id}/comments`, { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load comments')
        const data = (await res.json()) as { comments: CommentRow[] }
        if (!cancelled) setComments(data.comments)
      } catch {
        if (!cancelled) setComments([])
      } finally {
        if (!cancelled) setCommentsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [image?.id])

  async function onUpload(formData: FormData) {
    setUploading(true)
    setUploadMsg(null)
    try {
      const res = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      })
      const data = (await res.json()) as { image?: Img; error?: string }
      if (!res.ok) {
        setUploadMsg(data.error ?? 'Upload failed')
        return
      }
      if (data.image) {
        setImage(data.image)
        setUploadMsg('Uploaded. Showing your image now.')
        setChosenUploadName(null)
        if (uploadInputRef.current) uploadInputRef.current.value = ''
      }
    } catch {
      setUploadMsg('Upload failed. Check your connection.')
    } finally {
      setUploading(false)
    }
  }

  async function submitComment() {
    if (!image?.id || !session?.user) return
    const text = commentText.trim()
    if (!text) {
      setCommentMsg('Write something before posting.')
      return
    }

    setCommentBusy(true)
    setCommentMsg(null)
    try {
      const res = await fetch(`/api/images/${image.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      })
      const data = (await res.json()) as { comment?: CommentRow; error?: string }
      if (!res.ok) {
        setCommentMsg(data.error ?? 'Could not post comment')
        return
      }
      if (data.comment) {
        setComments((previous) => [data.comment!, ...previous])
        setCommentText('')
      }
    } catch {
      setCommentMsg('Could not post comment')
    } finally {
      setCommentBusy(false)
    }
  }

  const authLoading = status === 'loading'

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="text-center">
        <p className="mb-2 text-sm tracking-wide text-[var(--muted)]">
          One picture at a time · Left-click the viewer for the next pic · Wheel over the image to zoom ·{' '}
          <Link href="/demo" className="text-[var(--accent)] underline-offset-2 hover:underline">
            Local folder mode
          </Link>
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--accent)]">One Funny Pic</h1>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {authLoading ? (
            <span className="text-sm text-[var(--muted)]">Checking sign-in…</span>
          ) : session?.user ? (
            <>
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- external Google avatar URL
                <img
                  src={session.user.image}
                  alt=""
                  className="h-9 w-9 rounded-full border border-white/15"
                />
              ) : null}
              <span className="max-w-[200px] truncate text-sm text-[var(--text)]">
                {session.user.name ?? session.user.email}
              </span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-[var(--muted)] hover:bg-white/5"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void signIn('google')}
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
            >
              Sign in with Google (required to comment)
            </button>
          )}
        </div>
      </header>

      <RandomImageCard
        src={image?.url ?? null}
        alt="Funny picture"
        loading={loading}
        refreshing={refreshing}
        error={error}
        emptyContent={
          <>
            <p>No images yet.</p>
            <p className="text-sm">Upload one below so everyone can get random laughs.</p>
          </>
        }
        onRequestNext={() => void fetchRandom(false, image?.id)}
        disabled={loading || refreshing}
        hint={
          loading
            ? 'Loading your first picture…'
            : refreshing
              ? 'Loading another…'
              : 'Left-click for the next random pic · Scroll wheel on the image to zoom (1×–6×)'
        }
      />

      {AD_SLOT_BELOW_IMAGE ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 px-2 py-3">
          <p className="mb-2 text-center text-[10px] uppercase tracking-wider text-[var(--muted)]">
            Advertisement
          </p>
          <AdSenseUnit
            slot={AD_SLOT_BELOW_IMAGE}
            className="flex min-h-[100px] justify-center overflow-hidden"
          />
        </div>
      ) : null}

      {image ? (
        <section className="rounded-2xl border border-white/10 bg-[var(--card)]/80 p-5 backdrop-blur">
          <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">Reactions to this pic</h2>

          {commentsLoading ? (
            <p className="text-sm text-[var(--muted)]">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No comments yet. Be the first.</p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
              {comments.map((comment) => (
                <li
                  key={comment.id}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                >
                  <div className="mb-1 flex items-center gap-2 text-xs text-[var(--muted)]">
                    {comment.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- arbitrary user image URLs
                      <img src={comment.user.image} alt="" className="h-6 w-6 rounded-full" />
                    ) : null}
                    <span className="font-medium text-[var(--text)]">
                      {comment.user.name ?? 'Someone'}
                    </span>
                    <span>
                      {new Date(comment.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-[var(--text)] leading-relaxed">{comment.body}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t border-white/10 pt-4">
            {session?.user ? (
              <>
                <label className="mb-2 block text-xs text-[var(--muted)]">
                  Share your reaction (max 500 characters)
                </label>
                <textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="LOL / This got me / …"
                  className="mb-3 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[var(--text)] placeholder:text-zinc-600"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[var(--muted)]">{commentText.length}/500</span>
                  <button
                    type="button"
                    disabled={commentBusy}
                    onClick={() => void submitComment()}
                    className="rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-black disabled:opacity-50"
                  >
                    {commentBusy ? 'Posting…' : 'Post comment'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Sign in to comment.
                <button
                  type="button"
                  onClick={() => void signIn('google')}
                  className="ml-2 font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                >
                  Sign in with Google
                </button>
              </p>
            )}
            {commentMsg ? <p className="mt-2 text-sm text-amber-300/90">{commentMsg}</p> : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-[var(--card)]/80 p-5 backdrop-blur">
        <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">
          Upload a funny pic (added to the random pool)
        </h2>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const formData = new FormData(event.currentTarget)
            void onUpload(formData)
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label
            htmlFor="funny-pic-upload"
            className="flex flex-1 cursor-pointer flex-col gap-2 text-sm text-[var(--muted)]"
          >
            <span>Choose image</span>
            <div className="flex min-h-[42px] flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <span className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-black">
                Choose file
              </span>
              <span className="text-[var(--text)]">
                {chosenUploadName ?? 'No file chosen'}
              </span>
            </div>
            <input
              ref={uploadInputRef}
              id="funny-pic-upload"
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              required
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                setChosenUploadName(file ? file.name : null)
              }}
            />
          </label>
          <button
            type="submit"
            disabled={uploading}
            className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
        {uploadMsg ? <p className="mt-3 text-sm text-[var(--muted)]">{uploadMsg}</p> : null}
      </section>

      {AD_SLOT_ABOVE_FOOTER ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 px-2 py-3">
          <p className="mb-2 text-center text-[10px] uppercase tracking-wider text-[var(--muted)]">
            Advertisement
          </p>
          <AdSenseUnit
            slot={AD_SLOT_ABOVE_FOOTER}
            className="flex min-h-[100px] justify-center overflow-hidden"
          />
        </div>
      ) : null}

      <footer className="text-center text-xs text-[var(--muted)]">
        Stack tip: <strong className="text-[var(--text)]">Vercel</strong> for hosting,{' '}
        <strong className="text-[var(--text)]">Neon</strong> for data,{' '}
        <strong className="text-[var(--text)]">Cloudflare R2</strong> for images. Comments require{' '}
        <strong className="text-[var(--text)]">Google</strong> sign-in. Local dev without R2 uses{' '}
        <code className="rounded bg-white/5 px-1">public/uploads</code>.
      </footer>
    </main>
  )
}
