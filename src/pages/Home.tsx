import { usePlaylist } from '@/hooks/usePlaylist'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import { envAppleMusicToken, envSpotifyClientId } from '@/lib/config'
import { Header } from '@/components/Header'
import { LinkConverter } from '@/components/LinkConverter'
import { PlaylistBuilder } from '@/components/PlaylistBuilder'
import { ConnectSection } from '@/components/ConnectSection'
import { Footer } from '@/components/Footer'

const APPLE_TOKEN_KEY = 'crosstune:apple-dev-token'

export default function Home() {
  const playlist = usePlaylist()
  const auth = useSpotifyAuth()
  const appleConfigured =
    envAppleMusicToken !== '' || Boolean(localStorage.getItem(APPLE_TOKEN_KEY))

  return (
    <div className="min-h-screen">
      <Header
        spotifyConnected={auth.token !== null}
        spotifyConfigured={envSpotifyClientId !== ''}
        appleConfigured={appleConfigured}
        trackCount={playlist.tracks.length}
      />
      <main>
        <LinkConverter onAddTrack={playlist.addTrack} isInPlaylist={playlist.contains} />
        <PlaylistBuilder playlist={playlist} />
        <ConnectSection playlist={playlist} auth={auth} />
      </main>
      <Footer />
    </div>
  )
}
