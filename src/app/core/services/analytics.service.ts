import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export interface SiteStats {
  total_visits: number;
  unique_users: number;
  active_now: number;
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Reactive state signals
  readonly stats = signal<SiteStats | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly hasRecorded = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  private readonly sessionKey = 'jsonlens_session_active';
  private readonly sessionIdKey = 'jsonlens_session_id';
  private readonly userKey = 'jsonlens_visitor_tracked';

  private readonly defaultFallbackStats: SiteStats = {
    total_visits: 1250,
    unique_users: 540,
    active_now: 3,
  };

  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private visibilityListener: (() => void) | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.stopHeartbeat();
    });
  }

  /**
   * Retrieves or creates a unique session ID persisted in sessionStorage.
   */
  getSessionId(): string {
    if (!this.isBrowser) {
      return '';
    }

    try {
      let id = sessionStorage.getItem(this.sessionIdKey);
      if (!id) {
        id =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        sessionStorage.setItem(this.sessionIdKey, id);
      }
      return id;
    } catch {
      return `sess_${Date.now()}`;
    }
  }

  /**
   * Records a page/workspace visit using privacy-preserving serverless Cloudflare D1.
   * Guaranteed safe during SSR/SSG pre-rendering (strict no-op on server).
   */
  async recordVisit(): Promise<void> {
    if (!this.isBrowser || this.hasRecorded()) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    const sessionId = this.getSessionId();

    try {
      // Check if session has already been recorded in current browser window
      const hasSession = sessionStorage.getItem(this.sessionKey) === 'true';
      // Check if visitor has ever opened JsonLens before
      const isNewUser = localStorage.getItem(this.userKey) === null;

      if (!hasSession) {
        // Record visit increment via POST /api/stats
        const response = await fetch('/api/stats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            isNewUser,
            isHeartbeat: false,
          }),
        });

        const isHtml =
          typeof response.headers?.get === 'function' &&
          Boolean(response.headers.get('content-type')?.includes('text/html'));

        if (!response.ok || isHtml) {
          throw new Error(`Telemetry HTTP ${response.status}`);
        }

        const data = (await response.json()) as SiteStats;
        this.stats.set({
          total_visits: Number(data.total_visits) || 0,
          unique_users: Number(data.unique_users) || 0,
          active_now: Math.max(1, Number(data.active_now) || 1),
        });

        // Mark session active & persist user flag
        sessionStorage.setItem(this.sessionKey, 'true');
        if (isNewUser) {
          localStorage.setItem(this.userKey, new Date().toISOString());
        }
      } else {
        // Already recorded this session; refresh stats without incrementing
        await this.fetchStats();
      }

      this.hasRecorded.set(true);
      this.startHeartbeat();
    } catch (err) {
      // Telemetry error must never degrade core UX
      const message = err instanceof Error ? err.message : 'Telemetry sync failed';
      this.error.set(message);

      // In local dev without Cloudflare Worker proxy, provide graceful fallback numbers
      if (!this.stats()) {
        this.stats.set(this.defaultFallbackStats);
      }
      this.startHeartbeat();
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Fetches latest global telemetry counters without recording an increment.
   */
  async fetchStats(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }

    try {
      const response = await fetch('/api/stats', {
        headers: {
          Accept: 'application/json',
        },
      });

      const isHtml =
        typeof response.headers?.get === 'function' &&
        Boolean(response.headers.get('content-type')?.includes('text/html'));

      if (response.ok && !isHtml) {
        const data = (await response.json()) as SiteStats;
        this.stats.set({
          total_visits: Number(data.total_visits) || 0,
          unique_users: Number(data.unique_users) || 0,
          active_now: Math.max(1, Number(data.active_now) || 1),
        });
      } else if (!this.stats()) {
        this.stats.set(this.defaultFallbackStats);
      }
    } catch {
      if (!this.stats()) {
        this.stats.set(this.defaultFallbackStats);
      }
    }
  }

  /**
   * Sends recurring heartbeat ping to /api/stats to keep active session alive.
   * Only active sessions seen in last 180s are counted in active_now.
   */
  async sendHeartbeat(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }

    // Bandwidth optimization: skip heartbeat if browser tab is hidden/backgrounded
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }

    const sessionId = this.getSessionId();

    try {
      const response = await fetch('/api/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          isHeartbeat: true,
        }),
      });

      const isHtml =
        typeof response.headers?.get === 'function' &&
        Boolean(response.headers.get('content-type')?.includes('text/html'));

      if (response.ok && !isHtml) {
        const data = (await response.json()) as SiteStats;
        this.stats.set({
          total_visits: Number(data.total_visits) || 0,
          unique_users: Number(data.unique_users) || 0,
          active_now: Math.max(1, Number(data.active_now) || 1),
        });
      }
    } catch {
      // Non-fatal telemetry heartbeat
    }
  }

  /**
   * Starts recurring heartbeat interval (every 60s) with visibilitychange listeners.
   */
  startHeartbeat(): void {
    if (!this.isBrowser || this.heartbeatInterval !== null) {
      return;
    }

    // Heartbeat every 60 seconds (well within 180s threshold)
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 60000);

    // Also ping immediately when tab becomes visible after being backgrounded
    if (typeof document !== 'undefined') {
      this.visibilityListener = () => {
        if (document.visibilityState === 'visible') {
          this.sendHeartbeat();
        }
      };
      document.addEventListener('visibilitychange', this.visibilityListener);
    }
  }

  /**
   * Stops heartbeat and removes visibility event listeners.
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.visibilityListener !== null && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = null;
    }
  }
}
