import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { JsonEngineService, DEFAULT_SAMPLE_JSON } from './json-engine.service';
import { DiffItem, DiffSummary, JsonValue } from '../models/json-lens.model';
import { deepDiffJson, summarizeDiff } from '../../shared/utils/json-diff.util';

export const SAMPLE_MODIFIED_JSON = `{
  "name": "JsonLens",
  "version": "1.1.0",
  "privacy": "100% Client-Side",
  "features": [
    "Zoneless Angular Reactive Architecture",
    "Real-time Syntax Error Diagnostics",
    "One-Click Smart Error Auto-Repair",
    "Interactive Tree Explorer & JSONPath Copy",
    "Instant Type Generation: TypeScript, Zod, Go",
    "Side-by-side JSON Diff Comparison",
    "Off-thread Web Worker Parser for Large Files",
    "Ultra-Fast Visual Diffing Engine"
  ],
  "author": {
    "organization": "Open Source Community",
    "url": "https://github.com/Melodious-nub/jsonlens"
  },
  "metrics": {
    "activeUsers": 68000,
    "uptime": 0.99999,
    "isProductionReady": true,
    "rating": 4.95
  }
}`;

@Injectable({
  providedIn: 'root',
})
export class DiffService {
  private readonly engine = inject(JsonEngineService);

  readonly secondaryInput = signal<string>(SAMPLE_MODIFIED_JSON);
  readonly isSampleActive = signal<boolean>(true);

  constructor() {
    // Reactively synchronize secondary comparison with primary input
    // whenever user enters their own data while secondary is still the untouched sample.
    effect(() => {
      const primary = this.engine.rawInput();
      if (this.isSampleActive() && primary !== DEFAULT_SAMPLE_JSON && primary.trim() !== '') {
        this.secondaryInput.set(primary);
        this.isSampleActive.set(false);
      }
    });
  }

  readonly parsedSecondary = computed<{ data: JsonValue | null; isValid: boolean }>(() => {
    const raw = this.secondaryInput();
    if (!raw.trim()) {
      return { data: null, isValid: true };
    }
    try {
      const data = JSON.parse(raw) as JsonValue;
      return { data, isValid: true };
    } catch {
      return { data: null, isValid: false };
    }
  });

  readonly diffItems = computed<DiffItem[]>(() => {
    const primaryData = this.engine.parsedResult().data;
    const secondaryData = this.parsedSecondary().data;

    if (primaryData === null || secondaryData === null) {
      return [];
    }

    return deepDiffJson(primaryData, secondaryData);
  });

  readonly meaningfulDiffs = computed<DiffItem[]>(() => {
    return this.diffItems().filter((item) => item.type !== 'unchanged');
  });

  readonly diffSummary = computed<DiffSummary>(() => {
    return summarizeDiff(this.diffItems());
  });

  setSecondaryInput(val: string): void {
    this.secondaryInput.set(val);
    this.isSampleActive.set(false);
  }

  loadSample(): void {
    this.secondaryInput.set(SAMPLE_MODIFIED_JSON);
    this.isSampleActive.set(true);
  }

  clearSecondary(): void {
    this.secondaryInput.set('');
    this.isSampleActive.set(false);
  }

  cloneFromPrimary(): void {
    this.secondaryInput.set(this.engine.rawInput());
    this.isSampleActive.set(false);
  }

  swapInputs(): void {
    const currentPrimary = this.engine.rawInput();
    const currentSecondary = this.secondaryInput();
    this.engine.setInput(currentSecondary);
    this.secondaryInput.set(currentPrimary);
  }
}
