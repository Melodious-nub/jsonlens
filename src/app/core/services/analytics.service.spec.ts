import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should instantiate cleanly with default signal states', () => {
    TestBed.configureTestingModule({
      providers: [AnalyticsService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const service = TestBed.inject(AnalyticsService);

    expect(service).toBeTruthy();
    expect(service.stats()).toBeNull();
    expect(service.isLoading()).toBe(false);
    expect(service.hasRecorded()).toBe(false);
  });

  it('should do nothing on server platform during SSR/SSG', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    TestBed.configureTestingModule({
      providers: [AnalyticsService, { provide: PLATFORM_ID, useValue: 'server' }],
    });
    const service = TestBed.inject(AnalyticsService);

    await service.recordVisit();
    await service.fetchStats();
    await service.sendHeartbeat();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(service.hasRecorded()).toBe(false);
    expect(service.stats()).toBeNull();
  });

  it('should record visit via POST /api/stats with sessionId and isNewUser=true when localStorage is empty', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ total_visits: 10, unique_users: 5, active_now: 2 }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    TestBed.configureTestingModule({
      providers: [AnalyticsService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const service = TestBed.inject(AnalyticsService);

    await service.recordVisit();

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/stats',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })
    );

    const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(callBody.sessionId).toBeTruthy();
    expect(callBody.isNewUser).toBe(true);
    expect(callBody.isHeartbeat).toBe(false);

    expect(service.stats()).toEqual({ total_visits: 10, unique_users: 5, active_now: 2 });
    expect(service.hasRecorded()).toBe(true);
    expect(sessionStorage.getItem('jsonlens_session_active')).toBe('true');
    expect(sessionStorage.getItem('jsonlens_session_id')).toBeTruthy();
    expect(localStorage.getItem('jsonlens_visitor_tracked')).toBeTruthy();
  });

  it('should record visit via POST /api/stats with isNewUser=false when visitor is returning', async () => {
    localStorage.setItem('jsonlens_visitor_tracked', '2026-10-01T00:00:00.000Z');

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ total_visits: 11, unique_users: 5, active_now: 3 }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    TestBed.configureTestingModule({
      providers: [AnalyticsService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const service = TestBed.inject(AnalyticsService);

    await service.recordVisit();

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/stats',
      expect.objectContaining({
        method: 'POST',
      })
    );

    const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(callBody.sessionId).toBeTruthy();
    expect(callBody.isNewUser).toBe(false);
    expect(callBody.isHeartbeat).toBe(false);

    expect(service.stats()).toEqual({ total_visits: 11, unique_users: 5, active_now: 3 });
  });

  it('should refresh via GET /api/stats when session is already active in sessionStorage', async () => {
    sessionStorage.setItem('jsonlens_session_active', 'true');

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ total_visits: 25, unique_users: 12, active_now: 4 }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    TestBed.configureTestingModule({
      providers: [AnalyticsService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const service = TestBed.inject(AnalyticsService);

    await service.recordVisit();

    expect(fetchSpy).toHaveBeenCalledWith('/api/stats', {
      headers: {
        Accept: 'application/json',
      },
    });

    expect(service.stats()).toEqual({ total_visits: 25, unique_users: 12, active_now: 4 });
  });

  it('should send recurring heartbeat with isHeartbeat=true when visible', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ total_visits: 50, unique_users: 20, active_now: 5 }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    TestBed.configureTestingModule({
      providers: [AnalyticsService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const service = TestBed.inject(AnalyticsService);

    await service.sendHeartbeat();

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/stats',
      expect.objectContaining({
        method: 'POST',
      })
    );

    const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(callBody.sessionId).toBeTruthy();
    expect(callBody.isHeartbeat).toBe(true);

    expect(service.stats()).toEqual({ total_visits: 50, unique_users: 20, active_now: 5 });
  });

  it('should skip heartbeat when document is hidden', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');

    TestBed.configureTestingModule({
      providers: [AnalyticsService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const service = TestBed.inject(AnalyticsService);

    await service.sendHeartbeat();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should handle API failure gracefully with fallback numbers', async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', fetchSpy);

    TestBed.configureTestingModule({
      providers: [AnalyticsService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const service = TestBed.inject(AnalyticsService);

    await service.recordVisit();

    expect(service.error()).toBe('Network error');
    expect(service.stats()).not.toBeNull();
    expect(service.stats()?.active_now).toBeGreaterThanOrEqual(1);
    expect(service.isLoading()).toBe(false);
  });
});
