import pg from 'pg'

const { Pool } = pg

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS shares (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  source_platform TEXT NOT NULL,
  spotify_url TEXT,
  apple_url TEXT,
  artwork_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`

let pool = null
let initializing = null

/** Returns the active Pool, or null when the database is not configured/available. */
export function getPool() {
  return pool
}

/**
 * Attempts to create the connection pool and ensure the schema exists.
 * Safe to call repeatedly — concurrent calls share one in-flight init.
 * Resolves to the pool on success, or null on failure (warning logged).
 */
export async function initDb() {
  if (pool) return pool
  if (!process.env.DATABASE_URL) {
    console.warn('[db] DATABASE_URL is not set — /api/shares will return 503 until it is configured.')
    return null
  }
  if (initializing) return initializing
  initializing = (async () => {
    try {
      const p = new Pool({ connectionString: process.env.DATABASE_URL })
      await p.query(SCHEMA_SQL)
      p.on('error', (err) => {
        console.error('[db] unexpected pool error:', err.message)
      })
      pool = p
      console.log('[db] connected and schema ready')
      return pool
    } catch (err) {
      console.warn(`[db] connection failed (${err.message}) — will retry lazily on the next request.`)
      return null
    } finally {
      initializing = null
    }
  })()
  return initializing
}

/** Closes the pool if it exists. */
export async function closeDb() {
  const p = pool
  pool = null
  if (p) {
    await p.end()
    console.log('[db] pool closed')
  }
}
