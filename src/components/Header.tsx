import { AudioLines } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface HeaderProps {
  spotifyConnected: boolean
  spotifyConfigured: boolean
  appleConfigured: boolean
  trackCount: number
}

function StatusBadge({
  active,
  label,
  activeText,
  activeClass,
}: {
  active: boolean
  label: string
  activeText: string
  activeClass: string
}) {
  return (
    <Badge variant="outline" className={cn('gap-1.5 text-muted-foreground', active && activeClass)}>
      <span className={cn('size-1.5 rounded-full', active ? 'bg-current' : 'bg-muted-foreground/50')} />
      {label}
      {active ? activeText : 'offline'}
    </Badge>
  )
}

export function Header({ spotifyConnected, spotifyConfigured, appleConfigured, trackCount }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <a href="#converter" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-spotify to-apple text-black">
            <AudioLines className="size-4.5" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            Cross<span className="text-gradient-brand">Tune</span>
          </span>
        </a>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <a href="#converter" className="transition-colors hover:text-foreground">Convert</a>
          <a href="#playlist" className="transition-colors hover:text-foreground">
            Playlist{trackCount > 0 ? ` (${trackCount})` : ''}
          </a>
          <a href="#connect" className="transition-colors hover:text-foreground">Connect</a>
        </nav>

        <div className="flex items-center gap-2">
          <StatusBadge
            active={spotifyConnected || spotifyConfigured}
            label="Spotify"
            activeText={spotifyConnected ? 'connected' : 'configured'}
            activeClass="border-spotify/40 bg-spotify-soft text-spotify"
          />
          <StatusBadge
            active={appleConfigured}
            label="Apple"
            activeText="configured"
            activeClass="border-apple/40 bg-apple-soft text-apple"
          />
        </div>
      </div>
    </header>
  )
}
