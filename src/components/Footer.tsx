import { AudioLines } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-10 text-center">
        <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-spotify to-apple text-black">
          <AudioLines className="size-4" />
        </span>
        <p className="text-sm font-semibold">
          Cross<span className="text-gradient-brand">Tune</span>
        </p>
        <p className="max-w-md text-xs text-muted-foreground">
          Link conversion uses the free iTunes Lookup/Search APIs and Spotify oEmbed —
          no accounts required. Playlists are stored locally in your browser.
          Spotify is a trademark of Spotify AB; Apple Music is a trademark of Apple Inc.
          This app is not affiliated with either.
        </p>
      </div>
    </footer>
  )
}
