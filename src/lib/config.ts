/**
 * Build-time configuration, injected by Vite via `import.meta.env`.
 *
 * These values are compiled into the public JS bundle by design. A Spotify
 * Client ID is NOT a secret — the OAuth PKCE flow keeps accounts safe without
 * a client secret. Never put a client secret in this (or any) client-side app.
 */

function readEnv(key: 'VITE_SPOTIFY_CLIENT_ID' | 'VITE_APPLE_MUSIC_TOKEN'): string {
  const value = import.meta.env[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** Non-empty when the Spotify app credentials are baked in at build time. */
export const envSpotifyClientId = readEnv('VITE_SPOTIFY_CLIENT_ID')

/** Non-empty when an Apple Music developer token is baked in at build time. */
export const envAppleMusicToken = readEnv('VITE_APPLE_MUSIC_TOKEN')
