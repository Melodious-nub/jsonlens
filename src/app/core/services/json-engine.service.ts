import { isPlatformBrowser } from '@angular/common';
import {
  ApplicationRef,
  computed,
  DestroyRef,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import {
  IndentOption,
  JsonError,
  JsonStats,
  JsonValue,
  ParseResult,
  SortOrder,
  TreeNode,
} from '../models/json-lens.model';
import {
  buildTreeNode,
  calculateStats,
  extractJsonError,
  flattenJsonObject,
  sortJsonKeys,
  stripNullProperties,
  unflattenJsonObject,
} from '../../shared/utils/json-tree.util';
import { JsonRepairService } from './json-repair.service';
import { StorageService } from './storage.service';
import { UrlShareService } from './url-share.service';
import { WorkerParseRequest, WorkerParseResponse } from '../workers/json.worker';

const LARGE_PAYLOAD_THRESHOLD = 2 * 1024 * 1024; // 2MB

export const DEFAULT_SAMPLE_JSON = `{
  "name": "JsonLens",
  "version": "1.0.0",
  "privacy": "100% Client-Side",
  "features": [
    "Zoneless Angular Reactive Architecture",
    "Real-time Syntax Error Diagnostics",
    "One-Click Smart Error Auto-Repair",
    "Interactive Tree Explorer & JSONPath Copy",
    "Instant Type Generation: TypeScript, Zod, Go",
    "Side-by-side JSON Diff Comparison",
    "Off-thread Web Worker Parser for Large Files"
  ],
  "author": {
    "name": "Shawon Talukder",
    "headline": "Full-Stack Software Engineer · Angular Specialist · Mobile Developer",
    "github": "https://github.com/Melodious-nub",
    "linkedin": "https://www.linkedin.com/in/shawon-taluckder",
    "email": "shawon.taluckder2@gmail.com",
    "organization": "Open Source Community",
    "url": "https://github.com/Melodious-nub/jsonlens"
  },
  "metrics": {
    "activeUsers": 45000,
    "uptime": 0.9999,
    "isProductionReady": true
  }
}`;

@Injectable({
  providedIn: 'root',
})
export class JsonEngineService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly repairService = inject(JsonRepairService);
  private readonly storageService = inject(StorageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly urlShareService = inject(UrlShareService);
  private readonly appRef = inject(ApplicationRef);

  private worker: Worker | null = null;
  private currentWorkerTaskId = 0;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private tickScheduled = false;

  // Primary Signals
  readonly rawInput = signal<string>(DEFAULT_SAMPLE_JSON);
  readonly indentOption = signal<IndentOption>('2-spaces');
  readonly sortOrder = signal<SortOrder>('none');
  readonly isProcessing = signal<boolean>(false);

  // Worker asynchronous override state for large payloads
  private readonly workerResult = signal<ParseResult | null>(null);
  private readonly workerError = signal<JsonError | null>(null);
  private readonly workerStats = signal<JsonStats | null>(null);

  // Computed indentation
  readonly indentValue = computed<number | string>(() => {
    switch (this.indentOption()) {
      case '2-spaces':
        return 2;
      case '4-spaces':
        return 4;
      case 'tabs':
        return '\t';
      case 'minified':
        return 0;
      default:
        return 2;
    }
  });

  // Synchronous or Worker computed parsing
  readonly parsedResult = computed<ParseResult>(() => {
    const input = this.rawInput();
    const indent = this.indentValue();

    // If large payload and worker computed result exists, use it
    if (input.length >= LARGE_PAYLOAD_THRESHOLD && this.workerResult()) {
      return this.workerResult()!;
    }

    if (!input || input.trim() === '') {
      return { success: true, data: null, formatted: '', minified: '' };
    }

    try {
      const data = JSON.parse(input) as JsonValue;
      const formatted =
        this.indentOption() === 'minified'
          ? JSON.stringify(data)
          : JSON.stringify(data, null, indent);
      const minified = JSON.stringify(data);
      return { success: true, data, formatted, minified };
    } catch {
      return { success: false, data: null, formatted: input, minified: input };
    }
  });

  readonly jsonError = computed<JsonError | null>(() => {
    const input = this.rawInput();
    if (!input || input.trim() === '') {
      return null;
    }

    if (input.length >= LARGE_PAYLOAD_THRESHOLD && this.workerError()) {
      return this.workerError();
    }

    try {
      JSON.parse(input);
      return null;
    } catch (err) {
      return extractJsonError(err, input);
    }
  });

  readonly isValid = computed<boolean>(() => this.jsonError() === null);

  readonly jsonStats = computed<JsonStats>(() => {
    const input = this.rawInput();
    const byteSize = this.isBrowser ? new Blob([input]).size : input.length;

    if (input.length >= LARGE_PAYLOAD_THRESHOLD && this.workerStats()) {
      return this.workerStats()!;
    }

    const res = this.parsedResult();
    return calculateStats(res.data, byteSize);
  });

  readonly treeData = computed<TreeNode | null>(() => {
    const res = this.parsedResult();
    if (!res.success || res.data === null) {
      return null;
    }
    return buildTreeNode(res.data);
  });

  constructor() {
    if (this.isBrowser) {
      // 1. Check for shared URL payload first
      const sharedPayload = this.urlShareService.readSharedPayload();
      if (sharedPayload) {
        this.rawInput.set(sharedPayload);
        this.storageService.setItem('jsonlens_input', sharedPayload);
      } else {
        const savedInput = this.storageService.getItem<string>(
          'jsonlens_input',
          DEFAULT_SAMPLE_JSON,
        );
        this.rawInput.set(savedInput);
      }

      // 2. Restore indent preference
      const savedIndent = this.storageService.getItem<IndentOption>(
        'jsonlens_indent',
        '2-spaces',
      );
      this.indentOption.set(savedIndent);

      // 3. Listen for dynamic URL hash changes
      const onHashChange = () => {
        const payload = this.urlShareService.readSharedPayload();
        if (payload) {
          this.setInput(payload);
        }
      };
      window.addEventListener('hashchange', onHashChange);

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('hashchange', onHashChange);
        if (this.saveTimeout) {
          clearTimeout(this.saveTimeout);
        }
      });

      this.initWorker();
    }
  }

  setInput(val: string): void {
    this.rawInput.set(val);
    this.debounceSaveInput(val);

    // If large payload, offload to worker
    if (val.length >= LARGE_PAYLOAD_THRESHOLD) {
      this.dispatchWorkerTask(val);
    } else {
      this.workerResult.set(null);
      this.workerError.set(null);
      this.workerStats.set(null);
    }
    this.scheduleAppTick();
  }

  scheduleAppTick(): void {
    if (!this.isBrowser || this.tickScheduled) return;
    this.tickScheduled = true;
    queueMicrotask(() => {
      this.tickScheduled = false;
      if (!this.appRef.destroyed) {
        try {
          this.appRef.tick();
        } catch {
          // Safeguard
        }
      }
    });
  }

  private debounceSaveInput(val: string): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.storageService.setItem('jsonlens_input', val);
      this.saveTimeout = null;
    }, 400);
  }

  setIndent(option: IndentOption): void {
    this.indentOption.set(option);
    this.storageService.setItem('jsonlens_indent', option);
  }

  format(): void {
    const res = this.parsedResult();
    if (res.success && res.data !== null) {
      const indent = this.indentValue();
      const formatted = JSON.stringify(res.data, null, indent);
      this.setInput(formatted);
    }
  }

  minify(): void {
    const res = this.parsedResult();
    if (res.success && res.data !== null) {
      this.setInput(res.minified);
    }
  }

  autoRepair(): boolean {
    const input = this.rawInput();
    const result = this.repairService.repair(input);
    if (result.success && result.wasModified) {
      this.setInput(result.repaired);
      return true;
    }
    return false;
  }

  sortKeys(order: 'asc' | 'desc'): void {
    const res = this.parsedResult();
    if (res.success && res.data !== null) {
      const sorted = sortJsonKeys(res.data, order);
      const formatted = JSON.stringify(sorted, null, this.indentValue());
      this.setInput(formatted);
      this.sortOrder.set(order);
    }
  }

  flatten(): void {
    const res = this.parsedResult();
    if (res.success && res.data !== null) {
      const flattened = flattenJsonObject(res.data);
      const formatted = JSON.stringify(flattened, null, this.indentValue());
      this.setInput(formatted);
    }
  }

  unflatten(): void {
    const res = this.parsedResult();
    if (res.success && res.data !== null && typeof res.data === 'object') {
      const unflattened = unflattenJsonObject(res.data as Record<string, unknown>);
      const formatted = JSON.stringify(unflattened, null, this.indentValue());
      this.setInput(formatted);
    }
  }

  stripNulls(): void {
    const res = this.parsedResult();
    if (res.success && res.data !== null) {
      const cleaned = stripNullProperties(res.data);
      const formatted = JSON.stringify(cleaned, null, this.indentValue());
      this.setInput(formatted);
    }
  }

  loadSample(): void {
    this.setInput(DEFAULT_SAMPLE_JSON);
  }

  clear(): void {
    this.setInput('');
  }

  private initWorker(): void {
    if (!this.isBrowser || typeof Worker === 'undefined') {
      return;
    }

    try {
      this.worker = new Worker(
        new URL('../workers/json.worker', import.meta.url),
        { type: 'module' },
      );

      this.worker.onmessage = ({ data }: MessageEvent<WorkerParseResponse>) => {
        if (parseInt(data.id, 10) !== this.currentWorkerTaskId) {
          return; // Ignore stale results
        }

        this.isProcessing.set(false);

        if (data.success) {
          this.workerResult.set({
            success: true,
            data: data.data as JsonValue,
            formatted: data.formatted,
            minified: data.minified,
          });
          this.workerStats.set(data.stats as JsonStats);
          this.workerError.set(null);
        } else {
          this.workerError.set(data.error as JsonError);
          this.workerResult.set({
            success: false,
            data: null,
            formatted: this.rawInput(),
            minified: this.rawInput(),
          });
        }
        this.scheduleAppTick();
      };

      this.destroyRef.onDestroy(() => {
        this.worker?.terminate();
        this.worker = null;
      });
    } catch (e) {
      console.warn('Worker initialization not supported in current environment:', e);
    }
  }

  private dispatchWorkerTask(input: string): void {
    if (!this.worker) {
      return;
    }

    this.isProcessing.set(true);
    this.currentWorkerTaskId++;

    const request: WorkerParseRequest = {
      id: String(this.currentWorkerTaskId),
      input,
      indent: this.indentValue(),
    };

    this.worker.postMessage(request);
  }
}
