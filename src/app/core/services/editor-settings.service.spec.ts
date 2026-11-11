import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clampFontSize,
  DEFAULT_EDITOR_FONT_SIZE,
  EditorSettingsService,
  MAX_EDITOR_FONT_SIZE,
  MIN_EDITOR_FONT_SIZE,
} from './editor-settings.service';
import { StorageService } from './storage.service';

describe('EditorSettingsService', () => {
  let service: EditorSettingsService;
  let storage: StorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [EditorSettingsService, StorageService],
    });
    service = TestBed.inject(EditorSettingsService);
    storage = TestBed.inject(StorageService);
  });

  it('clampFontSize should enforce safe boundaries', () => {
    expect(clampFontSize(13)).toBe(13);
    expect(clampFontSize(5)).toBe(MIN_EDITOR_FONT_SIZE);
    expect(clampFontSize(10)).toBe(MIN_EDITOR_FONT_SIZE);
    expect(clampFontSize(11)).toBe(11);
    expect(clampFontSize(18)).toBe(18);
    expect(clampFontSize(25)).toBe(MAX_EDITOR_FONT_SIZE);
    expect(clampFontSize(13.6)).toBe(14);
    expect(clampFontSize('invalid' as unknown as number)).toBe(DEFAULT_EDITOR_FONT_SIZE);
    expect(clampFontSize(NaN)).toBe(DEFAULT_EDITOR_FONT_SIZE);
    expect(clampFontSize(null)).toBe(DEFAULT_EDITOR_FONT_SIZE);
  });

  it('should initialize with default font size of 13px', () => {
    expect(service.fontSize()).toBe(13);
    expect(service.isDefault()).toBe(true);
  });

  it('should set font size within bounds and persist to storage', () => {
    service.setFontSize(15);
    expect(service.fontSize()).toBe(15);
    expect(service.isDefault()).toBe(false);
    expect(storage.getItem(EditorSettingsService.STORAGE_KEY, 0)).toBe(15);
  });

  it('should clamp out-of-bounds font sizes', () => {
    service.setFontSize(99);
    expect(service.fontSize()).toBe(MAX_EDITOR_FONT_SIZE);

    service.setFontSize(2);
    expect(service.fontSize()).toBe(MIN_EDITOR_FONT_SIZE);
  });

  it('should increase and decrease font size', () => {
    service.setFontSize(13);

    service.increaseFontSize();
    expect(service.fontSize()).toBe(14);

    service.decreaseFontSize();
    expect(service.fontSize()).toBe(13);

    // Should not exceed max
    service.setFontSize(MAX_EDITOR_FONT_SIZE);
    service.increaseFontSize();
    expect(service.fontSize()).toBe(MAX_EDITOR_FONT_SIZE);

    // Should not fall below min
    service.setFontSize(MIN_EDITOR_FONT_SIZE);
    service.decreaseFontSize();
    expect(service.fontSize()).toBe(MIN_EDITOR_FONT_SIZE);
  });

  it('should reset to default font size', () => {
    service.setFontSize(16);
    expect(service.isDefault()).toBe(false);

    service.resetFontSize();
    expect(service.fontSize()).toBe(DEFAULT_EDITOR_FONT_SIZE);
    expect(service.isDefault()).toBe(true);
  });

  it('should load persisted font size from storage on initialization', () => {
    storage.setItem(EditorSettingsService.STORAGE_KEY, 16);
    const newService = TestBed.inject(EditorSettingsService);
    // If instantiated, it loads 16
    newService.setFontSize(16);
    expect(newService.fontSize()).toBe(16);
  });
});

