import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeService } from './theme.service';
import { StorageService } from './storage.service';
import { AppTheme, THEMES } from '../models/theme.model';

describe('ThemeService', () => {
  let service: ThemeService;
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return mockStorage[key] ?? null;
    });

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, val: string) => {
      mockStorage[key] = val;
    });

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        StorageService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(ThemeService);
  });

  it('should instantiate cleanly with default dark theme', () => {
    expect(service).toBeTruthy();
    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(service.themes.length).toBe(5);
  });

  it('should toggle between dark and light via toggleTheme()', () => {
    expect(service.theme()).toBe('dark');

    service.toggleTheme();
    expect(service.theme()).toBe('light');
    expect(service.isDark()).toBe(false);

    service.toggleTheme();
    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBe(true);
  });

  it('should switch across all 5 themes directly via setTheme()', () => {
    const testThemes: AppTheme[] = ['light', 'tokyo-night', 'dracula', 'nord', 'dark'];

    for (const theme of testThemes) {
      service.setTheme(theme);
      expect(service.theme()).toBe(theme);
      expect(service.isDark()).toBe(theme !== 'light');
    }
  });

  it('should restore previously selected custom dark theme when toggling from light', () => {
    service.setTheme('tokyo-night');
    expect(service.theme()).toBe('tokyo-night');

    // Toggle to light
    service.toggleTheme();
    expect(service.theme()).toBe('light');

    // Toggle back restores tokyo-night
    service.toggleTheme();
    expect(service.theme()).toBe('tokyo-night');
  });

  it('should cycle through all 5 themes sequentially via cycleTheme()', () => {
    service.setTheme('dark');
    const allThemeIds = THEMES.map((t) => t.id);

    for (let i = 1; i < allThemeIds.length; i++) {
      service.cycleTheme();
      expect(service.theme()).toBe(allThemeIds[i]);
    }

    // Wraps back to start
    service.cycleTheme();
    expect(service.theme()).toBe(allThemeIds[0]);
  });

  it('should persist active theme to localStorage and set DOM attribute', () => {
    service.setTheme('dracula');
    TestBed.flushEffects();

    expect(mockStorage['jsonlens_theme']).toBe(JSON.stringify('dracula'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dracula');
  });

  it('should load saved theme from localStorage on startup', () => {
    mockStorage['jsonlens_theme'] = JSON.stringify('nord');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        StorageService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    const newService = TestBed.inject(ThemeService);
    expect(newService.theme()).toBe('nord');
    expect(newService.isDark()).toBe(true);
  });

  it('should handle touch event coordinates gracefully during theme switch', () => {
    const mockTouchEvent = {
      touches: [{ clientX: 150, clientY: 300 }],
    } as unknown as TouchEvent;

    expect(() => service.setTheme('tokyo-night', mockTouchEvent)).not.toThrow();
    expect(service.theme()).toBe('tokyo-night');
  });

  it('should handle rapid repeated theme changes safely without exceptions', () => {
    expect(() => {
      service.setTheme('light');
      service.setTheme('tokyo-night');
      service.setTheme('dracula');
      service.toggleTheme();
      service.cycleTheme();
    }).not.toThrow();
  });

  it('should execute cleanly in SSR environment (platformId = server)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        StorageService,
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    const ssrService = TestBed.inject(ThemeService);
    expect(ssrService).toBeTruthy();
    expect(ssrService.theme()).toBe('dark');

    expect(() => ssrService.toggleTheme()).not.toThrow();
  });
});

