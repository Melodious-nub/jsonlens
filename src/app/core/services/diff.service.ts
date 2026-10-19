import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { JsonEngineService, DEFAULT_SAMPLE_JSON } from './json-engine.service';
import { DiffItem, DiffSummary, JsonValue } from '../models/json-lens.model';
import { deepDiffJson, summarizeDiff } from '../../shared/utils/json-diff.util';

const DIFF_WORKER_THRESHOLD = 150 * 1024; // 150KB

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
    "name": "Shawon Talukder",
    "headline": "Full-Stack Software Engineer · Angular Specialist · Mobile Developer",
    "github": "https://github.com/Melodious-nub",
    "linkedin": "https://www.linkedin.com/in/shawon-taluckder",
    "email": "shawon.taluckder2@gmail.com",
    "fiverr": "https://www.fiverr.com/talukder_shawon/",
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
  private readonly destroyRef = inject(DestroyRef);

  readonly secondaryInput = signal<string>(SAMPLE_MODIFIED_JSON);
  readonly isSampleActive = signal<boolean>(true);
  readonly awaitingNewInput = signal<boolean>(false);
  readonly isDiffing = signal<boolean>(false);
  private readonly lastPrimaryOnClear = signal<string>('');
  private readonly workerDiffResult = signal<{ diffItems: DiffItem[]; summary: DiffSummary } | null>(null);
  private cancelPendingWorkerDiff: (() => void) | null = null;

  constructor() {
    // Reactively synchronize secondary comparison with primary input:
    // 1. Initial sample startup when user enters their own data while sample is active.
    // 2. When diff was cleared and new input is pasted/added into the primary editor.
    effect(() => {
      const primary = this.engine.rawInput();
      const trimmedPrimary = primary.trim();

      // Case 1: Initial startup with sample
      if (this.isSampleActive() && primary !== DEFAULT_SAMPLE_JSON && trimmedPrimary !== '') {
        this.secondaryInput.set(primary);
        this.isSampleActive.set(false);
        this.awaitingNewInput.set(false);
        return;
      }

      // Case 2: Diff was cleared, and subsequent new JSON data is added to primary
      if (
        this.awaitingNewInput() &&
        primary !== this.lastPrimaryOnClear() &&
        trimmedPrimary !== ''
      ) {
        this.secondaryInput.set(primary);
        this.awaitingNewInput.set(false);
      }
    });

    // Worker offloading for large diff comparisons (>= 150KB)
    effect(() => {
      const primaryRes = this.engine.parsedResult();
      const secondaryRes = this.parsedSecondary();
      const primaryData = primaryRes.data;
      const secondaryData = secondaryRes.data;

      if (primaryData === null || secondaryData === null) {
        if (this.cancelPendingWorkerDiff) {
          this.cancelPendingWorkerDiff();
          this.cancelPendingWorkerDiff = null;
        }
        if (this.workerDiffResult() !== null) {
          this.workerDiffResult.set(null);
        }
        if (this.isDiffing()) {
          this.isDiffing.set(false);
        }
        return;
      }

      const totalSize = this.engine.rawInput().length + this.secondaryInput().length;
      if (totalSize >= DIFF_WORKER_THRESHOLD && this.engine.isWorkerAvailable()) {
        if (this.cancelPendingWorkerDiff) {
          this.cancelPendingWorkerDiff();
        }
        this.isDiffing.set(true);
        this.cancelPendingWorkerDiff = this.engine.computeDiffWorker(
          primaryData,
          secondaryData,
          (res) => {
            this.isDiffing.set(false);
            this.cancelPendingWorkerDiff = null;
            if (res) {
              this.workerDiffResult.set(res);
            }
          },
        );
      } else {
        if (this.cancelPendingWorkerDiff) {
          this.cancelPendingWorkerDiff();
          this.cancelPendingWorkerDiff = null;
        }
        if (this.workerDiffResult() !== null) {
          this.workerDiffResult.set(null);
        }
        if (this.isDiffing()) {
          this.isDiffing.set(false);
        }
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.cancelPendingWorkerDiff) {
        this.cancelPendingWorkerDiff();
        this.cancelPendingWorkerDiff = null;
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

    const workerResult = this.workerDiffResult();
    const totalSize = this.engine.rawInput().length + this.secondaryInput().length;

    if (totalSize >= DIFF_WORKER_THRESHOLD && workerResult) {
      return workerResult.diffItems;
    }

    return deepDiffJson(primaryData, secondaryData);
  });

  readonly meaningfulDiffs = computed<DiffItem[]>(() => {
    return this.diffItems().filter((item) => item.type !== 'unchanged');
  });

  readonly diffSummary = computed<DiffSummary>(() => {
    const workerResult = this.workerDiffResult();
    const totalSize = this.engine.rawInput().length + this.secondaryInput().length;

    if (totalSize >= DIFF_WORKER_THRESHOLD && workerResult) {
      return workerResult.summary;
    }

    return summarizeDiff(this.diffItems());
  });

  setSecondaryInput(val: string): void {
    this.secondaryInput.set(val);
    this.isSampleActive.set(false);
    this.awaitingNewInput.set(false);
  }

  loadSample(): void {
    this.secondaryInput.set(SAMPLE_MODIFIED_JSON);
    this.isSampleActive.set(true);
    this.awaitingNewInput.set(false);
  }

  clearSecondary(): void {
    this.secondaryInput.set('');
    this.isSampleActive.set(false);
    this.lastPrimaryOnClear.set(this.engine.rawInput());
    this.awaitingNewInput.set(true);
  }

  cloneFromPrimary(): void {
    this.secondaryInput.set(this.engine.rawInput());
    this.isSampleActive.set(false);
    this.awaitingNewInput.set(false);
  }

  swapInputs(): void {
    const currentPrimary = this.engine.rawInput();
    const currentSecondary = this.secondaryInput();
    this.engine.setInput(currentSecondary);
    this.secondaryInput.set(currentPrimary);
    this.awaitingNewInput.set(false);
  }
}
