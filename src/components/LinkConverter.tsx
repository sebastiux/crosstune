import { useState } from 'react'
import { toast } from 'sonner'
import { ClipboardPaste, Link2, Loader2, Music, Search, Sparkles } from 'lucide-react'
import type { ParsedLink, ResolvedMedia, ResolvedTrack } from '@/types'
import { useLinkResolver } from '@/hooks/useLinkResolver'
import type { NewPlaylistTrack } from '@/hooks/usePlaylist'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShareCard } from '@/components/ShareCard'

const EXAMPLES = [
  {
    label: 'Spotify track',
    url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
  },
  {
    label: 'Apple Music song',
    url: 'https://music.apple.com/us/album/never-gonna-give-you-up/1773292758?i=1773293184',
  },
]

interface LinkConverterProps {
  onAddTrack: (track: NewPlaylistTrack) => boolean
  isInPlaylist: (title: string, artist: string) => boolean
}

function toPlaylistTrack(parsed: ParsedLink, result: ResolvedMedia): NewPlaylistTrack | null {
  if (result.kind !== 'track') return null
  return {
    title: result.title,
    artist: result.artist,
    album: result.album,
    artwork: result.artwork,
    previewUrl: result.previewUrl,
    source: parsed.platform,
    spotifyUrl: result.spotifyUrl,
    appleUrl: result.appleUrl,
    spotifyUri: (result as ResolvedTrack).spotifyUri,
  }
}

export function LinkConverter({ onAddTrack, isInPlaylist }: LinkConverterProps) {
  const [input, setInput] = useState('')
  const { state, resolve, reset } = useLinkResolver()

  const handleConvert = () => {
    if (!input.trim()) {
      toast.info('Paste a Spotify or Apple Music link first.')
      return
    }
    resolve(input)
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) {
        toast.info('Clipboard is empty.')
        return
      }
      setInput(text.trim())
      resolve(text.trim())
    } catch {
      toast.info('Clipboard unavailable — press Ctrl+V in the field instead.')
    }
  }

  const handleAdd = () => {
    if (state.status !== 'success') return
    const track = toPlaylistTrack(state.parsed, state.result)
    if (!track) return
    const added = onAddTrack(track)
    if (added) {
      toast.success(`Added "${track.title}" to your playlist.`)
    } else {
      toast.info('That track is already in your playlist.')
    }
  }

  return (
    <section id="converter" className="scroll-mt-20">
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-16 sm:pt-24">
        <div className="mx-auto max-w-2xl text-center">
          <BadgeLabel />
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            One link. <span className="text-gradient-brand">Every platform.</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Your friends share Apple Music links. You live on Spotify. Paste any track,
            album or playlist link below — CrossTune resolves it and hands you both doors.
          </p>
        </div>

        <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConvert()}
              placeholder="Paste a Spotify or Apple Music link…"
              className="h-11 border-border/80 bg-card/80 pl-9 pr-4 text-sm"
              aria-label="Music link"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-11 gap-2" onClick={handlePaste}>
              <ClipboardPaste className="size-4" /> Paste
            </Button>
            <Button className="h-11 gap-2" onClick={handleConvert}>
              {state.status === 'loading' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              Convert
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Try an example:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.url}
              onClick={() => {
                setInput(ex.url)
                resolve(ex.url)
              }}
              className="rounded-full border border-border/80 bg-card/60 px-3 py-1 transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {ex.label}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-2xl space-y-4">
          {state.status === 'loading' && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/60 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Resolving link…
            </div>
          )}

          {state.status === 'error' && (
            <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
              <AlertDescription className="flex items-start justify-between gap-3">
                <span>{state.message}</span>
                <button onClick={reset} className="shrink-0 underline underline-offset-2 hover:no-underline">
                  Dismiss
                </button>
              </AlertDescription>
            </Alert>
          )}

          {state.status === 'success' && (
            <ShareCard
              parsed={state.parsed}
              result={state.result}
              onAddToPlaylist={state.result.kind === 'track' ? handleAdd : undefined}
              added={
                state.result.kind === 'track' &&
                isInPlaylist(state.result.title, state.result.artist)
              }
            />
          )}
        </div>
      </div>
    </section>
  )
}

function BadgeLabel() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground">
      <Sparkles className="size-3.5 text-primary" />
      Cross-platform music sharing
      <Music className="size-3.5 text-apple" />
    </span>
  )
}
