import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { JsonEngineService } from '../../../../core/services/json-engine.service';
import { ToastService } from '../../../../core/services/toast.service';
import { deepDiffJson, summarizeDiff } from '../../../../shared/utils/json-diff.util';
import { DiffItem, JsonValue } from '../../../../core/models/json-lens.model';
import { MonacoEditorComponent } from '../../../../shared/components/monaco-wrapper/monaco-editor.component';
import { LucideAngularModule, ArrowLeftRight, Sparkles, Trash2, GitCompare, CheckCircle2 } from 'lucide-angular';

const SAMPLE_MODIFIED_JSON = `{
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

@Component({
  selector: 'app-diff-lens',
  standalone: true,
  imports: [MonacoEditorComponent, LucideAngularModule],
  templateUrl: './diff-lens.component.html',
  styleUrl: './diff-lens.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiffLensComponent {
  readonly engine = inject(JsonEngineService);
  private readonly toast = inject(ToastService);

  readonly swapIcon = ArrowLeftRight;
  readonly sampleIcon = Sparkles;
  readonly clearIcon = Trash2;
  readonly compareIcon = GitCompare;
  readonly matchIcon = CheckCircle2;

  // Secondary comparison input (Right pane of diff)
  readonly secondaryInput = signal<string>(SAMPLE_MODIFIED_JSON);

  // Parsed secondary JSON
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

  // Calculate deep diff between primary input and secondary input
  readonly diffItems = computed<DiffItem[]>(() => {
    const primaryData = this.engine.parsedResult().data;
    const secondaryData = this.parsedSecondary().data;

    if (primaryData === null || secondaryData === null) {
      return [];
    }

    return deepDiffJson(primaryData, secondaryData);
  });

  // Filter non-unchanged diff items for the summary list
  readonly meaningfulDiffs = computed<DiffItem[]>(() => {
    return this.diffItems().filter((item) => item.type !== 'unchanged');
  });

  // Summary counts
  readonly diffSummary = computed(() => {
    return summarizeDiff(this.diffItems());
  });

  onSecondaryInput(val: string): void {
    this.secondaryInput.set(val);
  }

  loadSample(): void {
    this.secondaryInput.set(SAMPLE_MODIFIED_JSON);
    this.toast.show('Loaded sample modified JSON', 'info');
  }

  clearSecondary(): void {
    this.secondaryInput.set('');
    this.toast.show('Cleared comparison JSON', 'info');
  }

  swapInputs(): void {
    const currentPrimary = this.engine.rawInput();
    const currentSecondary = this.secondaryInput();

    this.engine.setInput(currentSecondary);
    this.secondaryInput.set(currentPrimary);
    this.toast.show('Swapped Left and Right JSON', 'success');
  }

  formatVal(val: unknown): string {
    if (val === undefined) return 'undefined';
    if (typeof val === 'string') return `"${val}"`;
    if (typeof val === 'object' && val !== null) {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  }
}
