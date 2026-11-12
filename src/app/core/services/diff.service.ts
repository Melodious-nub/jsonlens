import { isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { JsonEngineService, DEFAULT_SAMPLE_JSON } from './json-engine.service';
import { JsonRepairService } from './json-repair.service';
import { StorageService } from './storage.service';
import {
  DiffComparisonMode,
  DiffItem,
  DiffNavigationTarget,
  DiffSummary,
  EditorLineDecoration,
  JsonError,
  JsonValue,
} from '../models/json-lens.model';
import { deepDiffJson, summarizeDiff } from '../../shared/utils/json-diff.util';
import { buildJsonLineMap, resolveLineForDiffPath } from '../../shared/utils/json-line-map.util';
import { extractJsonError } from '../../shared/utils/json-tree.util';

const DIFF_WORKER_THRESHOLD = 150 * 1024; // 150KB
const SECONDARY_PARSE_WORKER_THRESHOLD = 500 * 1024; // 500KB
const SECONDARY_REPAIR_WORKER_THRESHOLD = 250 * 1024; // 250KB
const LINE_MAP_THRESHOLD = 300 * 1024; // 300KB
const MAX_INLINE_DECORATIONS = 500;
const SECONDARY_STORAGE_KEY = 'jsonlens_diff_secondary_input';

export interface SecondaryParseResult {
  readonly data: JsonValue | null;
  readonly isValid: boolean;
  readonly error: JsonError | null;
}

export const SAMPLE_MODIFIED_JSON = DEFAULT_SAMPLE_JSON;

@Injectable({
  providedIn: 'root',
})
export class DiffService {
  private readonly engine = inject(JsonEngineService);
  private readonly repairService = inject(JsonRepairService);
  private readonly storage = inject(StorageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly secondaryInput = signal<string>(SAMPLE_MODIFIED_JSON);
  readonly isSampleActive = signal<boolean>(true);
  readonly awaitingNewInput = signal<boolean>(false);
  readonly isDiffing = signal<boolean>(false);
  readonly isParsingSecondary = signal<boolean>(false);
  readonly diffMode = signal<DiffComparisonMode>('strict');
  private readonly lastPrimaryOnClear = signal<string>('');
  private readonly workerDiffResult = signal<{ diffItems: DiffItem[]; summary: DiffSummary } | null>(null);
  private readonly workerSecondaryResult = signal<SecondaryParseResult | null>(null);
  private cancelPendingWorkerDiff: (() => void) | null = null;
  private cancelPendingWorkerParse: (() => void) | null = null;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (this.isBrowser) {
      const savedSecondary = this.storage.getItem<string | null>(SECONDARY_STORAGE_KEY, null);
      if (savedSecondary !== null) {
        this.secondaryInput.set(savedSecondary);
        this.isSampleActive.set(
          this.isDefaultSample(savedSecondary) && savedSecondary.trim() !== '',
        );
        if (savedSecondary.length >= SECONDARY_PARSE_WORKER_THRESHOLD && this.engine.isWorkerAvailable()) {
          this.dispatchSecondaryWorkerParse(savedSecondary);
        }
      }
    }

    // Reactively synchronize secondary comparison with primary input:
    // 1. Initial sample startup when user enters their own data while sample is active.
    // 2. When diff was cleared and new input is pasted/added into the primary editor.
    effect(() => {
      const primary = this.engine.rawInput();
      const trimmedPrimary = primary.trim();

      // Case 1: Initial startup with sample
      if (this.isSampleActive()) {
        // If primary is empty or is still the default sample (whether formatted or minified), preserve sample diff!
        if (this.isDefaultSample(primary) || trimmedPrimary === '') {
          return;
        }
        // User entered new custom JSON: initialize diff comparison with formatted JSON
        this.updateSecondaryState(this.formatJsonString(primary));
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
        this.updateSecondaryState(this.formatJsonString(primary));
        this.awaitingNewInput.set(false);
      }
    });

    // Worker offloading for large diff comparisons (>= 150KB)
    effect(() => {
      const primaryRes = this.engine.parsedResult();
      const secondaryRes = this.parsedSecondary();
      const mode = this.diffMode();
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
          mode,
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
      if (this.cancelPendingWorkerParse) {
        this.cancelPendingWorkerParse();
        this.cancelPendingWorkerParse = null;
      }
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }
    });
  }

  readonly parsedSecondary = computed<SecondaryParseResult>(() => {
    const raw = this.secondaryInput();
    if (!raw.trim()) {
      return { data: null, isValid: true, error: null };
    }

    if (raw.length >= SECONDARY_PARSE_WORKER_THRESHOLD && this.engine.isWorkerAvailable()) {
      const workerRes = this.workerSecondaryResult();
      if (workerRes) {
        return workerRes;
      }
      return { data: null, isValid: true, error: null };
    }

    try {
      const data = JSON.parse(raw) as JsonValue;
      return { data, isValid: true, error: null };
    } catch (err) {
      return { data: null, isValid: false, error: extractJsonError(err, raw) };
    }
  });

  readonly secondaryError = computed<JsonError | null>(() => this.parsedSecondary().error);

  readonly diffItems = computed<DiffItem[]>(() => {
    const primaryData = this.engine.parsedResult().data;
    const secondaryData = this.parsedSecondary().data;
    const mode = this.diffMode();

    if (primaryData === null || secondaryData === null) {
      return [];
    }

    const workerResult = this.workerDiffResult();
    const totalSize = this.engine.rawInput().length + this.secondaryInput().length;

    if (totalSize >= DIFF_WORKER_THRESHOLD && workerResult) {
      return workerResult.diffItems;
    }

    return deepDiffJson(primaryData, secondaryData, '$', mode);
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

  readonly leftLineMap = computed<ReadonlyMap<string, number>>(() => {
    const raw = this.engine.rawInput();
    if (!this.engine.isValid() || raw.length >= LINE_MAP_THRESHOLD) {
      return new Map();
    }
    return buildJsonLineMap(raw);
  });

  readonly rightLineMap = computed<ReadonlyMap<string, number>>(() => {
    const raw = this.secondaryInput();
    if (!this.parsedSecondary().isValid || raw.length >= LINE_MAP_THRESHOLD) {
      return new Map();
    }
    return buildJsonLineMap(raw);
  });

  readonly leftDecorations = computed<EditorLineDecoration[]>(() => {
    return this.buildSideDecorations(this.meaningfulDiffs(), this.leftLineMap(), 'left');
  });

  readonly rightDecorations = computed<EditorLineDecoration[]>(() => {
    return this.buildSideDecorations(this.meaningfulDiffs(), this.rightLineMap(), 'right');
  });

  toggleDiffMode(): void {
    this.diffMode.update((m) => (m === 'strict' ? 'smart-array' : 'strict'));
  }

  resolveLinesForDiff(item: DiffItem): DiffNavigationTarget {
    const leftMap = this.leftLineMap().size > 0
      ? this.leftLineMap()
      : (this.engine.isValid() ? buildJsonLineMap(this.engine.rawInput()) : new Map<string, number>());
    const rightMap = this.rightLineMap().size > 0
      ? this.rightLineMap()
      : (this.parsedSecondary().isValid ? buildJsonLineMap(this.secondaryInput()) : new Map<string, number>());

    return {
      leftLine: item.type === 'added'
        ? resolveLineForDiffPath(leftMap, item.path)
        : (leftMap.get(item.path) ?? resolveLineForDiffPath(leftMap, item.path)),
      rightLine: item.type === 'removed'
        ? resolveLineForDiffPath(rightMap, item.path)
        : (rightMap.get(item.path) ?? resolveLineForDiffPath(rightMap, item.path)),
    };
  }

  private buildSideDecorations(
    diffs: readonly DiffItem[],
    lineMap: ReadonlyMap<string, number>,
    side: 'left' | 'right',
  ): EditorLineDecoration[] {
    if (diffs.length === 0 || lineMap.size === 0) {
      return [];
    }

    const relevantType = side === 'left' ? 'removed' : 'added';
    const byLine = new Map<number, EditorLineDecoration['type']>();

    for (const item of diffs) {
      if (item.type !== 'modified' && item.type !== relevantType) {
        continue;
      }
      const line = lineMap.get(item.path);
      if (line === undefined) continue;

      const existing = byLine.get(line);
      if (!existing || item.type === 'modified') {
        byLine.set(line, item.type);
      }
      if (byLine.size >= MAX_INLINE_DECORATIONS) {
        break;
      }
    }

    return Array.from(byLine.entries()).map(([line, type]) => ({ line, type }));
  }

  formatJsonString(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return raw;
    try {
      const parsed = JSON.parse(trimmed);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  }

  isDefaultSample(content: string): boolean {
    const trimmed = content.trim();
    if (trimmed === '' || trimmed === DEFAULT_SAMPLE_JSON) {
      return true;
    }
    try {
      const parsed = JSON.parse(trimmed) as { name?: string; version?: string; features?: unknown[] };
      return Boolean(
        parsed &&
        parsed.name === 'JsonLens' &&
        (parsed.version === '1.0.0' ||
          parsed.version === '1.1.0' ||
          parsed.version === '1.2.0' ||
          parsed.version === '2.0.0') &&
        Array.isArray(parsed.features)
      );
    } catch {
      return false;
    }
  }

  formatSecondary(): boolean {
    const raw = this.secondaryInput();
    if (!raw.trim()) return false;

    const existing = this.parsedSecondary();
    if (existing.isValid && existing.data !== null) {
      this.updateSecondaryState(JSON.stringify(existing.data, null, 2));
      return true;
    }

    try {
      const parsed = JSON.parse(raw);
      this.updateSecondaryState(JSON.stringify(parsed, null, 2));
      return true;
    } catch {
      return false;
    }
  }

  autoRepairSecondary(): boolean {
    const input = this.secondaryInput();
    const result = this.repairService.repair(input);
    if (result.success && result.wasModified) {
      this.setSecondaryInput(this.formatJsonString(result.repaired));
      return true;
    }
    return false;
  }

  async autoRepairSecondaryAsync(): Promise<boolean> {
    const input = this.secondaryInput();
    if (!this.engine.isWorkerAvailable() || input.length < SECONDARY_REPAIR_WORKER_THRESHOLD) {
      return this.autoRepairSecondary();
    }

    const result = await this.engine.repairWithWorker(input);
    if (result.success && result.wasModified) {
      this.setSecondaryInput(this.formatJsonString(result.repaired));
      return true;
    }
    return false;
  }

  setSecondaryInput(val: string, autoFormat = false): void {
    const finalVal = autoFormat ? this.formatJsonString(val) : val;
    this.updateSecondaryState(finalVal);
    this.isSampleActive.set(false);
    this.awaitingNewInput.set(false);
  }

  loadSample(): void {
    this.updateSecondaryState(SAMPLE_MODIFIED_JSON);
    this.isSampleActive.set(true);
    this.awaitingNewInput.set(false);
  }

  clearSecondary(): void {
    this.updateSecondaryState('');
    this.isSampleActive.set(false);
    this.lastPrimaryOnClear.set(this.engine.rawInput());
    this.awaitingNewInput.set(true);
  }

  /**
   * Master Clear: completely wipes comparison state and starts 100% fresh
   */
  clearMaster(): void {
    this.updateSecondaryState('');
    this.isSampleActive.set(false);
    this.lastPrimaryOnClear.set('');
    this.awaitingNewInput.set(false);
    if (this.cancelPendingWorkerDiff) {
      this.cancelPendingWorkerDiff();
      this.cancelPendingWorkerDiff = null;
    }
    this.workerDiffResult.set(null);
  }

  cloneFromPrimary(): void {
    this.updateSecondaryState(this.formatJsonString(this.engine.rawInput()));
    this.isSampleActive.set(false);
    this.awaitingNewInput.set(false);
  }

  swapInputs(): void {
    const currentPrimary = this.engine.rawInput();
    const currentSecondary = this.secondaryInput();
    this.isSampleActive.set(false);
    this.awaitingNewInput.set(false);
    this.engine.setInput(currentSecondary);
    this.updateSecondaryState(this.formatJsonString(currentPrimary));
  }

  private updateSecondaryState(val: string): void {
    this.secondaryInput.set(val);
    this.debounceSaveSecondary(val);

    if (this.cancelPendingWorkerParse) {
      this.cancelPendingWorkerParse();
      this.cancelPendingWorkerParse = null;
    }

    if (val.length >= SECONDARY_PARSE_WORKER_THRESHOLD && this.engine.isWorkerAvailable()) {
      this.dispatchSecondaryWorkerParse(val);
    } else {
      this.isParsingSecondary.set(false);
      this.workerSecondaryResult.set(null);
    }
  }

  private dispatchSecondaryWorkerParse(val: string): void {
    this.isParsingSecondary.set(true);
    this.cancelPendingWorkerParse = this.engine.parseJsonWorker(val, 2, (res) => {
      this.isParsingSecondary.set(false);
      this.cancelPendingWorkerParse = null;
      if (res) {
        this.workerSecondaryResult.set(res);
      }
    });
  }

  private debounceSaveSecondary(val: string): void {
    if (!this.isBrowser) return;
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.storage.setItem(SECONDARY_STORAGE_KEY, val);
      this.saveTimeout = null;
    }, 400);
  }
}
