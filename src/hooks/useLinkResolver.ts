import { useCallback, useState } from 'react'
import type { ParsedLink, ResolvedMedia } from '@/types'
import { parseLink } from '@/lib/linkParser'
import { lookupAppleMedia } from '@/lib/itunes'
import { resolveSpotifyLink } from '@/lib/spotify'
import { logShare } from '@/lib/api'

/** Fire-and-forget POST of a successfully resolved share; errors are swallowed. */
function logResolvedShare(parsed: ParsedLink, result: ResolvedMedia) {
  logShare({
    title: result.title,
    artist: result.kind === 'playlist' ? result.owner ?? 'Unknown curator' : result.artist,
    album: result.kind === 'track' ? result.album : undefined,
    sourcePlatform: parsed.platform,
    spotifyUrl: result.spotifyUrl,
    appleUrl: result.kind === 'playlist' ? undefined : result.appleUrl,
    artworkUrl: result.artwork,
  })
}

export type ResolveState =
  | { status: 'idle' }
  | { status: 'loading'; raw: string }
  | { status: 'success'; parsed: ParsedLink; result: ResolvedMedia }
  | { status: 'error'; message: string }

export function useLinkResolver() {
  const [state, setState] = useState<ResolveState>({ status: 'idle' })

  const resolve = useCallback(async (input: string) => {
    const parsed = parseLink(input)
    if (!parsed) {
      setState({
        status: 'error',
        message:
          'That does not look like a Spotify or Apple Music link. ' +
          'Try e.g. open.spotify.com/track/… , spotify:track:… or music.apple.com/…/song/…',
      })
      return
    }
    setState({ status: 'loading', raw: input.trim() })
    try {
      const result =
        parsed.platform === 'apple'
          ? await lookupAppleMedia(parsed.id)
          : await resolveSpotifyLink(parsed.type, parsed.id)
      setState({ status: 'success', parsed, result })
      logResolvedShare(parsed, result)
    } catch (e: unknown) {
      setState({
        status: 'error',
        message: e instanceof Error ? e.message : 'Something went wrong while resolving the link.',
      })
    }
  }, [])

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  return { state, resolve, reset }
}
