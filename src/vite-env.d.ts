/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Build-time Spotify Client ID (public — PKCE, no client secret). */
  readonly VITE_SPOTIFY_CLIENT_ID: string
  /** Build-time Apple Music developer token (optional / coming soon). */
  readonly VITE_APPLE_MUSIC_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
