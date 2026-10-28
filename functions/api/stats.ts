/**
 * Cloudflare Pages Function - Site Statistics & Real-Time Active Users API
 * Connected to Cloudflare D1 database: `jsonlens-db` (bound as `DB`)
 * Table schemas:
 *   - site_stats (id TEXT, total_visits INT, unique_users INT)
 *   - active_sessions (session_id TEXT PRIMARY KEY, last_seen INTEGER)
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
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec<T = Record<string, unknown>>(query: string): Promise<D1Result<T>>;
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

export type PagesFunction<
  E = unknown,
  P extends string = string,
  D extends Record<string, unknown> = Record<string, unknown>
> = (context: EventContext<E, P, D>) => Response | Promise<Response>;

const CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};

interface StatsRow {
  total_visits: number;
  unique_users: number;
}

interface ActiveRow {
  active_now: number;
}

interface TelemetryPayload {
  sessionId?: string;
  isNewUser?: boolean;
  isHeartbeat?: boolean;
}

const ACTIVE_SESSION_WINDOW_SECONDS = 180; // 3 minutes

/**
 * Handle GET /api/stats
 * Queries telemetry metrics and real-time active users from Cloudflare D1
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    if (!context.env.DB) {
      return new Response(
        JSON.stringify({ error: 'D1 database binding DB not found' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const staleThreshold = now - ACTIVE_SESSION_WINDOW_SECONDS;

    // 1. Clean up stale active sessions older than 3 minutes
    try {
      await context.env.DB
        .prepare('DELETE FROM active_sessions WHERE last_seen < ?')
        .bind(staleThreshold)
        .run();
    } catch {
      // Non-fatal if table not initialized yet
    }

    // 2. Query active users count
    let activeNow = 0;
    try {
      const activeResult = await context.env.DB
        .prepare('SELECT COUNT(*) AS active_now FROM active_sessions WHERE last_seen >= ?')
        .bind(staleThreshold)
        .first<ActiveRow>();
      activeNow = Number(activeResult?.active_now) || 0;
    } catch {
      activeNow = 0;
    }

    // 3. Query total visits and unique users from site_stats
    const row = await context.env.DB
      .prepare("SELECT total_visits, unique_users FROM site_stats WHERE id = 'main' LIMIT 1")
      .first<StatsRow>();

    const stats = {
      total_visits: Number(row?.total_visits) || 0,
      unique_users: Number(row?.unique_users) || 0,
      active_now: activeNow,
    };

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Failed to query telemetry statistics', details: message }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

/**
 * Handle POST /api/stats
 * Upserts active_sessions (heartbeat or initial visit) and increments stats on new session
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    if (!context.env.DB) {
      return new Response(
        JSON.stringify({ error: 'D1 database binding DB not found' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    let body: TelemetryPayload = {};
    try {
      body = (await context.request.json()) as TelemetryPayload;
    } catch {
      // Body parsing optional
    }

    const isHeartbeat = Boolean(body.isHeartbeat);
    const isNewUser = Boolean(body.isNewUser);
    const sessionId =
      body.sessionId && typeof body.sessionId === 'string' && body.sessionId.trim().length > 0
        ? body.sessionId.trim().slice(0, 64)
        : `anon_${crypto.randomUUID()}`;

    const now = Math.floor(Date.now() / 1000);
    const staleThreshold = now - ACTIVE_SESSION_WINDOW_SECONDS;

    // 1. Upsert active session in active_sessions
    try {
      await context.env.DB
        .prepare(
          'INSERT INTO active_sessions (session_id, last_seen) VALUES (?, ?) ON CONFLICT(session_id) DO UPDATE SET last_seen = excluded.last_seen'
        )
        .bind(sessionId, now)
        .run();
    } catch {
      try {
        await context.env.DB
          .prepare('INSERT OR REPLACE INTO active_sessions (session_id, last_seen) VALUES (?, ?)')
          .bind(sessionId, now)
          .run();
      } catch {
        // Fallback gracefully
      }
    }

    // 2. If NOT a heartbeat, increment total_visits (and unique_users if new)
    if (!isHeartbeat) {
      const uniqueIncrement = isNewUser ? 1 : 0;

      const updateResult = await context.env.DB
        .prepare(
          "UPDATE site_stats SET total_visits = total_visits + 1, unique_users = unique_users + ? WHERE id = 'main'"
        )
        .bind(uniqueIncrement)
        .run();

      const changes = updateResult.meta?.changes ?? 0;
      if (changes === 0) {
        await context.env.DB
          .prepare("INSERT INTO site_stats (id, total_visits, unique_users) VALUES ('main', 1, ?)")
          .bind(uniqueIncrement)
          .run();
      }
    }

    // 3. Clean up stale sessions
    try {
      await context.env.DB
        .prepare('DELETE FROM active_sessions WHERE last_seen < ?')
        .bind(staleThreshold)
        .run();
    } catch {
      // Non-fatal
    }

    // 4. Query active_now count
    let activeNow = 1;
    try {
      const activeResult = await context.env.DB
        .prepare('SELECT COUNT(*) AS active_now FROM active_sessions WHERE last_seen >= ?')
        .bind(staleThreshold)
        .first<ActiveRow>();
      activeNow = Math.max(1, Number(activeResult?.active_now) || 1);
    } catch {
      activeNow = 1;
    }

    // 5. Query latest total_visits and unique_users
    const updatedRow = await context.env.DB
      .prepare("SELECT total_visits, unique_users FROM site_stats WHERE id = 'main' LIMIT 1")
      .first<StatsRow>();

    const stats = {
      total_visits: Number(updatedRow?.total_visits) || 1,
      unique_users: Number(updatedRow?.unique_users) || (isNewUser ? 1 : 0),
      active_now: activeNow,
    };

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Failed to record telemetry session', details: message }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

/**
 * Handle OPTIONS /api/stats (CORS preflight)
 */
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};
