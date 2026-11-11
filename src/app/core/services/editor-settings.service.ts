import { computed, inject, Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';

export const MIN_EDITOR_FONT_SIZE = 11;
export const MAX_EDITOR_FONT_SIZE = 18;
export const DEFAULT_EDITOR_FONT_SIZE = 13;

export interface FontSizeOption {
  readonly size: number;
  readonly label: string;
  readonly isDefault?: boolean;
}

export const FONT_SIZE_OPTIONS: readonly FontSizeOption[] = [
  { size: 11, label: '11px (Compact)' },
  { size: 12, label: '12px (Small)' },
  { size: 13, label: '13px (Default)', isDefault: true },
  { size: 14, label: '14px (Medium)' },
  { size: 15, label: '15px (Large)' },
  { size: 16, label: '16px (X-Large)' },
  { size: 18, label: '18px (Huge)' },
] as const;

/**
 * Validates and clamps a candidate font size to ensure it is within safe, interactive bounds.
 */
export function clampFontSize(size: unknown): number {
  if (typeof size !== 'number' || Number.isNaN(size)) {
    return DEFAULT_EDITOR_FONT_SIZE;
  }
  return Math.min(Math.max(Math.round(size), MIN_EDITOR_FONT_SIZE), MAX_EDITOR_FONT_SIZE);
}

@Injectable({
  providedIn: 'root',
})
export class EditorSettingsService {
  private readonly storage = inject(StorageService);
  static readonly STORAGE_KEY = 'jsonlens_editor_font_size';

  readonly fontSizeOptions = FONT_SIZE_OPTIONS;
  readonly defaultFontSize = DEFAULT_EDITOR_FONT_SIZE;
  readonly minFontSize = MIN_EDITOR_FONT_SIZE;
  readonly maxFontSize = MAX_EDITOR_FONT_SIZE;

  private readonly _fontSize = signal<number>(
    clampFontSize(this.storage.getItem<number>(EditorSettingsService.STORAGE_KEY, DEFAULT_EDITOR_FONT_SIZE))
  );

  readonly fontSize = this._fontSize.asReadonly();
  readonly isDefault = computed(() => this._fontSize() === DEFAULT_EDITOR_FONT_SIZE);

  setFontSize(size: number): void {
    const valid = clampFontSize(size);
    if (this._fontSize() !== valid) {
      this._fontSize.set(valid);
      this.storage.setItem(EditorSettingsService.STORAGE_KEY, valid);
    }
  }

  increaseFontSize(): void {
    const current = this._fontSize();
    if (current < MAX_EDITOR_FONT_SIZE) {
      this.setFontSize(current + 1);
    }
  }

  decreaseFontSize(): void {
    const current = this._fontSize();
    if (current > MIN_EDITOR_FONT_SIZE) {
      this.setFontSize(current - 1);
    }
  }

  resetFontSize(): void {
    this.setFontSize(DEFAULT_EDITOR_FONT_SIZE);
  }
}

