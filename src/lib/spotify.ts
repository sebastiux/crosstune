import type { MediaType, ResolvedMedia, SpotifyToken } from '@/types'
import {
  appleWebSearchUrl,
  searchAppleAlbumUrl,
  searchAppleTrackUrl,
} from './itunes'

const AUTH_SCOPES = ['playlist-modify-public', 'playlist-modify-private']

// ─────────────────────────────────────────────────────────────────────────────
// Public, no-auth resolution (oEmbed + iTunes search)
// ─────────────────────────────────────────────────────────────────────────────

interface OembedResponse {
  title?: string
  author_name?: string
  thumbnail_url?: string
}

export function canonicalSpotifyUrl(type: MediaType, id: string): string {
  return `https://open.spotify.com/${type}/${id}`
}

export function spotifyEmbedUrl(type: MediaType, id: string): string {
  return `https://open.spotify.com/embed/${type}/${id}`
}

async function fetchOembed(url: string): Promise<OembedResponse> {
  const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? 'That Spotify item was not found. Check the link.'
        : `Spotify lookup failed (HTTP ${res.status}). Please try again.`,
    )
  }
  return (await res.json()) as OembedResponse
}

/**
 * Resolves a Spotify track/album/playlist ID using the free oEmbed endpoint.
 * The matching Apple Music link is found via the iTunes Search API.
 */
export async function resolveSpotifyLink(type: MediaType, id: string): Promise<ResolvedMedia> {
  const url = canonicalSpotifyUrl(type, id)
  const meta = await fetchOembed(url)
  const title = meta.title ?? 'Unknown title'
  const artist = meta.author_name ?? 'Unknown artist'
  const embed = spotifyEmbedUrl(type, id)

  if (type === 'playlist') {
    // oEmbed gives limited info for playlists — track-by-track conversion
    // lives in the Playlist section.
    return {
      kind: 'playlist',
      title,
      owner: artist,
      artwork: meta.thumbnail_url,
      spotifyEmbedUrl: embed,
      spotifyUrl: url,
    }
  }

  const query = `${artist} ${title}`
  if (type === 'album') {
    const appleUrl =
      (await searchAppleAlbumUrl(query)) ?? appleWebSearchUrl(query)
    return {
      kind: 'album',
      title,
      artist,
      artwork: meta.thumbnail_url,
      spotifyEmbedUrl: embed,
      spotifyUrl: url,
      appleUrl,
    }
  }

  const appleUrl = (await searchAppleTrackUrl(query)) ?? appleWebSearchUrl(query)
  return {
    kind: 'track',
    title,
    artist,
    artwork: meta.thumbnail_url,
    spotifyEmbedUrl: embed,
    spotifyUrl: url,
    appleUrl,
    spotifyUri: `spotify:track:${id}`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OAuth PKCE (Web Crypto, no dependencies)
// ─────────────────────────────────────────────────────────────────────────────

const PKCE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

function randomString(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const b of bytes) out += PKCE_CHARS[b % PKCE_CHARS.length]
  return out
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function generateCodeVerifier(): string {
  return randomString(64)
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64UrlEncode(new Uint8Array(digest))
}

export interface AuthorizeRequest {
  url: string
  state: string
  verifier: string
}

export async function buildAuthorizeRequest(
  clientId: string,
  redirectUri: string,
): Promise<AuthorizeRequest> {
  const verifier = generateCodeVerifier()
  const state = randomString(24)
  const challenge = await generateCodeChallenge(verifier)
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: AUTH_SCOPES.join(' '),
    state,
  })
  return {
    url: `https://accounts.spotify.com/authorize?${params.toString()}`,
    state,
    verifier,
  }
}

interface TokenSuccess {
  access_token: string
  refresh_token?: string
  expires_in?: number
}

async function postToken(body: URLSearchParams): Promise<TokenSuccess> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await res.json()) as TokenSuccess & {
    error?: string
    error_description?: string
  }
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? `Spotify token request failed (HTTP ${res.status}).`)
  }
  return data
}

export async function exchangeCodeForToken(
  code: string,
  verifier: string,
  clientId: string,
  redirectUri: string,
): Promise<SpotifyToken> {
  const data = await postToken(
    new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  )
  if (!data.refresh_token) {
    throw new Error('Spotify did not return a refresh token — please reconnect.')
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  }
}

export async function refreshAccessToken(token: SpotifyToken, clientId: string): Promise<SpotifyToken> {
  const data = await postToken(
    new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
    }),
  )
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? token.refreshToken,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Web API helpers (need a user access token)
// ─────────────────────────────────────────────────────────────────────────────

async function spotifyApi(accessToken: string, path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    let detail = ''
    try {
      const data = (await res.json()) as { error?: { message?: string } }
      detail = data.error?.message ?? ''
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(detail || `Spotify API request failed (HTTP ${res.status}).`)
  }
  return res
}

export async function getSpotifyProfile(
  accessToken: string,
): Promise<{ id: string; display_name?: string }> {
  const res = await spotifyApi(accessToken, '/me')
  return (await res.json()) as { id: string; display_name?: string }
}

export async function createSpotifyPlaylist(
  accessToken: string,
  userId: string,
  name: string,
  description: string,
): Promise<{ id: string; name: string; url: string }> {
  const res = await spotifyApi(accessToken, `/users/${encodeURIComponent(userId)}/playlists`, {
    method: 'POST',
    body: JSON.stringify({ name, description, public: false }),
  })
  const data = (await res.json()) as { id: string; name: string; external_urls: { spotify: string } }
  return { id: data.id, name: data.name, url: data.external_urls.spotify }
}

export async function addTracksToSpotifyPlaylist(
  accessToken: string,
  playlistId: string,
  uris: string[],
): Promise<void> {
  await spotifyApi(accessToken, `/playlists/${encodeURIComponent(playlistId)}/tracks`, {
    method: 'POST',
    body: JSON.stringify({ uris }),
  })
}

/** Best-effort track search with the user's token; returns a spotify:track URI or null. */
export async function searchSpotifyTrackUri(
  accessToken: string,
  query: string,
): Promise<string | null> {
  try {
    const res = await spotifyApi(
      accessToken,
      `/search?type=track&limit=1&q=${encodeURIComponent(query)}`,
    )
    const data = (await res.json()) as { tracks?: { items?: Array<{ uri?: string }> } }
    return data.tracks?.items?.[0]?.uri ?? null
  } catch {
    return null
  }
}
