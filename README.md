# CrossTune

Share music across Spotify and Apple Music. Paste a link from either platform, get a
share card that works for everyone, and build a unified playlist you can push to Spotify.

## Features

- **Link converter** — paste an `open.spotify.com` or `music.apple.com` song/album link
  (or a `spotify:track:` URI) and get artwork, a 30s preview, and Open-in-platform buttons
  for both services.
- **Unified playlist** — collect tracks from both platforms, persisted in `localStorage`.
  Copy as text or export as JSON.
- **Spotify sync** — connect your Spotify account (OAuth PKCE, client-side only) and
  create the playlist on Spotify with one click.

## Local development

```bash
npm install
npm run dev        # dev server on http://localhost:7100
npm run build      # production build → dist/
```

## Configuration

CrossTune reads its API credentials at **build time** (Vite inlines `VITE_*`
variables into the static bundle):

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SPOTIFY_CLIENT_ID` | For Spotify sync | OAuth PKCE Client ID from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) (free) |
| `VITE_APPLE_MUSIC_TOKEN` | Optional | Apple Music developer token (MusicKit playlist creation is "coming soon"; the token is currently unused) |

**Local development:** copy `.env.example` to `.env` and fill in the values
(both may stay empty — the app then falls back to a manual Client ID field
stored in your browser's localStorage). `.env` is git- and docker-ignored.

**Docker:** pass the values as build args so Vite inlines them during
`npm run build`:

```bash
docker build \
  --build-arg VITE_SPOTIFY_CLIENT_ID=your_client_id \
  --build-arg VITE_APPLE_MUSIC_TOKEN=your_token \
  -t crosstune .
```

**Railway:** add `VITE_SPOTIFY_CLIENT_ID` (and optionally
`VITE_APPLE_MUSIC_TOKEN`) as service variables — Railway passes them to the
Docker build as build args, and the Dockerfile's `ARG`/`ENV` lines make them
visible to `npm run build`. Rebuild/redeploy after changing them.

> **Security note:** this is a client-side SPA, so these values are embedded
> in the public JavaScript bundle by design. That is safe for the Spotify
> Client ID because the OAuth PKCE flow never uses a client secret. Never put
> a client secret (or any other secret) in this app — it cannot be hidden
> from visitors.

## Deploy to Railway

The repo includes a multi-stage `Dockerfile` (Node build → nginx serve) that Railway
auto-detects. No extra Railway config is needed:

1. Push this directory (`app/`) to a GitHub repo.
2. In Railway: **New Project → Deploy from GitHub repo** → pick the repo. Railway builds
   the Dockerfile and serves the SPA on the generated domain.
3. The nginx template listens on the `$PORT` Railway provides and falls back to
   `index.html` for client-side routes.

### After deploying — Spotify settings

The app uses your current origin as the OAuth redirect URI, so once Railway gives you a
domain (e.g. `https://crosstune.up.railway.app`), add that exact URL to your Spotify
app's **Redirect URIs** in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
Keep `http://localhost:7100/` there for local development.

### Notes

- Apple Music playlist creation requires a paid Apple Developer account + MusicKit JS
  developer token — the UI slot for it is labeled "coming soon".
- No server-side secrets exist in this app; everything runs in the browser.
