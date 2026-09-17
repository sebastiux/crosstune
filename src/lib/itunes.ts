import type { ResolvedMedia } from '@/types'

interface ItunesEntry {
  wrapperType?: string
  kind?: string
  trackName?: string
  collectionName?: string
  artistName?: string
  artworkUrl100?: string
  previewUrl?: string
  trackViewUrl?: string
  collectionViewUrl?: string
}

interface ItunesResponse {
  resultCount: number
  results: ItunesEntry[]
}

async function fetchItunes(url: string): Promise<ItunesResponse> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Apple lookup failed (HTTP ${res.status}). Please try again.`)
  }
  return (await res.json()) as ItunesResponse
}

/** Upgrade iTunes artwork to a larger size. */
function largeArtwork(url100?: string): string | undefined {
  return url100?.replace('100x100bb.jpg', '400x400bb.jpg')
}

/** Where the Spotify button on an Apple-sourced card points. */
export function spotifySearchUrl(query: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`
}

/**
 * Resolves an Apple Music / iTunes numeric ID via the free, no-auth
 * iTunes Lookup API. Album IDs return the album + its songs; a song ID
 * (including album ?i= IDs) returns the track with its 30s preview.
 */
export async function lookupAppleMedia(id: string): Promise<ResolvedMedia> {
  const data = await fetchItunes(
    `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}&entity=song`,
  )
  const target = data.results[0]
  if (data.resultCount === 0 || !target) {
    throw new Error('Nothing found for this Apple Music / iTunes ID. Check the link.')
  }

  if (target.wrapperType === 'track' || target.kind === 'song') {
    const title = target.trackName ?? 'Unknown track'
    const artist = target.artistName ?? 'Unknown artist'
    return {
      kind: 'track',
      title,
      artist,
      album: target.collectionName,
      artwork: largeArtwork(target.artworkUrl100),
      previewUrl: target.previewUrl,
      spotifyUrl: spotifySearchUrl(`${artist} ${title}`),
      appleUrl: target.trackViewUrl ?? `https://music.apple.com/song/${id}`,
    }
  }

  const title = target.collectionName ?? 'Unknown album'
  const artist = target.artistName ?? 'Unknown artist'
  return {
    kind: 'album',
    title,
    artist,
    artwork: largeArtwork(target.artworkUrl100),
    spotifyUrl: spotifySearchUrl(`${artist} ${title}`),
    appleUrl: target.collectionViewUrl ?? `https://music.apple.com/album/${id}`,
  }
}

/** Best-effort exact-match search; returns the trackViewUrl or null. */
export async function searchAppleTrackUrl(query: string): Promise<string | null> {
  try {
    const data = await fetchItunes(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`,
    )
    const match = data.results.find((r) => r.kind === 'song' && r.trackViewUrl)
    return match?.trackViewUrl ?? null
  } catch {
    return null
  }
}

/** Best-effort album search; returns the collectionViewUrl or null. */
export async function searchAppleAlbumUrl(query: string): Promise<string | null> {
  try {
    const data = await fetchItunes(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=5`,
    )
    const match = data.results.find((r) => r.wrapperType === 'collection' && r.collectionViewUrl)
    return match?.collectionViewUrl ?? null
  } catch {
    return null
  }
}

/** Fallback Apple Music web search URL when no exact match is found. */
export function appleWebSearchUrl(query: string): string {
  return `https://music.apple.com/us/search?term=${encodeURIComponent(query)}`
}
