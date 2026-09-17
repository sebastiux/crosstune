export type Platform = 'spotify' | 'apple'

export type MediaType = 'track' | 'album' | 'playlist'

export interface ParsedLink {
  platform: Platform
  type: MediaType
  id: string
  /** Canonical https URL for the item. */
  url: string
  /** The raw user input. */
  raw: string
}

/** A track stored in the unified playlist. */
export interface PlaylistTrack {
  key: string
  title: string
  artist: string
  album?: string
  artwork?: string
  /** Apple 30-second preview URL, when available. */
  previewUrl?: string
  /** Which platform the link was shared from. */
  source: Platform
  spotifyUrl?: string
  appleUrl?: string
  /** Real spotify:track: URI — only present for tracks resolved from Spotify links. */
  spotifyUri?: string
  addedAt: number
}

export interface ResolvedTrack {
  kind: 'track'
  title: string
  artist: string
  album?: string
  artwork?: string
  previewUrl?: string
  spotifyEmbedUrl?: string
  spotifyUrl: string
  appleUrl: string
  spotifyUri?: string
}

export interface ResolvedAlbum {
  kind: 'album'
  title: string
  artist: string
  artwork?: string
  spotifyEmbedUrl?: string
  spotifyUrl: string
  appleUrl: string
}

export interface ResolvedPlaylist {
  kind: 'playlist'
  title: string
  owner?: string
  artwork?: string
  spotifyEmbedUrl: string
  spotifyUrl: string
}

export type ResolvedMedia = ResolvedTrack | ResolvedAlbum | ResolvedPlaylist

export interface SpotifyToken {
  accessToken: string
  refreshToken: string
  /** Epoch ms when the access token expires. */
  expiresAt: number
}

export interface SpotifyUser {
  id: string
  displayName: string
}
