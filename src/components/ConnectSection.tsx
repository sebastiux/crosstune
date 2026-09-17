import { useState } from 'react'
import { toast } from 'sonner'
import {
  CircleCheck,
  Disc3,
  ExternalLink,
  Info,
  Loader2,
  Lock,
  LogOut,
  Music,
  Unplug,
} from 'lucide-react'
import type { usePlaylist } from '@/hooks/usePlaylist'
import type { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import { spotifyRedirectUri } from '@/hooks/useSpotifyAuth'
import { envAppleMusicToken, envSpotifyClientId } from '@/lib/config'
import {
  addTracksToSpotifyPlaylist,
  createSpotifyPlaylist,
  getSpotifyProfile,
  searchSpotifyTrackUri,
} from '@/lib/spotify'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Playlist = ReturnType<typeof usePlaylist>

const APPLE_TOKEN_KEY = 'crosstune:apple-dev-token'

interface ConnectSectionProps {
  playlist: Playlist
  auth: ReturnType<typeof useSpotifyAuth>
}

interface CreateResult {
  url: string
  name: string
  added: number
  missed: string[]
}

export function ConnectSection({ playlist, auth }: ConnectSectionProps) {
  const { tracks } = playlist
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<CreateResult | null>(null)
  const [appleToken, setAppleToken] = useState(() => localStorage.getItem(APPLE_TOKEN_KEY) ?? '')

  // Build-time credentials win; manual fields remain as the dev fallback.
  const spotifyConfigured = envSpotifyClientId !== ''
  const appleConfigured = envAppleMusicToken !== ''

  const spotifyTracks = tracks.filter((t) => t.spotifyUri).length
  const appleTracks = tracks.length - spotifyTracks

  const handleCreatePlaylist = async () => {
    setCreating(true)
    setResult(null)
    try {
      const access = await auth.ensureFreshToken()
      const profile = auth.user ?? (await getSpotifyProfile(access))
      const created = await createSpotifyPlaylist(
        access,
        profile.id,
        'CrossTune Playlist',
        'Built with CrossTune — cross-platform music sharing.',
      )

      const uris: string[] = []
      const missed: string[] = []
      for (const t of tracks) {
        if (t.spotifyUri) {
          uris.push(t.spotifyUri)
          continue
        }
        // Apple-sourced tracks: best-effort match via search with the user's token.
        const uri = await searchSpotifyTrackUri(access, `${t.artist} ${t.title}`)
        if (uri) uris.push(uri)
        else missed.push(`${t.artist} – ${t.title}`)
      }
      const uniqueUris = Array.from(new Set(uris))
      if (uniqueUris.length > 0) {
        await addTracksToSpotifyPlaylist(access, created.id, uniqueUris)
      }
      setResult({ url: created.url, name: created.name, added: uniqueUris.length, missed })
      toast.success(`Created "${created.name}" on Spotify with ${uniqueUris.length} track${uniqueUris.length === 1 ? '' : 's'}.`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not create the Spotify playlist.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <section id="connect" className="scroll-mt-20 border-t border-border/50">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <p className="text-sm font-medium text-primary">Connect & sync</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">Push your playlist to the platforms</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Your playlist lives in the browser until you connect an account. Spotify sync works
          today with a free Client ID; Apple Music playlist creation needs a paid developer
          account, so it is documented but not wired up.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* ── Spotify ─────────────────────────────────────────── */}
          <Card className="border-border/80 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-spotify-soft">
                  <Disc3 className="size-4 text-spotify" />
                </span>
                Spotify
                {auth.user && (
                  <span className="ml-auto flex items-center gap-1 text-xs font-normal text-spotify">
                    <CircleCheck className="size-3.5" /> {auth.user.displayName}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Creates a real playlist on your Spotify account via OAuth (PKCE).
                Tracks shared from Spotify are added as exact matches;
                Apple-sourced tracks are matched by search where possible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!auth.token && (
                <>
                  {spotifyConfigured ? (
                    <div className="flex items-center justify-between rounded-lg border border-spotify/30 bg-spotify-soft px-3 py-2 text-sm">
                      <span className="flex items-center gap-2 text-spotify">
                        <CircleCheck className="size-4" /> Spotify app configured
                      </span>
                      <Badge variant="outline" className="border-spotify/40 text-spotify">build-time Client ID</Badge>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="spotify-client-id">Spotify Client ID</Label>
                      <Input
                        id="spotify-client-id"
                        value={auth.clientId}
                        onChange={(e) => auth.saveClientId(e.target.value)}
                        placeholder="e.g. 7c4ba…"
                        className="border-border/80 bg-background/60 font-mono text-sm"
                        autoComplete="off"
                      />
                      <p className="text-xs text-muted-foreground">
                        Dev fallback — free at{' '}
                        <a
                          href="https://developer.spotify.com/dashboard"
                          target="_blank"
                          rel="noreferrer"
                          className="text-spotify underline underline-offset-2"
                        >
                          developer.spotify.com/dashboard
                        </a>
                        . In production, set <code className="rounded bg-muted px-1 py-0.5 text-foreground">VITE_SPOTIFY_CLIENT_ID</code> at
                        build time instead (see README).
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Add{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-foreground">{spotifyRedirectUri()}</code>{' '}
                    (plus <code className="rounded bg-muted px-1 py-0.5 text-foreground">http://localhost:7100/</code> and your dev
                    port) to your Spotify app's <em>Redirect URIs</em>.
                  </p>
                  <Button className="w-full gap-2 bg-spotify text-black hover:bg-spotify-dark" onClick={auth.connect} disabled={auth.busy}>
                    {auth.busy ? <Loader2 className="size-4 animate-spin" /> : null}
                    Connect Spotify
                  </Button>
                </>
              )}

              {auth.token && (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-spotify/30 bg-spotify-soft px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 text-spotify">
                      <CircleCheck className="size-4" /> Connected{auth.user ? ` as ${auth.user.displayName}` : ''}
                    </span>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={auth.disconnect}>
                      <LogOut className="size-3.5" /> Disconnect
                    </Button>
                  </div>
                  <Button
                    className="w-full gap-2 bg-spotify text-black hover:bg-spotify-dark"
                    onClick={handleCreatePlaylist}
                    disabled={creating || tracks.length === 0}
                  >
                    {creating ? <Loader2 className="size-4 animate-spin" /> : null}
                    Create this playlist on Spotify
                  </Button>
                  {tracks.length === 0 && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="size-3.5 shrink-0" /> Add tracks to your playlist first.
                    </p>
                  )}
                  {tracks.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {spotifyTracks} Spotify track{spotifyTracks === 1 ? '' : 's'} will be added as exact matches
                      {appleTracks > 0
                        ? `; ${appleTracks} Apple-sourced track${appleTracks === 1 ? '' : 's'} will be matched by search where possible.`
                        : '.'}
                    </p>
                  )}
                </>
              )}

              {auth.error && (
                <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
                  <AlertDescription>{auth.error}</AlertDescription>
                </Alert>
              )}

              {result && (
                <Alert className="border-spotify/40 bg-spotify-soft">
                  <CircleCheck className="size-4 text-spotify" />
                  <AlertTitle className="text-spotify">
                    Playlist created with {result.added} track{result.added === 1 ? '' : 's'}
                  </AlertTitle>
                  <AlertDescription className="space-y-1 text-muted-foreground">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-spotify underline underline-offset-2"
                    >
                      Open “{result.name}” on Spotify <ExternalLink className="size-3" />
                    </a>
                    {result.missed.length > 0 && (
                      <p>
                        Couldn’t be matched on Spotify: {result.missed.join('; ')}.
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* ── Apple Music ─────────────────────────────────────── */}
          <Card className="border-border/80 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-apple-soft">
                  <Music className="size-4 text-apple" />
                </span>
                Apple Music
                <span className="ml-auto flex items-center gap-1 text-xs font-normal text-muted-foreground">
                  <Lock className="size-3" /> coming soon
                </span>
              </CardTitle>
              <CardDescription>
                Why there is no “Connect Apple Music” button here — and what would be needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-apple/40 bg-apple-soft">
                <Info className="size-4 text-apple" />
                <AlertTitle className="text-apple">Requires a paid Apple Developer account</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  Creating Apple Music playlists needs MusicKit JS with a developer token signed
                  from an Apple Developer Program membership ($99/yr). That is out of scope for a
                  free, no-backend app — converting links still works without it.
                </AlertDescription>
              </Alert>
              {appleConfigured ? (
                <div className="flex items-center justify-between rounded-lg border border-apple/30 bg-apple-soft px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-apple">
                    <CircleCheck className="size-4" /> Developer token configured
                  </span>
                  <Badge variant="outline" className="border-apple/40 text-apple">build-time</Badge>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="apple-dev-token">Apple Music developer token <span className="text-muted-foreground">(optional / coming soon)</span></Label>
                  <Input
                    id="apple-dev-token"
                    value={appleToken}
                    onChange={(e) => {
                      setAppleToken(e.target.value)
                      localStorage.setItem(APPLE_TOKEN_KEY, e.target.value)
                    }}
                    placeholder="Paste a MusicKit developer token…"
                    className="border-border/80 bg-background/60 font-mono text-sm"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Stored locally only. It is not used yet — playlist creation via MusicKit is not
                    implemented.
                  </p>
                </div>
              )}
              <Button variant="outline" className="w-full gap-2" disabled title="Not implemented">
                <Unplug className="size-4" /> Connect Apple Music (coming soon)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
