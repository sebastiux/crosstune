import { useCallback, useEffect, useState } from 'react'
import type { SpotifyToken, SpotifyUser } from '@/types'
import { envSpotifyClientId } from '@/lib/config'
import {
  buildAuthorizeRequest,
  exchangeCodeForToken,
  getSpotifyProfile,
  refreshAccessToken,
} from '@/lib/spotify'

const CLIENT_ID_KEY = 'crosstune:spotify-client-id'
const TOKEN_KEY = 'crosstune:spotify-token'
const PKCE_KEY = 'crosstune:spotify-pkce'

interface PendingPkce {
  verifier: string
  state: string
  clientId: string
}

function loadToken(): SpotifyToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    return raw ? (JSON.parse(raw) as SpotifyToken) : null
  } catch {
    return null
  }
}

function loadPendingPkce(): PendingPkce | null {
  try {
    const raw = sessionStorage.getItem(PKCE_KEY)
    return raw ? (JSON.parse(raw) as PendingPkce) : null
  } catch {
    return null
  }
}

/** The exact redirect URI registered in the Spotify app settings. */
export function spotifyRedirectUri(): string {
  return `${window.location.origin}/`
}

export function useSpotifyAuth() {
  // Build-time env Client ID wins; a manually stored ID is the dev fallback.
  const [manualClientId, setManualClientId] = useState<string>(() => localStorage.getItem(CLIENT_ID_KEY) ?? '')
  const clientId = envSpotifyClientId || manualClientId
  const [token, setToken] = useState<SpotifyToken | null>(loadToken)
  const [user, setUser] = useState<SpotifyUser | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle the OAuth redirect (?code=...&state=...) once on load.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const errParam = params.get('error')

    // Strip OAuth params from the URL immediately so a re-render can't
    // trigger a second exchange.
    if (code || errParam) {
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (errParam) {
      setError(`Spotify authorization was cancelled or failed (${errParam}).`)
      return
    }
    if (!code || !state) return

    const pending = loadPendingPkce()
    if (!pending) {
      setError('Received a Spotify login code, but no pending login was found. Try connecting again.')
      return
    }
    if (pending.state !== state) {
      sessionStorage.removeItem(PKCE_KEY)
      setError('Spotify login state mismatch — login cancelled for safety. Try again.')
      return
    }

    let cancelled = false
    setBusy(true)
    exchangeCodeForToken(code, pending.verifier, pending.clientId, spotifyRedirectUri())
      .then((t) => {
        if (cancelled) return
        localStorage.setItem(TOKEN_KEY, JSON.stringify(t))
        localStorage.setItem(CLIENT_ID_KEY, pending.clientId)
        setToken(t)
        setManualClientId(pending.clientId)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Spotify login failed.')
      })
      .finally(() => {
        sessionStorage.removeItem(PKCE_KEY)
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Load the profile whenever the token changes.
  useEffect(() => {
    if (!token) {
      setUser(null)
      return
    }
    let cancelled = false
    getSpotifyProfile(token.accessToken)
      .then((p) => {
        if (!cancelled) setUser({ id: p.id, displayName: p.display_name ?? p.id })
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const saveClientId = useCallback((id: string) => {
    setManualClientId(id)
    localStorage.setItem(CLIENT_ID_KEY, id)
  }, [])

  const connect = useCallback(async () => {
    const id = clientId.trim()
    if (!id) {
      setError('Enter your Spotify Client ID first (free at developer.spotify.com).')
      return
    }
    setError(null)
    try {
      const req = await buildAuthorizeRequest(id, spotifyRedirectUri())
      sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier: req.verifier, state: req.state, clientId: id }))
      window.location.href = req.url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not start Spotify login.')
    }
  }, [clientId])

  const disconnect = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  /** Returns a valid access token, refreshing it when expired. */
  const ensureFreshToken = useCallback(async (): Promise<string> => {
    if (!token) throw new Error('Connect Spotify first.')
    if (Date.now() < token.expiresAt - 60_000) return token.accessToken
    const fresh = await refreshAccessToken(token, clientId.trim())
    localStorage.setItem(TOKEN_KEY, JSON.stringify(fresh))
    setToken(fresh)
    return fresh.accessToken
  }, [token, clientId])

  return {
    clientId,
    saveClientId,
    token,
    user,
    busy,
    error,
    connect,
    disconnect,
    ensureFreshToken,
  }
}
