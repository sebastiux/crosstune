import { Check, Disc3, ExternalLink, ListMusic, Music, Plus } from 'lucide-react'
import type { ParsedLink, Platform, ResolvedMedia } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ShareCardProps {
  parsed: ParsedLink
  result: ResolvedMedia
  onAddToPlaylist?: () => void
  added?: boolean
}

function PlatformBadge({ platform }: { platform: Platform }) {
  return platform === 'spotify' ? (
    <Badge className="gap-1 border-transparent bg-spotify-soft text-spotify hover:bg-spotify-soft">
      <Disc3 className="size-3" /> Spotify
    </Badge>
  ) : (
    <Badge className="gap-1 border-transparent bg-apple-soft text-apple hover:bg-apple-soft">
      <Music className="size-3" /> Apple Music
    </Badge>
  )
}

function Artwork({ url, alt, platform }: { url?: string; alt: string; platform: Platform }) {
  if (!url) {
    return (
      <div
        className={cn(
          'flex size-28 shrink-0 items-center justify-center rounded-xl sm:size-32',
          platform === 'spotify' ? 'bg-spotify-soft text-spotify' : 'bg-apple-soft text-apple',
        )}
      >
        <Music className="size-10" />
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={alt}
      className="size-28 shrink-0 rounded-xl object-cover shadow-lg shadow-black/40 sm:size-32"
    />
  )
}

function OpenButtons({
  spotifyUrl,
  appleUrl,
}: {
  spotifyUrl: string
  appleUrl?: string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" className="gap-2 bg-spotify text-black hover:bg-spotify-dark" asChild>
        <a href={spotifyUrl} target="_blank" rel="noreferrer">
          <ExternalLink className="size-3.5" /> Open in Spotify
        </a>
      </Button>
      {appleUrl && (
        <Button
          size="sm"
          variant="outline"
          className="gap-2 border-apple/40 bg-apple-soft text-apple hover:bg-apple/20 hover:text-apple"
          asChild
        >
          <a href={appleUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="size-3.5" /> Open in Apple Music
          </a>
        </Button>
      )}
    </div>
  )
}

export function ShareCard({ parsed, result, onAddToPlaylist, added }: ShareCardProps) {
  const embedHeight = result.kind === 'track' ? 152 : result.kind === 'album' ? 352 : 380

  return (
    <Card className="overflow-hidden border-border/80 bg-card/80 shadow-xl shadow-black/30">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <Artwork url={result.artwork} alt={result.title} platform={parsed.platform} />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <PlatformBadge platform={parsed.platform} />
              <Badge variant="outline" className="text-muted-foreground capitalize">{parsed.type}</Badge>
            </div>
            <div>
              <h3 className="truncate text-xl font-bold">{result.title}</h3>
              <p className="truncate text-sm text-muted-foreground">
                {result.kind === 'playlist' ? `by ${result.owner ?? 'unknown'}` : result.artist}
                {result.kind === 'track' && result.album ? ` · ${result.album}` : ''}
              </p>
            </div>

            {result.kind === 'track' && result.previewUrl && (
              <audio controls preload="none" src={result.previewUrl} className="h-9 w-full max-w-sm" />
            )}

            <div className="flex flex-wrap items-center gap-2">
              <OpenButtons
                spotifyUrl={result.spotifyUrl}
                appleUrl={result.kind === 'playlist' ? undefined : result.appleUrl}
              />
              {result.kind === 'track' && onAddToPlaylist && (
                <Button
                  size="sm"
                  variant={added ? 'secondary' : 'default'}
                  className={cn('gap-2', !added && 'bg-primary text-primary-foreground hover:bg-primary/90')}
                  onClick={onAddToPlaylist}
                  disabled={added}
                >
                  {added ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                  {added ? 'In your playlist' : 'Add to playlist'}
                </Button>
              )}
            </div>

            {result.kind !== 'track' && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ListMusic className="size-3.5 shrink-0" />
                {result.kind === 'playlist'
                  ? 'Shared playlists open as a whole above — convert track-by-track in the Playlist section below.'
                  : 'Whole albums can be opened on either platform; add individual tracks to build a unified playlist.'}
              </p>
            )}
          </div>
        </div>

        {result.spotifyEmbedUrl && (
          <iframe
            title={`Spotify player — ${result.title}`}
            src={result.spotifyEmbedUrl}
            width="100%"
            height={embedHeight}
            frameBorder={0}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="mt-5 rounded-xl border-0"
          />
        )}
      </CardContent>
    </Card>
  )
}
