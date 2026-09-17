import { useCallback, useEffect, useState } from 'react'
import type { PlaylistTrack } from '@/types'

const STORAGE_KEY = 'crosstune:playlist'

function loadPlaylist(): PlaylistTrack[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PlaylistTrack[]) : []
  } catch {
    return []
  }
}

function newKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export type NewPlaylistTrack = Omit<PlaylistTrack, 'key' | 'addedAt'>

export function usePlaylist() {
  const [tracks, setTracks] = useState<PlaylistTrack[]>(loadPlaylist)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks))
  }, [tracks])

  const isDuplicate = useCallback((candidate: NewPlaylistTrack) => {
    return (list: PlaylistTrack[]) =>
      list.some((t) => {
        if (candidate.spotifyUri && t.spotifyUri) return t.spotifyUri === candidate.spotifyUri
        return (
          t.title.toLowerCase() === candidate.title.toLowerCase() &&
          t.artist.toLowerCase() === candidate.artist.toLowerCase()
        )
      })
  }, [])

  /** Returns true when the track was actually added (false when a duplicate). */
  const addTrack = useCallback(
    (track: NewPlaylistTrack): boolean => {
      let added = false
      setTracks((prev) => {
        if (isDuplicate(track)(prev)) return prev
        added = true
        return [...prev, { ...track, key: newKey(), addedAt: Date.now() }]
      })
      return added
    },
    [isDuplicate],
  )

  const removeTrack = useCallback((key: string) => {
    setTracks((prev) => prev.filter((t) => t.key !== key))
  }, [])

  const clearPlaylist = useCallback(() => setTracks([]), [])

  const contains = useCallback(
    (title: string, artist: string): boolean =>
      tracks.some(
        (t) =>
          t.title.toLowerCase() === title.toLowerCase() &&
          t.artist.toLowerCase() === artist.toLowerCase(),
      ),
    [tracks],
  )

  const toPlainText = useCallback(
    () =>
      tracks
        .map((t, i) => `${i + 1}. ${t.artist} – ${t.title}`)
        .join('\n'),
    [tracks],
  )

  const exportJson = useCallback(() => {
    const payload = {
      app: 'CrossTune',
      exportedAt: new Date().toISOString(),
      tracks,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'crosstune-playlist.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [tracks])

  return { tracks, addTrack, removeTrack, clearPlaylist, contains, toPlainText, exportJson }
}
