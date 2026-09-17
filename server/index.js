import express from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getPool, initDb, closeDb } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(express.json())

const MAX_LEN = 500

function str(v) {
  return typeof v === 'string' ? v : undefined
}

function cap(v) {
  const s = str(v)
  if (s === undefined) return null
  const t = s.trim()
  return t === '' ? null : t.slice(0, MAX_LEN)
}

/** Ensures the pool is up; returns it or null. Retries lazily per request when down. */
async function requireDb(res) {
  const p = getPool() ?? (await initDb())
  if (!p) {
    res.status(503).json({ error: 'database not configured' })
    return null
  }
  return p
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: getPool() !== null })
})

app.post('/api/shares', async (req, res) => {
  const pool = await requireDb(res)
  if (!pool) return

  const body = req.body ?? {}
  const title = cap(body.title)
  const artist = cap(body.artist)
  const album = cap(body.album)
  const sourcePlatform = str(body.sourcePlatform)
  const spotifyUrl = cap(body.spotifyUrl)
  const appleUrl = cap(body.appleUrl)
  const artworkUrl = cap(body.artworkUrl)

  if (!title || !artist) {
    return res.status(400).json({ error: 'title and artist are required' })
  }
  if (sourcePlatform !== 'spotify' && sourcePlatform !== 'apple') {
    return res.status(400).json({ error: 'sourcePlatform must be "spotify" or "apple"' })
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO shares (title, artist, album, source_platform, spotify_url, apple_url, artwork_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, artist, album, source_platform AS "sourcePlatform",
                 spotify_url AS "spotifyUrl", apple_url AS "appleUrl",
                 artwork_url AS "artworkUrl", created_at AS "createdAt"`,
      [title, artist, album, sourcePlatform, spotifyUrl, appleUrl, artworkUrl],
    )
    res.status(201).json(rows[0])
  } catch (err) {
    console.error('[api] failed to insert share:', err.message)
    res.status(500).json({ error: 'failed to save share' })
  }
})

app.get('/api/shares', async (req, res) => {
  const pool = await requireDb(res)
  if (!pool) return

  const rawLimit = Number.parseInt(req.query.limit, 10)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50

  try {
    const { rows } = await pool.query(
      `SELECT id, title, artist, album, source_platform AS "sourcePlatform",
              spotify_url AS "spotifyUrl", apple_url AS "appleUrl",
              artwork_url AS "artworkUrl", created_at AS "createdAt"
       FROM shares
       ORDER BY id DESC
       LIMIT $1`,
      [limit],
    )
    res.json(rows)
  } catch (err) {
    console.error('[api] failed to list shares:', err.message)
    res.status(500).json({ error: 'failed to list shares' })
  }
})

// ---- Static SPA (production only) ----
if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(__dirname, '..', 'dist')
  if (fs.existsSync(distDir)) {
    app.use(
      express.static(distDir, {
        setHeaders(res, filePath) {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
          } else {
            res.setHeader('Cache-Control', 'no-cache')
          }
        },
      }),
    )
    // SPA fallback for non-/api GET routes
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) return next()
      res.sendFile(path.join(distDir, 'index.html'))
    })
  } else {
    console.warn(`[server] dist/ not found at ${distDir} — static files will not be served.`)
  }
}

// ---- Startup ----
const port = Number(process.env.PORT) || 7100
const server = app.listen(port, () => {
  console.log(`[server] CrossTune listening on http://localhost:${port}`)
})

initDb()

async function shutdown(signal) {
  console.log(`[server] received ${signal}, shutting down…`)
  server.close(async () => {
    await closeDb()
    process.exit(0)
  })
  // Force-exit if connections linger
  setTimeout(() => process.exit(1), 5000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
