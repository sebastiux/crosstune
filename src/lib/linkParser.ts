import type { MediaType, ParsedLink } from '@/types'

const SPOTIFY_URI_RE = /^spotify:(track|album|playlist):([A-Za-z0-9]+)$/i
const SPOTIFY_PATH_RE = /\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]+)/i
const NUMERIC_RE = /^\d+$/

function spotifyLink(type: MediaType, id: string, raw: string): ParsedLink {
  return {
    platform: 'spotify',
    type,
    id,
    url: `https://open.spotify.com/${type}/${id}`,
    raw,
  }
}

function appleLink(type: MediaType, id: string, raw: string): ParsedLink {
  return {
    platform: 'apple',
    type,
    id,
    url: `https://music.apple.com/${type === 'track' ? 'song' : 'album'}/${id}`,
    raw,
  }
}

/**
 * Detects the platform and media type from a pasted Spotify or Apple Music
 * link / URI. Returns null when the input is not recognizable.
 */
export function parseLink(input: string): ParsedLink | null {
  const raw = input.trim()
  if (!raw) return null

  // spotify:track:4uLU6hMCjMI75M1A2tKUQC
  const uriMatch = raw.match(SPOTIFY_URI_RE)
  if (uriMatch) {
    const type = uriMatch[1].toLowerCase() as MediaType
    return spotifyLink(type, uriMatch[2], raw)
  }

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase()

  // https://open.spotify.com/track/ID (optional /intl-xx/ segment)
  if (host === 'open.spotify.com') {
    const match = url.pathname.match(SPOTIFY_PATH_RE)
    if (match) {
      const type = match[1].toLowerCase() as MediaType
      return spotifyLink(type, match[2], raw)
    }
    return null
  }

  // https://music.apple.com/us/album/name/123456?i=789
  // https://itunes.apple.com/us/album/name/123456
  if (host === 'music.apple.com' || host === 'itunes.apple.com') {
    const segments = url.pathname.split('/').filter(Boolean)
    const kindIndex = segments.findIndex((s) => s === 'song' || s === 'album')
    if (kindIndex === -1) return null

    const last = segments[segments.length - 1] ?? ''
    const trackParam = url.searchParams.get('i')

    if (segments[kindIndex] === 'song' && NUMERIC_RE.test(last)) {
      return appleLink('track', last, raw)
    }
    if (segments[kindIndex] === 'album') {
      // ?i= points at a specific song inside the album
      if (trackParam && NUMERIC_RE.test(trackParam)) {
        return appleLink('track', trackParam, raw)
      }
      if (NUMERIC_RE.test(last)) {
        return appleLink('album', last, raw)
      }
    }
    return null
  }

  return null
}
