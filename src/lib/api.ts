import type { Platform } from '@/types'

export interface ShareRecord {
  id: number
  title: string
  artist: string
  album?: string | null
  sourcePlatform: Platform
  spotifyUrl?: string | null
  appleUrl?: string | null
  artworkUrl?: string | null
  createdAt: string
}

export interface NewShare {
  title: string
  artist: string
  album?: string
  sourcePlatform: Platform
  spotifyUrl?: string
  appleUrl?: string
  artworkUrl?: string
}

const TIMEOUT_MS = 3000

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(path, { ...init, signal: controller.signal })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    // Network failure, timeout, or backend offline — degrade gracefully.
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Fetches the most recent shares. Returns [] when the backend is unavailable. */
export async function fetchShares(limit = 50): Promise<ShareRecord[]> {
  const data = await request<ShareRecord[]>(`/api/shares?limit=${limit}`)
  return Array.isArray(data) ? data : []
}

/**
 * Logs a successfully resolved share. Fire-and-forget: never throws,
 * never blocks the UI.
 */
export function logShare(share: NewShare): void {
  void request('/api/shares', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(share),
  })
}
