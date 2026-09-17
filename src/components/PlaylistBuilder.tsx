import { toast } from 'sonner'
import {
  Copy,
  Disc3,
  Download,
  ExternalLink,
  ListMusic,
  Music,
  Trash2,
} from 'lucide-react'
import type { PlaylistTrack } from '@/types'
import type { usePlaylist } from '@/hooks/usePlaylist'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Playlist = ReturnType<typeof usePlaylist>

interface PlaylistBuilderProps {
  playlist: Playlist
}

function SourceBadge({ source }: { source: PlaylistTrack['source'] }) {
  return source === 'spotify' ? (
    <Badge className="gap-1 border-transparent bg-spotify-soft text-spotify hover:bg-spotify-soft">
      <Disc3 className="size-3" /> Spotify
    </Badge>
  ) : (
    <Badge className="gap-1 border-transparent bg-apple-soft text-apple hover:bg-apple-soft">
      <Music className="size-3" /> Apple Music
    </Badge>
  )
}

export function PlaylistBuilder({ playlist }: PlaylistBuilderProps) {
  const { tracks, removeTrack, clearPlaylist, toPlainText, exportJson } = playlist

  const handleCopy = async () => {
    if (tracks.length === 0) return
    try {
      await navigator.clipboard.writeText(toPlainText())
      toast.success(`Copied ${tracks.length} track${tracks.length === 1 ? '' : 's'} as text.`)
    } catch {
      toast.error('Could not access the clipboard.')
    }
  }

  return (
    <section id="playlist" className="scroll-mt-20 border-t border-border/50">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Unified playlist</p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight">
              Your cross-platform mix
              {tracks.length > 0 && (
                <span className="ml-2 align-middle text-base font-medium text-muted-foreground">
                  {tracks.length} track{tracks.length === 1 ? '' : 's'}
                </span>
              )}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Saved in your browser and survives reloads. Syncing it to both platforms
              requires connecting your accounts below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleCopy} disabled={tracks.length === 0}>
              <Copy className="size-3.5" /> Copy as text
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={exportJson} disabled={tracks.length === 0}>
              <Download className="size-3.5" /> Export JSON
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" disabled={tracks.length === 0}>
                  <Trash2 className="size-3.5" /> Clear
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear the whole playlist?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes all {tracks.length} track{tracks.length === 1 ? '' : 's'} from
                    local storage. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      clearPlaylist()
                      toast.success('Playlist cleared.')
                    }}
                  >
                    Clear playlist
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {tracks.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/80 bg-card/40 py-16 text-center">
            <ListMusic className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Nothing here yet — convert a link above and hit “Add to playlist”.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-2">
            {tracks.map((track, index) => (
              <Card key={track.key} className="border-border/60 bg-card/70 transition-colors hover:border-border">
                <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                  <span className="hidden w-6 text-right font-mono text-xs text-muted-foreground sm:block">
                    {index + 1}
                  </span>
                  {track.artwork ? (
                    <img src={track.artwork} alt="" className="size-11 shrink-0 rounded-md object-cover" />
                  ) : (
                    <div
                      className={cn(
                        'flex size-11 shrink-0 items-center justify-center rounded-md',
                        track.source === 'spotify' ? 'bg-spotify-soft text-spotify' : 'bg-apple-soft text-apple',
                      )}
                    >
                      <Music className="size-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{track.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {track.artist}
                      {track.album ? ` · ${track.album}` : ''}
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <SourceBadge source={track.source} />
                  </div>
                  <div className="flex items-center gap-1">
                    {track.spotifyUrl && (
                      <Button variant="ghost" size="icon" className="size-8 text-spotify hover:text-spotify" asChild>
                        <a href={track.spotifyUrl} target="_blank" rel="noreferrer" title="Open in Spotify">
                          <ExternalLink className="size-4" />
                        </a>
                      </Button>
                    )}
                    {track.appleUrl && (
                      <Button variant="ghost" size="icon" className="size-8 text-apple hover:text-apple" asChild>
                        <a href={track.appleUrl} target="_blank" rel="noreferrer" title="Open in Apple Music">
                          <ExternalLink className="size-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeTrack(track.key)}
                      title="Remove from playlist"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
