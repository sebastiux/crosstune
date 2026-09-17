import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Disc3, ExternalLink, Music, RefreshCw, Share2, Unplug } from 'lucide-react'
import type { Platform } from '@/types'
import { fetchShares } from '@/lib/api'
import type { ShareRecord } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const REFETCH_INTERVAL_MS = 30_000

type FeedState =
  | { status: 'loading' }
  | { status: 'offline' }
  | { status: 'ready'; shares: ShareRecord[] }

function SourceBadge({ platform }: { platform: Platform }) {
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

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch {
    return ''
  }
}

function ShareTile({ share }: { share: ShareRecord }) {
  return (
    <Card className="overflow-hidden border-border/80 bg-card/80 transition-colors hover:border-primary/40">
      <CardContent className="flex gap-3 p-3">
        {share.artworkUrl ? (
          <img
            src={share.artworkUrl}
            alt={share.title}
            loading="lazy"
            className="size-14 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div
            className={cn(
              'flex size-14 shrink-0 items-center justify-center rounded-lg',
              share.sourcePlatform === 'spotify'
                ? 'bg-spotify-soft text-spotify'
                : 'bg-apple-soft text-apple',
            )}
          >
            <Music className="size-6" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <SourceBadge platform={share.sourcePlatform} />
            {share.createdAt && (
              <span className="text-[11px] text-muted-foreground">{relativeTime(share.createdAt)}</span>
            )}
          </div>
          <h4 className="truncate text-sm font-semibold leading-tight">{share.title}</h4>
          <p className="truncate text-xs text-muted-foreground">
            {share.artist}
            {share.album ? ` · ${share.album}` : ''}
          </p>
          {(share.spotifyUrl || share.appleUrl) && (
            <div className="flex gap-2 pt-0.5">
              {share.spotifyUrl && (
                <a
                  href={share.spotifyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-spotify hover:underline"
                >
                  <ExternalLink className="size-3" /> Spotify
                </a>
              )}
              {share.appleUrl && (
                <a
                  href={share.appleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-apple hover:underline"
                >
                  <ExternalLink className="size-3" /> Apple Music
                </a>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonTile() {
  return (
    <div className="flex gap-3 rounded-xl border border-border/60 bg-card/60 p-3">
      <div className="size-14 shrink-0 animate-pulse rounded-lg bg-muted" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

function OfflineCard() {
  return (
    <Card className="border-dashed border-border/80 bg-card/60">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <Unplug className="size-8 text-muted-foreground" />
        <div>
          <p className="font-medium">Connect the backend to see what friends have shared</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The feed needs a database. On Railway: <span className="font-mono">New → Database → PostgreSQL</span>,
            then add a <span className="font-mono">DATABASE_URL</span> variable to the app service.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function RecentShares() {
  const [state, setState] = useState<FeedState>({ status: 'loading' })
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    const shares = await fetchShares()
    if (shares.length === 0) {
      // Either genuinely empty or the backend is offline — treat as offline/empty.
      setState({ status: 'offline' })
    } else {
      setState({ status: 'ready', shares })
    }
    setRefreshing(false)
  }, [])

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), REFETCH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [load])

  return (
    <section id="recent-shares" className="scroll-mt-20">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Share2 className="size-4 text-primary" />
            <h2 className="text-lg font-bold">Recently shared</h2>
          </div>
          {state.status === 'ready' && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => void load(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} /> Refresh
            </Button>
          )}
        </div>

        <div className="mt-4">
          {state.status === 'loading' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <SkeletonTile />
              <SkeletonTile />
              <SkeletonTile />
              <SkeletonTile />
            </div>
          )}
          {state.status === 'offline' && <OfflineCard />}
          {state.status === 'ready' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {state.shares.map((share) => (
                <ShareTile key={share.id} share={share} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
