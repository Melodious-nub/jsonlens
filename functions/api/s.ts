/**
 * Cloudflare Pages Function - Zero-Knowledge Encrypted Short Link Store
 * Connected to Cloudflare D1 database: `jsonlens-db` (bound as `DB`)
 *
 * Privacy guarantee:
 * - Stores ONLY client-encrypted AES-256-GCM ciphertext (`v1.<iv>.<cipher>`).
 * - Never receives or stores decryption keys (which remain strictly in the URL #fragment).
 * - Never logs client IPs, user agents, referrers, or analytics telemetry.
 * - Auto-creates the `shared_links` table on first use and expires links after 30 days.
 */

interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success: boolean;
  error?: string;
  meta?: {
    changes?: number;
    last_row_id?: number;
    duration?: number;
  };
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

interface Env {
  DB: D1Database;
}

interface EventContext<E, P extends string, D> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<unknown>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: E;
  params: Record<P, string | string[]>;
  data: D;
}

type PagesFunction<
  E = unknown,
  P extends string = string,
  D extends Record<string, unknown> = Record<string, unknown>
> = (context: EventContext<E, P, D>) => Response | Promise<Response>;

interface CreateShortLinkBody {
  ciphertext?: unknown;
}

interface SharedLinkRow {
  id: string;
  ciphertext: string;
  expires_at: number;
}

const CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};

const MAX_CIPHERTEXT_LENGTH = 512 * 1024; // 512 KB encrypted envelope cap
const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const SHORT_ID_LENGTH = 8;
const SHORT_ID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const SHORT_ID_PATTERN = /^[A-Za-z0-9_-]{6,32}$/;
const ENVELOPE_PATTERN = /^v1\.[A-Za-z0-9_-]{12,64}\.[A-Za-z0-9_-]{16,}$/;

let schemaInitPromise: Promise<void> | null = null;

function jsonResponse(payload: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(payload), { status, headers: CORS_HEADERS });
}

async function ensureSchema(db: D1Database): Promise<void> {
  if (!schemaInitPromise) {
    schemaInitPromise = db
      .batch([
        db.prepare(
          'CREATE TABLE IF NOT EXISTS shared_links (id TEXT PRIMARY KEY, ciphertext TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)'
        ),
        db.prepare(
          'CREATE INDEX IF NOT EXISTS idx_shared_links_expires ON shared_links (expires_at)'
        ),
      ])
      .then(() => undefined)
      .catch((err) => {
        schemaInitPromise = null;
        throw err;
      });
  }
  await schemaInitPromise;
}

function generateShortId(length = SHORT_ID_LENGTH): string {
  const alphabetLen = SHORT_ID_ALPHABET.length;
  const maxValidByte = 256 - (256 % alphabetLen);
  const chars: string[] = [];
  const buf = new Uint8Array(length * 2);

  while (chars.length < length) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length && chars.length < length; i++) {
      const byte = buf[i];
      if (byte < maxValidByte) {
        chars.push(SHORT_ID_ALPHABET[byte % alphabetLen]);
      }
    }
  }
  return chars.join('');
}

/**
 * Handle GET /api/s?id=<id>
 * Retrieves zero-knowledge encrypted payload for a non-expired short ID.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    if (!context.env.DB) {
      return jsonResponse({ error: 'D1 database binding DB not found' }, 500);
    }

    const url = new URL(context.request.url);
    const id = url.searchParams.get('id')?.trim() ?? '';
    if (!SHORT_ID_PATTERN.test(id)) {
      return jsonResponse({ error: 'Invalid short link identifier' }, 400);
    }

    await ensureSchema(context.env.DB);

    const row = await context.env.DB
      .prepare('SELECT id, ciphertext, expires_at FROM shared_links WHERE id = ? LIMIT 1')
      .bind(id)
      .first<SharedLinkRow>();

    if (!row) {
      return jsonResponse({ error: 'Short link not found or expired' }, 404);
    }

    const now = Math.floor(Date.now() / 1000);
    if (Number(row.expires_at) < now) {
      try {
        await context.env.DB.prepare('DELETE FROM shared_links WHERE id = ?').bind(id).run();
      } catch {
        // Non-fatal cleanup error
      }
      return jsonResponse({ error: 'Short link has expired' }, 410);
    }

    return jsonResponse(
      {
        id: row.id,
        ciphertext: row.ciphertext,
        expiresAt: Number(row.expires_at),
      },
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: 'Failed to retrieve short link', details: message }, 500);
  }
};

/**
 * Handle POST /api/s
 * Stores client-side AES-256-GCM ciphertext and returns a generated short ID.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    if (!context.env.DB) {
      return jsonResponse({ error: 'D1 database binding DB not found' }, 500);
    }

    let body: CreateShortLinkBody;
    try {
      body = (await context.request.json()) as CreateShortLinkBody;
    } catch {
      return jsonResponse({ error: 'Invalid JSON request body' }, 400);
    }

    const ciphertext = typeof body.ciphertext === 'string' ? body.ciphertext.trim() : '';
    if (!ciphertext) {
      return jsonResponse({ error: 'Encrypted ciphertext is required' }, 400);
    }
    if (ciphertext.length > MAX_CIPHERTEXT_LENGTH) {
      return jsonResponse(
        { error: 'Encrypted payload exceeds the maximum 512 KB short-link limit' },
        413
      );
    }
    if (!ENVELOPE_PATTERN.test(ciphertext)) {
      return jsonResponse({ error: 'Invalid encrypted payload format' }, 400);
    }

    await ensureSchema(context.env.DB);

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + DEFAULT_TTL_SECONDS;

    // Opportunistic expired-row cleanup to keep storage bounded
    try {
      await context.env.DB.prepare('DELETE FROM shared_links WHERE expires_at < ?').bind(now).run();
    } catch {
      // Non-fatal cleanup error
    }

    let createdId: string | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const candidateId = generateShortId();
      try {
        await context.env.DB
          .prepare(
            'INSERT INTO shared_links (id, ciphertext, created_at, expires_at) VALUES (?, ?, ?, ?)'
          )
          .bind(candidateId, ciphertext, now, expiresAt)
          .run();
        createdId = candidateId;
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (!msg.toLowerCase().includes('unique')) {
          throw err;
        }
      }
    }

    if (!createdId) {
      return jsonResponse({ error: 'Could not allocate unique short ID' }, 500);
    }

    return jsonResponse({ id: createdId, expiresAt }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: 'Failed to create short link', details: message }, 500);
  }
};

/**
 * Handle OPTIONS /api/s (CORS preflight)
 */
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

